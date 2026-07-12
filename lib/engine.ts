import { ServicePartner, PartnerType, CartItem, PaymentConfig } from "./types";

// ============================================================================
// Partner Routing Engine — rule-based scoring (Phase 1, no AI needed).
// Reads the partner list; weights are configurable, not baked into the UI.
// ============================================================================
export interface RoutingInput {
  destinationCountry: string;
  requestedServices: PartnerType[];
  quantity: number;
  needsSourcing?: boolean;
  language?: string;
}

export interface ScoredPartner {
  partner: ServicePartner;
  score: number;
  reasons: string[];
}

const WEIGHTS = {
  capability: 0.3,
  region: 0.15,
  price: 0.15,
  leadTime: 0.15,
  quality: 0.1,
  rating: 0.05,
  dispute: 0.05,
  strategic: 0.05,
};

export function scorePartners(partners: ServicePartner[], input: RoutingInput): ScoredPartner[] {
  const active = partners.filter((p) => p.status === "active" || p.status === "draft");

  const scored = active.map((p) => {
    const reasons: string[] = [];

    // capability match — share of requested services the partner covers
    const covered = input.requestedServices.filter((s) => p.partnerTypes.includes(s));
    const capabilityMatch = input.requestedServices.length
      ? covered.length / input.requestedServices.length
      : 0;
    if (capabilityMatch === 1) reasons.push("Covers all requested services");
    else if (capabilityMatch > 0) reasons.push(`Covers ${covered.length}/${input.requestedServices.length} services`);

    // region match
    const servesGlobal = p.serviceCountries.includes("GLOBAL");
    const servesDest = servesGlobal || p.serviceCountries.includes(input.destinationCountry);
    const regionMatch = servesDest ? 1 : 0;
    if (servesDest) reasons.push(servesGlobal ? "Ships globally" : `Local to ${input.destinationCountry}`);

    // price score — lower fromPricePcb is better (normalized loosely)
    const price = p.fromPricePcb ?? 30;
    const priceScore = Math.max(0, 1 - (price - 8) / 30);

    // lead time score — faster is better
    const leadMid = (p.minLeadDays + p.maxLeadDays) / 2;
    const leadTimeScore = Math.max(0, 1 - (leadMid - 2) / 14);
    if (leadMid <= 7) reasons.push(`Typical lead time ${p.minLeadDays}–${p.maxLeadDays} days`);

    const qualityScore = p.onTimeRate;
    const ratingScore = p.rating / 5;
    const disputeScore = 1 - p.disputeRate;
    const strategicScore = p.strategic ? 1 : 0;
    if (p.strategic) reasons.push("Strategic Tindie partner");

    const score =
      capabilityMatch * WEIGHTS.capability +
      regionMatch * WEIGHTS.region +
      priceScore * WEIGHTS.price +
      leadTimeScore * WEIGHTS.leadTime +
      qualityScore * WEIGHTS.quality +
      ratingScore * WEIGHTS.rating +
      disputeScore * WEIGHTS.dispute +
      strategicScore * WEIGHTS.strategic;

    return { partner: p, score: Math.round(score * 100) / 100, reasons };
  });

  // Only surface partners that cover at least one requested capability.
  return scored
    .filter((s) => s.reasons.some((r) => r.startsWith("Covers")))
    .sort((a, b) => b.score - a.score);
}

// ============================================================================
// Payment breakdown — the answer to "$5 asset vs $0.30 Stripe fee".
// Consolidating a cart amortizes the fixed fee; a configurable small-order fee
// covers the platform when a single tiny item is bought alone.
// ============================================================================
export interface PaymentBreakdown {
  grossDigital: number;
  itemCount: number;
  smallOrderFee: number;
  buyerTotal: number;
  stripeFee: number;
  platformFee: number;
  sellerNet: number;
  // efficiency stats
  stripeFeePctOfGross: number;
  effectiveTakeForSeller: number;
}

export function computePayment(items: CartItem[], cfg: PaymentConfig): PaymentBreakdown {
  const digital = items.filter((i) => i.productType === "digital" || i.productType === "service");
  const grossDigital = digital.reduce((s, i) => s + i.unitPrice * i.qty, 0);
  const itemCount = digital.reduce((s, i) => s + i.qty, 0);

  // A small-order fee applies only when the digital subtotal is below the
  // fee-free threshold. Bundling multiple assets pushes the buyer over it.
  const smallOrderFee = grossDigital > 0 && grossDigital < cfg.digitalMinimumWithoutFee ? cfg.smallOrderFee : 0;

  const buyerTotal = grossDigital + smallOrderFee;

  // One Stripe charge for the whole cart => fixed fee is paid once, not per item.
  const stripeFee = buyerTotal > 0 ? buyerTotal * cfg.stripePercent + cfg.stripeFixedFee : 0;
  const platformFee = grossDigital * cfg.platformFeePercent;
  const sellerNet = grossDigital - platformFee;

  return {
    grossDigital: round(grossDigital),
    itemCount,
    smallOrderFee: round(smallOrderFee),
    buyerTotal: round(buyerTotal),
    stripeFee: round(stripeFee),
    platformFee: round(platformFee),
    sellerNet: round(sellerNet),
    stripeFeePctOfGross: grossDigital > 0 ? round((stripeFee / grossDigital) * 100) : 0,
    effectiveTakeForSeller: grossDigital > 0 ? round((sellerNet / grossDigital) * 100) : 0,
  };
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}
