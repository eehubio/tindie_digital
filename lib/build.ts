// ============================================================================
// Preorder / Build campaigns.
//
// Ported from the ezplm_prebuild prototype (eehubio/ezplm_prebuild). The type
// contract below is deliberately unchanged from that repo — BuildProject,
// ManufacturingReview, quote tiers, computeForecast(), buildCampaignPayload() —
// so a campaign created here serialises into the exact same Campaign JSON that
// module already emits. That payload stays the single contract between ezPLM
// and Tindie; this prototype is a second consumer of it, not a fork.
// ============================================================================

export type CampaignType = "interest_check" | "batch_build" | "rolling_preorder";

export type CampaignStatus =
  | "draft"
  | "internal_review"
  | "partner_review"
  | "changes_required"
  | "ready_to_publish"
  | "preorder_active"
  | "goal_reached"
  | "goal_failed"
  | "in_production"
  | "shipping"
  | "completed"
  | "cancelled";

export type ReviewStatus =
  | "not_requested"
  | "quote_requested"
  | "dfm_reviewing"
  | "dfm_passed"
  | "dfm_changes_required"
  | "production_reserved";

export type MaturityLevel =
  | "concept"
  | "working_prototype"
  | "engineering_sample"
  | "production_ready"
  | "ready_to_ship";

export type ReadinessState = "ready" | "needs_update" | "missing";

export interface EngineeringReadiness {
  gerber: ReadinessState;
  bom: ReadinessState;
  pickAndPlace: ReadinessState;
  testProcedure: ReadinessState;
  packaging: ReadinessState;
}

export interface QuoteTier {
  quantity: number;
  unitCost: number;
  leadTimeDays: number;
}

export interface ManufacturingReview {
  id: string;
  partnerId: string;
  partnerName: string;
  status: ReviewStatus;
  dfmScore?: number;
  bomRisk: "low" | "medium" | "high" | "unknown";
  assemblyFeasibility: "low" | "medium" | "high" | "unknown";
  testability: "poor" | "fair" | "good" | "excellent" | "unknown";
  quoteTiers: QuoteTier[];
  recommendations: string[];
  handledRecommendations: string[];
  publicSummary: string;
  quoteValidUntil?: string;
}

export interface Milestone {
  id: string;
  title: string;
  status: "pending" | "in_progress" | "completed" | "blocked";
  visibility: "public" | "internal";
  targetDate: string;
  progress: number;
}

export interface CampaignVariant {
  id: string;
  name: string;
  sku: string;
  unitPrice: number;
  reservedQuantity: number;
}

export interface OrderRecord {
  id: string;
  date: string;
  country: string;
  variantName: string;
  units: number;
  amount: number;
  status: "paid" | "reserved" | "refunded";
}

export interface Campaign {
  id: string;
  slug: string;
  ezplmProjectId: string;
  tindieProductId?: string;
  title: string;
  subtitle: string;
  description: string;
  ownerName: string;
  status: CampaignStatus;
  campaignType: CampaignType;
  maturityLevel: MaturityLevel;
  minimumUnits: number;
  maximumUnits: number;
  reservedUnits: number;
  paidUnits: number;
  unitPrice: number;
  earlyBirdPrice?: number;
  earlyBirdQuantity?: number;
  estimatedShipDate: string;
  campaignStart: string;
  campaignEnd: string;
  publicRiskSummary: string;
  refundPolicy: string;
  readiness: EngineeringReadiness;
  specs: { label: string; value: string }[];
  variants: CampaignVariant[];
  milestones: Milestone[];
  review: ManufacturingReview;
  orders: OrderRecord[];
  activity: { at: string; text: string }[];
}

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------
export const CAMPAIGN_TYPE_LABEL: Record<CampaignType, string> = {
  interest_check: "Interest Check",
  batch_build: "Batch Build",
  rolling_preorder: "Rolling Preorder",
};

export const CAMPAIGN_TYPE_HELP: Record<CampaignType, string> = {
  interest_check:
    "Collect signups without taking any payment. Zero risk to the buyer and zero liability for the seller — the right first campaign for anyone who has never manufactured before.",
  batch_build:
    "Crowdfunding-style. Preorders are authorised up front and only captured once the minimum goal is reached; if the goal fails, nothing is ever charged.",
  rolling_preorder:
    "Continuous preorders, shipped in rolling production batches. For a design that is already proven and simply not in stock.",
};

export const CAMPAIGN_TYPE_RISK: Record<CampaignType, { tone: string; label: string }> = {
  interest_check: { tone: "bg-emerald-100 text-emerald-700", label: "No payment taken" },
  batch_build: { tone: "bg-amber-100 text-amber-800", label: "Funds authorised, captured on goal" },
  rolling_preorder: { tone: "bg-red-100 text-red-700", label: "Charged immediately — highest obligation" },
};

export const STATUS_LABEL: Record<CampaignStatus, { label: string; tone: string }> = {
  draft: { label: "Draft", tone: "bg-panel text-slate" },
  internal_review: { label: "Internal review", tone: "bg-blue-100 text-blue-700" },
  partner_review: { label: "Partner DFM review", tone: "bg-blue-100 text-blue-700" },
  changes_required: { label: "Changes required", tone: "bg-amber-100 text-amber-800" },
  ready_to_publish: { label: "Ready to publish", tone: "bg-blue-100 text-blue-700" },
  preorder_active: { label: "Preorder active", tone: "bg-emerald-100 text-emerald-700" },
  goal_reached: { label: "Goal reached", tone: "bg-emerald-100 text-emerald-700" },
  goal_failed: { label: "Goal failed", tone: "bg-red-100 text-red-700" },
  in_production: { label: "In production", tone: "bg-violet-100 text-violet-700" },
  shipping: { label: "Shipping", tone: "bg-teal-light text-teal-dark" },
  completed: { label: "Completed", tone: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "Cancelled", tone: "bg-panel text-slate" },
};

export const REVIEW_LABEL: Record<ReviewStatus, { label: string; tone: string }> = {
  not_requested: { label: "Not requested", tone: "bg-panel text-slate" },
  quote_requested: { label: "Quote requested", tone: "bg-blue-100 text-blue-700" },
  dfm_reviewing: { label: "DFM reviewing", tone: "bg-blue-100 text-blue-700" },
  dfm_passed: { label: "DFM passed", tone: "bg-emerald-100 text-emerald-700" },
  dfm_changes_required: { label: "DFM changes required", tone: "bg-amber-100 text-amber-800" },
  production_reserved: { label: "Production slot reserved", tone: "bg-violet-100 text-violet-700" },
};

export const MATURITY_LABEL: Record<MaturityLevel, string> = {
  concept: "Concept",
  working_prototype: "Working prototype",
  engineering_sample: "Engineering sample",
  production_ready: "Production ready",
  ready_to_ship: "Ready to ship",
};

export const READINESS_LABEL: Record<ReadinessState, { label: string; tone: string }> = {
  ready: { label: "Ready", tone: "bg-emerald-100 text-emerald-700" },
  needs_update: { label: "Needs update", tone: "bg-amber-100 text-amber-800" },
  missing: { label: "Missing", tone: "bg-red-100 text-red-700" },
};

export const STANDARD_MILESTONES: { title: string; visibility: "public" | "internal" }[] = [
  { title: "Working Prototype", visibility: "public" },
  { title: "Design Freeze", visibility: "public" },
  { title: "DFM Review", visibility: "public" },
  { title: "BOM Confirmed", visibility: "public" },
  { title: "Preorder Launch", visibility: "public" },
  { title: "Preorder Goal Reached", visibility: "public" },
  { title: "Material Purchase", visibility: "internal" },
  { title: "PCB Production", visibility: "internal" },
  { title: "SMT Assembly", visibility: "internal" },
  { title: "Functional Test", visibility: "internal" },
  { title: "Packaging", visibility: "internal" },
  { title: "Shipping", visibility: "public" },
];

// ---------------------------------------------------------------------------
// Pure logic — same formulas as ezplm_prebuild/lib/build/logic.ts
// ---------------------------------------------------------------------------
export interface MarginBreakdown {
  unitPrice: number;
  manufacturingCost: number;
  platformFee: number;
  paymentFee: number;
  logistics: number;
  profit: number;
  marginPct: number;
  tierUsed: number | null;
  leadTimeDays: number | null;
}

const PLATFORM_FEE_RATE = 0.05;
const PAYMENT_FEE_RATE = 0.03;
const LOGISTICS_PER_UNIT = 4;

/** Margin at a production quantity, using the largest quote tier ≤ quantity. */
export function estimateMargin(unitPrice: number, qty: number, review: ManufacturingReview): MarginBreakdown {
  const tiers = [...review.quoteTiers].sort((a, b) => a.quantity - b.quantity);
  let chosen: QuoteTier | null = tiers[0] ?? null;
  for (const t of tiers) if (qty >= t.quantity) chosen = t;

  const manufacturingCost = chosen?.unitCost ?? 0;
  const platformFee = unitPrice * PLATFORM_FEE_RATE;
  const paymentFee = unitPrice * PAYMENT_FEE_RATE;
  const profit = unitPrice - manufacturingCost - platformFee - paymentFee - LOGISTICS_PER_UNIT;
  return {
    unitPrice: r2(unitPrice),
    manufacturingCost: r2(manufacturingCost),
    platformFee: r2(platformFee),
    paymentFee: r2(paymentFee),
    logistics: LOGISTICS_PER_UNIT,
    profit: r2(profit),
    marginPct: unitPrice > 0 ? r2((profit / unitPrice) * 100) : 0,
    tierUsed: chosen?.quantity ?? null,
    leadTimeDays: chosen?.leadTimeDays ?? null,
  };
}

export function quoteDaysRemaining(review: ManufacturingReview, today = new Date()): number | null {
  if (!review.quoteValidUntil) return null;
  const end = new Date(`${review.quoteValidUntil}T23:59:59Z`).getTime();
  return Math.ceil((end - today.getTime()) / 86_400_000);
}

export interface Forecast {
  conservativeUnits: number;
  expectedUnits: number;
  optimisticUnits: number;
  confidence: number;
  recommendedProductionQuantity: number;
  notes: string[];
}

/**
 * expected = paidUnits / elapsedRatio × stageFactor
 * conservative ×0.75, optimistic ×1.35
 * recommended = ceil(max(goal, expected) × 1.08 / 5) × 5   (spare + scrap)
 */
export function computeForecast(c: Campaign, now = new Date()): Forecast {
  const start = new Date(c.campaignStart).getTime();
  const end = new Date(c.campaignEnd).getTime();
  const ratio = Math.min(1, Math.max(0.05, (now.getTime() - start) / Math.max(1, end - start)));
  const factor = 1.1;
  const units = c.paidUnits || c.reservedUnits;
  const expected = Math.round((units / ratio) * factor);
  const recommended = Math.ceil((Math.max(c.minimumUnits, expected) * 1.08) / 5) * 5;
  return {
    conservativeUnits: Math.round(expected * 0.75),
    expectedUnits: expected,
    optimisticUnits: Math.round(expected * 1.35),
    confidence: Math.round(Math.min(95, Math.max(20, 30 + ratio * 60))),
    recommendedProductionQuantity: recommended,
    notes: [
      `Based on ${units} units reserved at ${(ratio * 100).toFixed(0)}% of the campaign window.`,
      `Produce ${recommended}: goal units + expected late orders + ~8% spare, warranty and scrap.`,
    ],
  };
}

/** Cumulative preorder trend, derived from the order rows — no summary table. */
export function trendPoints(c: Campaign) {
  const byDate = new Map<string, number>();
  for (const o of c.orders) byDate.set(o.date, (byDate.get(o.date) ?? 0) + o.units);
  const dates = Array.from(byDate.keys()).sort();
  let cum = 0;
  return dates.map((d) => {
    cum += byDate.get(d) ?? 0;
    return { date: d, cumulativeUnits: cum };
  });
}

export function countryBreakdown(c: Campaign) {
  const m = new Map<string, { units: number; revenue: number }>();
  for (const o of c.orders) {
    const cur = m.get(o.country) ?? { units: 0, revenue: 0 };
    m.set(o.country, { units: cur.units + o.units, revenue: cur.revenue + o.amount });
  }
  return Array.from(m.entries())
    .map(([country, v]) => ({ country, ...v }))
    .sort((a, b) => b.units - a.units);
}

/** The ezPLM ↔ Tindie contract. Unchanged shape from ezplm_prebuild. */
export function buildCampaignPayload(c: Campaign) {
  return {
    project_id: c.ezplmProjectId,
    build_campaign_id: c.id,
    tindie_product_id: c.tindieProductId ?? null,
    title: c.title,
    subtitle: c.subtitle,
    description: c.description,
    variants: c.variants.map((v) => ({ sku: v.sku, name: v.name, unit_price: v.unitPrice })),
    minimum_units: c.minimumUnits,
    maximum_units: c.maximumUnits,
    reserved_units: c.reservedUnits,
    unit_price: c.unitPrice,
    currency: "USD",
    estimated_ship_date: c.estimatedShipDate,
    campaign_type: c.campaignType,
    manufacturing_status: c.review.status,
    public_milestones: c.milestones
      .filter((m) => m.visibility === "public")
      .map((m) => ({ title: m.title, status: m.status, target_date: m.targetDate, progress: m.progress })),
    public_risk_summary: c.publicRiskSummary,
    manufacturing_public_summary: c.review.publicSummary,
  };
}

function r2(n: number) {
  return Math.round(n * 100) / 100;
}
