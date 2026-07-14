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
  const base = seedEntitlements[0];

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
