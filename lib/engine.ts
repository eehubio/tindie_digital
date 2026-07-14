import {
  ServicePartner,
  PartnerType,
  CartItem,
  PaymentConfig,
  ProcessingFeeAllocation,
} from "./types";

// ============================================================================
// PART 1 — PAYMENTS
//
// The previous model computed a Stripe fee and then never deducted it from
// anybody. The UI looked itemised while the books did not close: goods went to
// the seller, commission went to the platform, and the processor's cut came
// from nowhere. Below, every dollar the buyer pays is accounted to exactly one
// party, and assertBalanced() proves it.
// ============================================================================

export interface PaymentBreakdown {
  // --- what the buyer sees
  goodsSubtotal: number; // digital + physical goods
  serviceSubtotal: number; // quoted work — NOT an instant download
  smallOrderFee: number;
  shipping: number;
  tax: number;
  buyerTotal: number;

  // --- processing
  stripeFee: number;
  stripeFeePaidByBuyer: number;
  stripeFeePaidBySeller: number;
  stripeFeePaidByPlatform: number;
  feeAllocation: ProcessingFeeAllocation;

  // --- seller
  platformCommission: number;
  sellerGross: number;
  sellerNet: number;

  // --- platform
  platformGrossRevenue: number; // commission + small-order fee
  platformNetRevenue: number; // after the share of Stripe it absorbs

  // --- diagnostics
  itemCount: number;
  stripeFeePctOfGoods: number;
  sellerTakePct: number;
  platformLoses: boolean;
}

/**
 * Services are quoted, human-delivered work — often deposits or staged
 * payments. They must not inherit instant-download refund logic, and they must
 * not be dragged into the small-order threshold: a $99 design review is not a
 * "small order" in need of subsidy.
 */
function split(items: CartItem[]) {
  const sum = (xs: CartItem[]) => xs.reduce((s, i) => s + i.unitPrice * i.qty, 0);
  return {
    digital: sum(items.filter((i) => i.productType === "digital")),
    physical: sum(items.filter((i) => i.productType === "physical")),
    services: sum(items.filter((i) => i.productType === "service")),
    count: items.reduce((s, i) => s + i.qty, 0),
  };
}

export function computePayment(
  items: CartItem[],
  cfg: PaymentConfig,
  extra: { shippingCharged?: number; shippingCost?: number } = {}
): PaymentBreakdown {
  const { digital, physical, services, count } = split(items);
  const goodsSubtotal = r2(digital + physical);
  const serviceSubtotal = r2(services);
  const shipping = r2(extra.shippingCharged ?? 0);

  // Digital-goods lever only. A physical order already carries shipping
  // revenue; a service is priced high enough to carry its own processing cost.
  const smallOrderFee =
    digital > 0 && digital < cfg.digitalMinimumWithoutFee && physical === 0 ? cfg.smallOrderFee : 0;

  const tax = r2((goodsSubtotal + shipping) * cfg.taxRate);
  const beforeSurcharge = goodsSubtotal + serviceSubtotal + shipping + smallOrderFee + tax;

  // "buyer_pays" is circular: surcharging raises the amount charged, which
  // raises the fee. Solve it rather than approximate it.
  //   T = B + f, f = T·p + k  →  T = (B + k) / (1 − p)
  let buyerTotal: number;
  let stripeFee: number;
  if (beforeSurcharge <= 0) {
    buyerTotal = 0;
    stripeFee = 0;
  } else if (cfg.feeAllocation === "buyer_pays") {
    buyerTotal = r2((beforeSurcharge + cfg.stripeFixedFee) / (1 - cfg.stripePercent));
    stripeFee = r2(buyerTotal - beforeSurcharge);
  } else {
    buyerTotal = r2(beforeSurcharge);
    stripeFee = r2(buyerTotal * cfg.stripePercent + cfg.stripeFixedFee);
  }

  let byBuyer = 0;
  let bySeller = 0;
  let byPlatform = 0;
  switch (cfg.feeAllocation) {
    case "buyer_pays":
      byBuyer = stripeFee;
      break;
    case "seller_pays":
      bySeller = stripeFee;
      break;
    case "platform_absorbs":
      byPlatform = stripeFee;
      break;
    case "shared":
      bySeller = r2(stripeFee / 2);
      byPlatform = r2(stripeFee - bySeller);
      break;
  }

  // Commission never touches shipping or tax. Services carry their own rate.
  const platformCommission = r2(
    digital * cfg.platformFeePercent +
      physical * cfg.platformFeePercentPhysical +
      services * cfg.servicePlatformFeePercent
  );

  const shippingCost = r2(extra.shippingCost ?? 0);
  const sellerGross = r2(goodsSubtotal + serviceSubtotal + shipping);
  const sellerNet = r2(sellerGross - platformCommission - bySeller - shippingCost);

  const platformGrossRevenue = r2(platformCommission + smallOrderFee);
  const platformNetRevenue = r2(platformGrossRevenue - byPlatform);

  const merch = goodsSubtotal + serviceSubtotal;
  return {
    goodsSubtotal,
    serviceSubtotal,
    smallOrderFee: r2(smallOrderFee),
    shipping,
    tax,
    buyerTotal,
    stripeFee,
    stripeFeePaidByBuyer: byBuyer,
    stripeFeePaidBySeller: bySeller,
    stripeFeePaidByPlatform: byPlatform,
    feeAllocation: cfg.feeAllocation,
    platformCommission,
    sellerGross,
    sellerNet,
    platformGrossRevenue,
    platformNetRevenue,
    itemCount: count,
    stripeFeePctOfGoods: merch > 0 ? r2((stripeFee / merch) * 100) : 0,
    sellerTakePct: sellerGross > 0 ? r2((sellerNet / sellerGross) * 100) : 0,
    platformLoses: platformNetRevenue < 0,
  };
}

/**
 * The books must close. Every dollar the buyer paid went somewhere:
 *   buyerTotal = sellerNet + platformNetRevenue + stripeFee + tax + shippingCost
 * Tax is remitted, not earned. The label cost leaves as a carrier purchase.
 */
export function assertBalanced(b: PaymentBreakdown, shippingCost = 0) {
  const out = b.sellerNet + b.platformNetRevenue + b.stripeFee + b.tax + shippingCost;
  const delta = Math.round((b.buyerTotal - out) * 100) / 100;
  return { balanced: Math.abs(delta) < 0.02, delta };
}

// ============================================================================
// PART 2 — PARTNER ROUTING
//
// Two stages, in this order, never merged:
//   1. ELIGIBILITY — a hard gate. Fail one check and the partner does not
//      appear. No score rescues it.
//   2. RANKING — among the eligible only, and on merit only.
//
// The old engine scored everyone and surfaced anyone covering >=1 service, so a
// PCB-only shop appeared for a PCB+SMT+sourcing+review request and looked like
// it could take the whole job. It also gave 5% of the score for being a
// "Strategic Tindie partner" — dressing a commercial relationship up as a
// technical match. Both are gone.
// ============================================================================

export interface RoutingInput {
  destinationCountry: string;
  requestedServices: PartnerType[];
  quantity: number;
  layers?: number;
  material?: string;
  minTraceMm?: number;
  packages?: string[];
  currency?: string;
  targetLeadDays?: number;
  /** Admin preview only. Buyers NEVER see draft partners. */
  includeDraftPartners?: boolean;
}

export type EligibilityFailure =
  | "not_active"
  | "contract_unsigned"
  | "nda_unsigned"
  | "dpa_unsigned"
  | "payout_not_ready"
  | "api_down"
  | "not_accepting_orders"
  | "at_capacity"
  | "country_not_served"
  | "service_not_offered"
  | "quantity_out_of_range"
  | "layers_exceeded"
  | "material_unsupported"
  | "trace_too_fine"
  | "package_unsupported"
  | "currency_unsupported"
  | "lead_time_too_slow"
  | "capability_data_stale";

export const FAILURE_LABEL: Record<EligibilityFailure, string> = {
  not_active: "Not an active partner",
  contract_unsigned: "Commercial contract not signed",
  nda_unsigned: "Confidentiality agreement not signed",
  dpa_unsigned: "Data processing agreement not signed",
  payout_not_ready: "Payout account not set up",
  api_down: "Integration is down",
  not_accepting_orders: "Not accepting new orders",
  at_capacity: "At full capacity",
  country_not_served: "Does not serve the destination country",
  service_not_offered: "Does not offer every requested service",
  quantity_out_of_range: "Quantity outside accepted range",
  layers_exceeded: "Cannot fabricate this layer count",
  material_unsupported: "Does not support this material",
  trace_too_fine: "Cannot hold this trace/space",
  package_unsupported: "Cannot place these component packages",
  currency_unsupported: "Cannot settle in this currency",
  lead_time_too_slow: "Cannot meet the target lead time",
  capability_data_stale: "Capability data not verified recently",
};

export interface EligibilityResult {
  partner: ServicePartner;
  eligible: boolean;
  failures: EligibilityFailure[];
  coveredServices: PartnerType[];
  missingServices: PartnerType[];
}

const STALE_DAYS = 180;

/** Operational readiness. "Active" in a database is not "safe to send a paying buyer to". */
export function isBuyerVisible(p: ServicePartner): boolean {
  return (
    p.status === "active" &&
    p.contractStatus === "signed" &&
    p.ndaStatus === "signed" &&
    p.dataProcessingAgreement === "signed" &&
    p.payoutReady &&
    p.apiHealth !== "down" &&
    p.acceptingNewOrders &&
    p.capacityStatus !== "full"
  );
}

export function checkEligibility(p: ServicePartner, req: RoutingInput, today = new Date()): EligibilityResult {
  const f: EligibilityFailure[] = [];

  if (p.status !== "active") f.push("not_active");
  if (p.contractStatus !== "signed") f.push("contract_unsigned");
  if (p.ndaStatus !== "signed") f.push("nda_unsigned");
  if (p.dataProcessingAgreement !== "signed") f.push("dpa_unsigned");
  if (!p.payoutReady) f.push("payout_not_ready");
  if (p.apiHealth === "down") f.push("api_down");
  if (!p.acceptingNewOrders) f.push("not_accepting_orders");
  if (p.capacityStatus === "full") f.push("at_capacity");

  const ageDays = (today.getTime() - new Date(p.lastCapabilityVerifiedAt).getTime()) / 86_400_000;
  if (ageDays > STALE_DAYS) f.push("capability_data_stale");

  const covered = req.requestedServices.filter((s) => p.partnerTypes.includes(s));
  const missing = req.requestedServices.filter((s) => !p.partnerTypes.includes(s));
  if (missing.length > 0) f.push("service_not_offered");

  const servesDest = p.serviceCountries.includes("GLOBAL") || p.serviceCountries.includes(req.destinationCountry);
  if (!servesDest) f.push("country_not_served");

  if (req.quantity < p.minQty || req.quantity > p.maxQty) f.push("quantity_out_of_range");
  if (req.layers != null && req.layers > p.maxLayers) f.push("layers_exceeded");
  if (req.material && !p.materials.includes(req.material)) f.push("material_unsupported");
  if (req.minTraceMm != null && req.minTraceMm < p.minTraceMm) f.push("trace_too_fine");
  if (req.packages?.some((pk) => !p.packages.includes(pk))) f.push("package_unsupported");
  if (req.currency && !p.currencies.includes(req.currency)) f.push("currency_unsupported");
  if (req.targetLeadDays != null && p.minLeadDays > req.targetLeadDays) f.push("lead_time_too_slow");

  return { partner: p, eligible: f.length === 0, failures: f, coveredServices: covered, missingServices: missing };
}

export interface ScoredPartner {
  partner: ServicePartner;
  score: number;
  reasons: string[];
  /** Paid placement. Labelled, never scored. */
  sponsored: boolean;
}

/**
 * Merit only. There is deliberately no "strategic" term: a routing score that
 * quietly favours the partner who pays us is not a routing score, it is an
 * advertisement wearing one. Commercial relationships buy a LABELLED featured
 * slot instead — visible to the buyer as sponsorship, which is honest.
 */
export const WEIGHTS = {
  price: 0.3,
  leadTime: 0.25,
  quality: 0.2,
  rating: 0.15,
  dispute: 0.1,
};

export function rankPartners(eligible: EligibilityResult[]): ScoredPartner[] {
  return eligible
    .map(({ partner: p }) => {
      const reasons: string[] = ["Covers every requested service"];

      const price = p.fromPricePcb ?? 30;
      const priceScore = clamp(1 - (price - 8) / 30);

      const leadMid = (p.minLeadDays + p.maxLeadDays) / 2;
      const leadTimeScore = clamp(1 - (leadMid - 2) / 14);
      if (leadMid <= 7) reasons.push(`Lead time ${p.minLeadDays}–${p.maxLeadDays} days`);
      if (p.onTimeRate >= 0.95) reasons.push(`${(p.onTimeRate * 100).toFixed(0)}% on-time delivery`);
      if (p.disputeRate <= 0.02) reasons.push(`Dispute rate ${(p.disputeRate * 100).toFixed(1)}%`);
      if (p.capacityStatus === "constrained") reasons.push("Capacity constrained — quotes may be slower");

      const score =
        priceScore * WEIGHTS.price +
        leadTimeScore * WEIGHTS.leadTime +
        p.onTimeRate * WEIGHTS.quality +
        (p.rating / 5) * WEIGHTS.rating +
        (1 - p.disputeRate) * WEIGHTS.dispute;

      return { partner: p, score: r2(score), reasons, sponsored: p.featured };
    })
    .sort((a, b) => b.score - a.score);
}

// ---- Service plans: the network is a supply CHAIN, not a dropdown -----------
export interface ServiceLeg {
  sequence: number;
  serviceTypes: PartnerType[];
  partner: ServicePartner;
  inputFileScope: "fabrication_outputs" | "full_sources" | "documents_only";
  outputDeliverables: string[];
}

export interface ServicePlan {
  id: string;
  legs: ServiceLeg[];
  complete: boolean;
  uncoveredServices: PartnerType[];
}

const SCOPE_FOR: Partial<Record<PartnerType, ServiceLeg["inputFileScope"]>> = {
  design_review: "full_sources",
  design_service: "full_sources",
  pcb_manufacturer: "fabrication_outputs",
  pcb_assembly: "fabrication_outputs",
  mechanical_manufacturing: "fabrication_outputs",
  component_sourcing: "documents_only",
  testing_service: "documents_only",
  certification_service: "documents_only",
  warehousing: "documents_only",
  fulfillment: "documents_only",
  local_support: "documents_only",
};

const DELIVERABLES: Partial<Record<PartnerType, string[]>> = {
  design_review: ["Review report", "Annotated schematic", "Fix list"],
  design_service: ["Revised design files"],
  pcb_manufacturer: ["Bare boards", "Fabrication report"],
  pcb_assembly: ["Assembled boards", "AOI report"],
  component_sourcing: ["Kitted BOM", "Sourcing report"],
  testing_service: ["Test report", "Pass/fail log"],
  certification_service: ["Certificate"],
  warehousing: ["Inventory receipt"],
  fulfillment: ["Tracking numbers"],
};

const ORDER: PartnerType[] = [
  "design_review",
  "design_service",
  "component_sourcing",
  "pcb_manufacturer",
  "pcb_assembly",
  "mechanical_manufacturing",
  "testing_service",
  "certification_service",
  "warehousing",
  "fulfillment",
  "local_support",
];

/**
 * When no single partner can take the whole job, build a chain: KiCad Services
 * reviews the design, Huaqiu fabricates and assembles, a US partner tests and
 * ships. THAT is a global partner network. Picking one factory from a list is
 * just a dropdown.
 */
export function composePlan(partners: ServicePartner[], req: RoutingInput): ServicePlan {
  const pool = partners.filter((p) => (req.includeDraftPartners ? true : isBuyerVisible(p)));
  const remaining = new Set<PartnerType>(req.requestedServices);
  const legs: ServiceLeg[] = [];

  let guard = 0;
  while (remaining.size > 0 && guard++ < 10) {
    let best: { p: ServicePartner; covers: PartnerType[] } | null = null;

    for (const p of pool) {
      const covers = Array.from(remaining).filter((s) => p.partnerTypes.includes(s));
      if (covers.length === 0) continue;
      // The partner must be eligible for the SLICE it would actually take.
      const slice = checkEligibility(p, { ...req, requestedServices: covers });
      if (!slice.eligible) continue;
      if (!best || covers.length > best.covers.length) best = { p, covers };
    }
    if (!best) break;

    legs.push({
      sequence: 0,
      serviceTypes: best.covers,
      partner: best.p,
      inputFileScope: broadestScope(best.covers),
      outputDeliverables: best.covers.flatMap((s) => DELIVERABLES[s] ?? []),
    });
    best.covers.forEach((s) => remaining.delete(s));
  }

  legs.sort((a, b) => ORDER.indexOf(a.serviceTypes[0]) - ORDER.indexOf(b.serviceTypes[0]));
  legs.forEach((l, i) => (l.sequence = i + 1));

  return {
    id: "plan_" + Math.random().toString(36).slice(2, 8),
    legs,
    complete: remaining.size === 0,
    uncoveredServices: Array.from(remaining),
  };
}

function broadestScope(services: PartnerType[]): ServiceLeg["inputFileScope"] {
  if (services.some((s) => SCOPE_FOR[s] === "full_sources")) return "full_sources";
  if (services.some((s) => SCOPE_FOR[s] === "fabrication_outputs")) return "fabrication_outputs";
  return "documents_only";
}

/** Buyer-facing entry point. Draft partners cannot leak through this. */
export function routeForBuyer(partners: ServicePartner[], req: RoutingInput) {
  const visible = partners.filter((p) => (req.includeDraftPartners ? true : isBuyerVisible(p)));
  const checks = visible.map((p) => checkEligibility(p, req));
  const eligible = checks.filter((c) => c.eligible);
  return {
    ranked: rankPartners(eligible),
    rejected: checks.filter((c) => !c.eligible),
    plan: composePlan(partners, req),
    hiddenCount: partners.length - visible.length,
  };
}

function clamp(n: number) {
  return Math.max(0, Math.min(1, n));
}
function r2(n: number) {
  return Math.round(n * 100) / 100;
}
