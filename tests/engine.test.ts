import { describe, it, expect } from "vitest";
import { computePayment, assertBalanced, checkEligibility, routeForBuyer, composePlan, isBuyerVisible } from "../lib/engine";
import { paymentConfig, partners } from "../lib/mock";
import { requestDownload, checkManufacturingRights, seedAssetVersions } from "../lib/entitlements";
import { seedEntitlements } from "../lib/mock";
import { CartItem, PaymentConfig } from "../lib/types";

const item = (type: CartItem["productType"], price: number, qty = 1, key = `${type}${price}${qty}`): CartItem => ({
  key,
  productId: "p",
  productTitle: "t",
  productType: type,
  fulfillmentType: type === "digital" ? "download" : "shipping",
  sellerName: "s",
  unitPrice: price,
  qty,
});

const cfg = (o: Partial<PaymentConfig> = {}): PaymentConfig => ({ ...paymentConfig, ...o });

describe("payments — the books must close", () => {
  const scenarios: [string, CartItem[]][] = [
    ["single $2 asset", [item("digital", 2)]],
    ["single $5 asset", [item("digital", 5)]],
    ["two $5 assets", [item("digital", 5, 1, "a"), item("digital", 5, 1, "b")]],
    ["mixed digital + physical", [item("digital", 12), item("physical", 19.99)]],
  ];

  for (const alloc of ["platform_absorbs", "seller_pays", "buyer_pays", "shared"] as const) {
    for (const [name, items] of scenarios) {
      it(`${name} / ${alloc} balances`, () => {
        const b = computePayment(items, cfg({ feeAllocation: alloc }), { shippingCharged: 0, shippingCost: 0 });
        expect(assertBalanced(b).balanced).toBe(true);
      });
    }
  }

  it("attributes the Stripe fee to exactly one party", () => {
    for (const alloc of ["platform_absorbs", "seller_pays", "buyer_pays", "shared"] as const) {
      const b = computePayment([item("digital", 5)], cfg({ feeAllocation: alloc }));
      const parts = b.stripeFeePaidByBuyer + b.stripeFeePaidBySeller + b.stripeFeePaidByPlatform;
      expect(Math.abs(parts - b.stripeFee)).toBeLessThan(0.02);
    }
  });

  it("a lone $2 asset destroys platform margin when the small-order fee is off", () => {
    const b = computePayment([item("digital", 2)], cfg({ smallOrderFee: 0, feeAllocation: "platform_absorbs" }));
    expect(b.platformLoses).toBe(true);
  });

  it("bundling amortises the fixed fee", () => {
    const one = computePayment([item("digital", 5)], cfg());
    const two = computePayment([item("digital", 5, 1, "a"), item("digital", 5, 1, "b")], cfg());
    expect(two.stripeFeePctOfGoods).toBeLessThan(one.stripeFeePctOfGoods);
  });

  it("services are excluded from the small-order fee", () => {
    const b = computePayment([item("service", 99)], cfg());
    expect(b.smallOrderFee).toBe(0);
    expect(b.serviceSubtotal).toBe(99);
    expect(b.goodsSubtotal).toBe(0);
  });

  it("buyer_pays surcharge is solved, not approximated", () => {
    const b = computePayment([item("digital", 20)], cfg({ feeAllocation: "buyer_pays" }));
    const recomputed = b.buyerTotal * paymentConfig.stripePercent + paymentConfig.stripeFixedFee;
    expect(Math.abs(recomputed - b.stripeFee)).toBeLessThan(0.02);
  });
});

describe("partner eligibility — a hard gate", () => {
  const req = {
    destinationCountry: "US",
    requestedServices: ["pcb_manufacturer", "pcb_assembly", "component_sourcing", "design_review"] as const,
    quantity: 100,
  };

  it("never surfaces a partner that cannot do every requested service", () => {
    const { ranked } = routeForBuyer(partners, { ...req, requestedServices: [...req.requestedServices] });
    for (const r of ranked) {
      for (const s of req.requestedServices) expect(r.partner.partnerTypes).toContain(s);
    }
  });

  it("never surfaces a draft or operationally-unready partner to a buyer", () => {
    const { ranked } = routeForBuyer(partners, { destinationCountry: "US", requestedServices: ["pcb_manufacturer"], quantity: 10 });
    for (const r of ranked) expect(isBuyerVisible(r.partner)).toBe(true);
  });

  it("excludes on layer count regardless of rating", () => {
    const eu = partners.find((p) => p.id === "pt_eu_pcb")!;
    const res = checkEligibility(eu, { destinationCountry: "DE", requestedServices: ["pcb_manufacturer"], quantity: 10, layers: 12 });
    expect(res.failures).toContain("layers_exceeded");
  });

  it("composes a multi-partner chain when no single partner covers the job", () => {
    const plan = composePlan(partners, { ...req, requestedServices: [...req.requestedServices] });
    expect(plan.legs.length).toBeGreaterThan(1);
    expect(plan.complete).toBe(true);
  });

  it("ranking contains no strategic-partner term", () => {
    const { ranked } = routeForBuyer(partners, { destinationCountry: "US", requestedServices: ["pcb_manufacturer"], quantity: 100 });
    for (const r of ranked) expect(r.reasons.join(" ")).not.toContain("Strategic");
  });
});

describe("entitlements — the gate actually refuses", () => {
  // By id, not by seed order — new seeds must never break the gate tests.
  const base = seedEntitlements.find((e) => e.id === "ent_3001")!;

  it("refuses at the download limit instead of saturating a counter", () => {
    const maxed = { ...base, downloadCount: base.downloadLimit };
    const g = requestDownload(maxed, base.purchasedVersionId);
    expect(g.ok).toBe(false);
    expect(g.reason).toBe("download_limit_reached");
  });

  it("refuses after a refund", () => {
    const g = requestDownload({ ...base, status: "refunded" }, base.purchasedVersionId);
    expect(g.ok).toBe(false);
    expect(g.reason).toBe("entitlement_refunded");
  });

  it("refuses a version the update policy does not cover", () => {
    const locked = { ...base, updatePolicy: "current_version_only" as const };
    const other = seedAssetVersions.find((v) => v.id !== base.purchasedVersionId && v.productId === base.productId);
    if (other) {
      const g = requestDownload(locked, other.id);
      expect(g.ok).toBe(false);
    }
  });

  it("blocks commercial manufacturing beyond the licensed unit cap", () => {
    const e = { ...base, rights: { personalUnits: 5, commercialUnits: 100, partnerManufacturingAllowed: true, sourceFilesIncluded: false }, commercialUnitsUsed: 0 };
    expect(checkManufacturingRights(e, 200, true).allowed).toBe(false);
    expect(checkManufacturingRights(e, 100, true).allowed).toBe(true);
  });

  it("blocks any commercial build on a personal licence", () => {
    const e = { ...base, rights: { personalUnits: 5, commercialUnits: 0, partnerManufacturingAllowed: true, sourceFilesIncluded: false }, commercialUnitsUsed: 0 };
    expect(checkManufacturingRights(e, 1, true).allowed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Batch label buying — quoteMethodsForOrder
// ---------------------------------------------------------------------------
import { quoteMethodsForOrder, METHOD_TO_CARRIER } from "../lib/shipping";

describe("batch label quotes", () => {
  it("returns methods cheapest-first, priced at the ORDER's weight (not a profile default)", () => {
    const light = quoteMethodsForOrder("DE", 42);
    const heavy = quoteMethodsForOrder("DE", 620);
    expect(light.length).toBeGreaterThan(0);
    // cheapest-first ordering
    for (let i = 1; i < light.length; i++) expect(light[i].cost).toBeGreaterThanOrEqual(light[i - 1].cost);
    // same method costs more for the heavier order — weight is per-order, not shared
    const m = light[0].method.id;
    const heavySame = heavy.find((x) => x.method.id === m)!;
    expect(heavySame.cost).toBeGreaterThan(light[0].cost);
  });

  it("maps every zone method id to a carrier for tracking-number generation", () => {
    for (const dest of ["US", "DE", "JP"]) {
      for (const q of quoteMethodsForOrder(dest, 100)) {
        expect(METHOD_TO_CARRIER[q.method.id]).toBeTruthy();
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Project rewards — eligibility gating & budget cap
// ---------------------------------------------------------------------------
import { checkRewardEligibility, applyGrantToProgram, RewardProgram, RewardGrant } from "../lib/rewards";

const program: RewardProgram = {
  id: "rp_t", productId: "dp_x", productTitle: "X", sellerName: "S",
  type: "credit", creditUsd: 5, budgetUsd: 20, spentUsd: 15, status: "active", blurb: "",
};
const goodProject = {
  summary: "A real write-up",
  sections: [
    { heading: "a", body: "x".repeat(100) },
    { heading: "b", body: "y".repeat(100) },
  ],
  logsCount: 0,
};

describe("project rewards", () => {
  it("requires a verified purchase — no purchase, no reward", () => {
    expect(checkRewardEligibility({ program, project: goodProject, buyerHasPurchase: false, alreadyGrantedForProduct: false }).fail)
      .toBe("no_verified_purchase");
  });

  it("enforces the quality bar and one-grant-per-product", () => {
    const thin = { summary: "ok", sections: [{ heading: "a", body: "short" }], logsCount: 0 };
    expect(checkRewardEligibility({ program, project: thin, buyerHasPurchase: true, alreadyGrantedForProduct: false }).fail)
      .toBe("below_quality_bar");
    expect(checkRewardEligibility({ program, project: goodProject, buyerHasPurchase: true, alreadyGrantedForProduct: true }).fail)
      .toBe("already_rewarded_for_product");
    expect(checkRewardEligibility({ program, project: goodProject, buyerHasPurchase: true, alreadyGrantedForProduct: false }).ok)
      .toBe(true);
  });

  it("budget cap auto-exhausts the program — never an unbounded liability", () => {
    const grant: RewardGrant = { id: "g", programId: "rp_t", projectId: "p", buyerName: "b", type: "credit", valueUsd: 5, status: "approved", createdAt: "2026-07-16" };
    const after = applyGrantToProgram(program, grant);
    expect(after.spentUsd).toBe(20);
    expect(after.status).toBe("exhausted");
    expect(checkRewardEligibility({ program: after, project: goodProject, buyerHasPurchase: true, alreadyGrantedForProduct: false }).ok)
      .toBe(false);
  });
});
