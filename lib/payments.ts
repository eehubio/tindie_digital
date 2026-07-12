// ============================================================================
// Payment channel + seller net-income engine
// Ported from the Seller Console prototype and generalised so that digital
// assets, physical goods and manufacturing orders all price through ONE model.
//
// The core insight this encodes: Tindie's thin take rate is not a fee-rate
// problem, it is a payment-architecture problem. A seller in a Stripe region
// settles through destination charges; a seller in China or a non-Stripe
// corridor settles through Wise, where payout fees and FX loss land on a
// different line of the P&L. The seller must be able to SEE which corridor
// they are in and what it costs them before they publish.
// ============================================================================

export type PayChannel = "stripe" | "wise";

export interface RegionDef {
  label: string;
  channel: PayChannel;
  currency: string;
  crossBorder: boolean;
}

export const REGIONS: Record<string, RegionDef> = {
  US: { label: "United States", channel: "stripe", currency: "USD", crossBorder: false },
  EU: { label: "European Union", channel: "stripe", currency: "EUR", crossBorder: true },
  UK: { label: "United Kingdom", channel: "stripe", currency: "GBP", crossBorder: true },
  CA: { label: "Canada", channel: "stripe", currency: "CAD", crossBorder: true },
  AU: { label: "Australia", channel: "stripe", currency: "AUD", crossBorder: true },
  CN: { label: "China", channel: "wise", currency: "CNY", crossBorder: true },
  IN: { label: "India", channel: "wise", currency: "INR", crossBorder: true },
  OTHER: { label: "Other / not covered by Stripe", channel: "wise", currency: "USD", crossBorder: true },
};

// Fee models — illustrative but aligned to the real structures.
export const FEES = {
  platformPhysical: 0.05, // Tindie's classic 5% on physical goods
  platformDigital: 0.1, // digital assets carry the higher platform fee
  stripe: { pct: 0.029, fixed: 0.3, crossBorderPct: 0.015, fxPct: 0.01 },
  wise: { payoutPct: 0.0075, payoutFixed: 0.6, fxPct: 0.005 },
};

export type GoodsKind = "digital" | "physical" | "manufacturing";

export interface NetInput {
  region: string;
  price: number; // headline goods price
  kind: GoodsKind;
  shipCost?: number; // seller's real outbound cost (0 for digital)
  shipCharged?: number; // what the buyer is charged for shipping
  smallOrderFee?: number; // buyer-side fee, flows to the platform
  bundleItems?: number; // how many items share this one Stripe charge
}

export interface NetResult {
  price: number;
  shipCost: number;
  shipCharged: number;
  smallOrderFee: number;
  buyerPays: number;
  platformFee: number;
  platformFeePct: number;
  payFee: number;
  payLabel: string;
  channel: PayChannel;
  sellerNet: number;
  marginPct: number;
  payFeePctOfPrice: number;
  loss: boolean;
  // per-item amortisation of the fixed fee — the small-order argument
  fixedFeePerItem: number;
}

export function computeNet(input: NetInput): NetResult {
  const r = REGIONS[input.region] ?? REGIONS.US;
  const price = num(input.price);
  const shipCost = input.kind === "digital" ? 0 : num(input.shipCost);
  const shipCharged = input.kind === "digital" ? 0 : num(input.shipCharged ?? input.shipCost);
  const smallOrderFee = num(input.smallOrderFee);
  const items = Math.max(1, input.bundleItems ?? 1);

  const buyerPays = price + shipCharged + smallOrderFee;

  // Platform commission is charged on goods value only — never on shipping.
  const platformFeePct = input.kind === "digital" ? FEES.platformDigital : FEES.platformPhysical;
  const platformFee = price * platformFeePct;

  let payFee = 0;
  let payLabel = "";
  if (r.channel === "stripe") {
    const f = FEES.stripe;
    payFee = buyerPays * f.pct + f.fixed;
    let extra = 0;
    if (r.crossBorder) extra += buyerPays * f.crossBorderPct;
    if (r.currency !== "USD") extra += buyerPays * f.fxPct;
    payFee += extra;
    payLabel =
      `Stripe ${(f.pct * 100).toFixed(1)}% + $${f.fixed.toFixed(2)}` +
      (r.crossBorder ? ` + cross-border ${(f.crossBorderPct * 100).toFixed(1)}%` : "") +
      (r.currency !== "USD" ? ` + FX ${(f.fxPct * 100).toFixed(1)}%` : "") +
      " · destination charge";
  } else {
    const f = FEES.wise;
    payFee = buyerPays * f.payoutPct + f.payoutFixed + buyerPays * f.fxPct;
    payLabel =
      `Wise payout ${(f.payoutPct * 100).toFixed(2)}% + $${f.payoutFixed.toFixed(2)} + FX loss ${(
        f.fxPct * 100
      ).toFixed(2)}%`;
  }

  // Seller absorbs their own outbound shipping cost; the small-order fee is the
  // platform's, not the seller's, so it never enters seller net.
  const sellerNet = price + shipCharged - platformFee - payFee - shipCost;
  const marginPct = price > 0 ? (sellerNet / price) * 100 : 0;

  return {
    price: r2(price),
    shipCost: r2(shipCost),
    shipCharged: r2(shipCharged),
    smallOrderFee: r2(smallOrderFee),
    buyerPays: r2(buyerPays),
    platformFee: r2(platformFee),
    platformFeePct,
    payFee: r2(payFee),
    payLabel,
    channel: r.channel,
    sellerNet: r2(sellerNet),
    marginPct: r2(marginPct),
    payFeePctOfPrice: price > 0 ? r2((payFee / price) * 100) : 0,
    loss: sellerNet < 0,
    fixedFeePerItem: r2((r.channel === "stripe" ? FEES.stripe.fixed : FEES.wise.payoutFixed) / items),
  };
}

function num(v: unknown) {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}
function r2(n: number) {
  return Math.round(n * 100) / 100;
}
