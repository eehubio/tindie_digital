// ============================================================================
// Logistics providers — the carrier/rate-aggregation layer, as configuration.
//
// Same principle as the partner network: a provider is a RECORD, not a branch
// in the code. Adding EasyPost alongside Shippo, or swapping a region to a
// direct carrier account, is a status change here — not a deploy.
//
// Two policies live here that are usually left implicit, and both of them
// decide whether sellers trust the platform:
//   1. Label markup — whether the platform resells labels above cost.
//   2. Post-billing adjustments — who absorbs the carrier's re-rate when the
//      parcel turns out heavier or bigger than declared.
// ============================================================================

export type IntegrationType = "rate_and_label_api" | "rate_api_only" | "manual";
export type ProviderStatus = "active" | "draft" | "disabled";

export interface LogisticsProvider {
  id: string;
  name: string;
  kind: "aggregator" | "carrier_direct" | "reseller" | "manual";
  status: ProviderStatus;
  connected: boolean;
  integration: IntegrationType;
  /** Origin regions this provider can actually ship FROM. */
  originRegions: string[];
  carriers: string[];
  /** Discount off published retail rates, negotiated by the platform. */
  discountPct: number;
  /** Per-label fee the provider charges the platform. */
  perLabelFee: number;
  /** Fixed monthly platform cost. */
  monthlyFee: number;
  /** Fallback order — lower runs first when several providers can serve a lane. */
  priority: number;
  supportsTracking: boolean;
  supportsCustomsDocs: boolean;
  notes: string;
}

export const logisticsProviders: LogisticsProvider[] = [
  {
    id: "shippo",
    name: "Shippo",
    kind: "aggregator",
    status: "active",
    connected: true,
    integration: "rate_and_label_api",
    originRegions: ["US", "CA", "GB", "EU", "AU"],
    carriers: ["USPS", "UPS", "FedEx", "DHL Express", "Canada Post", "Royal Mail"],
    discountPct: 0.28,
    perLabelFee: 0.05,
    monthlyFee: 0,
    priority: 1,
    supportsTracking: true,
    supportsCustomsDocs: true,
    notes: "Primary aggregator. Commercial-plus USPS rates, automatic commercial invoice generation for cross-border.",
  },
  {
    id: "easypost",
    name: "EasyPost",
    kind: "aggregator",
    status: "draft",
    connected: false,
    integration: "rate_and_label_api",
    originRegions: ["US", "CA", "EU"],
    carriers: ["USPS", "UPS", "FedEx", "DHL eCommerce"],
    discountPct: 0.26,
    perLabelFee: 0.01,
    monthlyFee: 0,
    priority: 2,
    supportsTracking: true,
    supportsCustomsDocs: true,
    notes: "Second aggregator, kept in draft as a live failover. Two aggregators means an outage at one does not stop fulfillment.",
  },
  {
    id: "pirateship",
    name: "Pirate Ship",
    kind: "reseller",
    status: "active",
    connected: true,
    integration: "rate_api_only",
    originRegions: ["US"],
    carriers: ["USPS", "UPS"],
    discountPct: 0.32,
    perLabelFee: 0,
    monthlyFee: 0,
    priority: 3,
    supportsTracking: true,
    supportsCustomsDocs: false,
    notes: "Best USPS pricing for US-origin sellers and no per-label fee, but no customs document generation — cross-border still routes to Shippo.",
  },
  {
    id: "dhl_direct",
    name: "DHL Express (direct account)",
    kind: "carrier_direct",
    status: "draft",
    connected: false,
    integration: "rate_and_label_api",
    originRegions: ["CN", "EU", "US"],
    carriers: ["DHL Express"],
    discountPct: 0.42,
    perLabelFee: 0,
    monthlyFee: 0,
    priority: 4,
    supportsTracking: true,
    supportsCustomsDocs: true,
    notes: "A negotiated direct account beats any aggregator on express, but requires committed volume. Worth enabling once express volume justifies it.",
  },
  {
    id: "cn_lines",
    name: "China Post / Yanwen",
    kind: "manual",
    status: "active",
    connected: false,
    integration: "manual",
    originRegions: ["CN"],
    carriers: ["China Post", "Yanwen", "ePacket"],
    discountPct: 0,
    perLabelFee: 0,
    monthlyFee: 0,
    priority: 5,
    supportsTracking: true,
    supportsCustomsDocs: false,
    notes: "No aggregator serves these lanes. Sellers buy their own label and paste the tracking number — which is exactly why the tracking field stays editable at fulfillment.",
  },
];

// ---------------------------------------------------------------------------
// Platform policies
// ---------------------------------------------------------------------------
export type MarkupMode = "at_cost" | "fixed" | "percent";
export type AdjustmentPolicy = "seller_absorbs" | "platform_absorbs" | "split";

export interface LogisticsConfig {
  markupMode: MarkupMode;
  markupFixed: number;
  markupPercent: number;
  /** Who eats the carrier's post-billing re-rate (dimensional weight, surcharges). */
  adjustmentPolicy: AdjustmentPolicy;
  /** Threshold above which an adjustment is escalated rather than auto-charged. */
  adjustmentAlertOver: number;
  insuranceEnabled: boolean;
  insurancePercent: number;
}

export const defaultLogisticsConfig: LogisticsConfig = {
  markupMode: "at_cost",
  markupFixed: 0,
  markupPercent: 0,
  adjustmentPolicy: "split",
  adjustmentAlertOver: 5,
  insuranceEnabled: true,
  insurancePercent: 0.01,
};

export const MARKUP_HELP: Record<MarkupMode, string> = {
  at_cost:
    "Labels are sold to sellers at exactly what the platform pays. No hidden margin. This is the default because a shipping markup is a fee that sellers discover in their own spreadsheet — and then never trust you again.",
  fixed: "A flat handling fee per label. Visible as its own line, not folded into the rate.",
  percent: "A percentage of the label cost. Scales with the carrier's rate rather than with the work done, which is hard to justify to a seller.",
};

export const ADJUSTMENT_HELP: Record<AdjustmentPolicy, string> = {
  seller_absorbs:
    "The seller declared the weight, so the seller pays the re-rate. Simple, but a single mis-measured parcel can wipe out the margin on an order.",
  platform_absorbs:
    "The platform eats every adjustment. Kind, and an unbounded liability — a seller with a systematically wrong scale costs you money forever.",
  split:
    "Platform absorbs adjustments under the alert threshold; anything larger is escalated to the seller with the carrier's evidence attached. Bounds the platform's exposure without punishing an honest 20-gram error.",
};

// ---------------------------------------------------------------------------
// Rate comparison — what each provider would actually charge for one parcel.
// ---------------------------------------------------------------------------
export interface ProviderQuote {
  provider: LogisticsProvider;
  eligible: boolean;
  reason?: string;
  retailRate: number;
  platformCost: number; // after discount, plus per-label fee
  sellerPays: number; // after markup policy
}

export function compareProviders(
  retailRate: number,
  origin: string,
  crossBorder: boolean,
  cfg: LogisticsConfig,
  providers = logisticsProviders
): ProviderQuote[] {
  return providers
    .map((p) => {
      let eligible = p.status === "active";
      let reason: string | undefined;
      if (p.status !== "active") reason = `status: ${p.status}`;
      else if (!p.originRegions.includes(origin)) {
        eligible = false;
        reason = `does not ship from ${origin}`;
      } else if (crossBorder && !p.supportsCustomsDocs) {
        eligible = false;
        reason = "no customs document generation";
      } else if (p.integration === "manual") {
        eligible = false;
        reason = "manual lane — seller buys their own label";
      }

      const platformCost = retailRate * (1 - p.discountPct) + p.perLabelFee;
      const sellerPays =
        cfg.markupMode === "at_cost"
          ? platformCost
          : cfg.markupMode === "fixed"
          ? platformCost + cfg.markupFixed
          : platformCost * (1 + cfg.markupPercent);

      return {
        provider: p,
        eligible,
        reason,
        retailRate: r2(retailRate),
        platformCost: r2(platformCost),
        sellerPays: r2(sellerPays),
      };
    })
    .sort((a, b) => {
      if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
      if (!a.eligible) return a.provider.priority - b.provider.priority;
      return a.platformCost - b.platformCost;
    });
}

function r2(n: number) {
  return Math.round(n * 100) / 100;
}
