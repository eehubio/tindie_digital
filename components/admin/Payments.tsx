"use client";

import { useMemo, useState } from "react";
import { paymentConfig as seedCfg } from "@/lib/mock";
import { PaymentConfig, CartItem, ProcessingFeeAllocation } from "@/lib/types";
import { computePayment, assertBalanced } from "@/lib/engine";
import { SectionTitle } from "@/components/ui";
import { useApp } from "@/lib/store";

const item = (
  type: CartItem["productType"],
  price: number,
  qty = 1,
  key = `${type}-${price}-${qty}`
): CartItem => ({
  key,
  productId: "sim",
  productTitle: "Simulated",
  productType: type,
  fulfillmentType: type === "digital" ? "download" : "shipping",
  sellerName: "Sim",
  unitPrice: price,
  qty,
});

// The four cases the model has to survive.
const SCENARIOS: { name: string; items: CartItem[]; shipping?: number }[] = [
  { name: "Single $2 asset", items: [item("digital", 2)] },
  { name: "Single $5 asset", items: [item("digital", 5)] },
  { name: "Two $5 assets", items: [item("digital", 5, 1, "a"), item("digital", 5, 1, "b")] },
  {
    name: "Digital $12 + physical $19.99",
    items: [item("digital", 12), item("physical", 19.99)],
    shipping: 6.5,
  },
];

const ALLOC_LABEL: Record<ProcessingFeeAllocation, string> = {
  platform_absorbs: "Platform absorbs",
  seller_pays: "Seller pays",
  buyer_pays: "Buyer pays (surcharge)",
  shared: "Shared 50/50",
};

const ALLOC_HELP: Record<ProcessingFeeAllocation, string> = {
  platform_absorbs:
    "Cleanest for the seller, and the platform's commission has to cover it. At a 10% take on a $5 asset that is $0.50 of commission against $0.45 of Stripe — the margin is a rounding error, which is exactly why the small-order fee exists.",
  seller_pays:
    "Tindie's classic behaviour. The seller sees a smaller payout than the headline price. Honest only if the deduction is itemised on the payout, which is what the Payouts page does.",
  buyer_pays:
    "Surcharging is circular — the surcharge increases the amount charged, which increases the fee. Solved algebraically here rather than approximated. Note that card-brand rules and several jurisdictions restrict or prohibit this.",
  shared:
    "Splits the processing cost between seller and platform. Defensible, but it means neither party can predict their margin without doing arithmetic — which most sellers will not do.",
};

export default function AdminPaymentsPage() {
  const [cfg, setCfg] = useState<PaymentConfig>(seedCfg);
  const { showToast } = useApp();

  const set = <K extends keyof PaymentConfig>(k: K, v: PaymentConfig[K]) => setCfg((c) => ({ ...c, [k]: v }));

  const results = useMemo(
    () =>
      SCENARIOS.map((s) => {
        const b = computePayment(s.items, cfg, {
          shippingCharged: s.shipping ?? 0,
          shippingCost: s.shipping ?? 0,
        });
        return { ...s, b, balance: assertBalanced(b, s.shipping ?? 0) };
      }),
    [cfg]
  );

  return (
    <div>
      <SectionTitle
        right={
          <button className="t-btn-primary" onClick={() => showToast("Payment configuration saved")}>
            Save configuration
          </button>
        }
      >
        Payment Configuration
      </SectionTitle>

      <div className="t-card p-4 mb-5 bg-panel/60 text-sm text-slate leading-relaxed">
        <strong className="text-navy">The fee has to land on somebody.</strong> An itemised UI that shows a Stripe fee
        while the seller&apos;s payout and the platform&apos;s revenue both ignore it is not a fee model — it is a
        rounding error waiting to become a reconciliation incident. Pick an allocation below and every scenario
        recalculates, including a proof that the books close.
      </div>

      <div className="grid lg:grid-cols-[320px_1fr] gap-5 items-start">
        {/* Levers */}
        <div className="t-card p-5 space-y-4">
          <div>
            <label className="t-label">Who pays the processing fee</label>
            <div className="space-y-2">
              {(["platform_absorbs", "seller_pays", "buyer_pays", "shared"] as ProcessingFeeAllocation[]).map((a) => (
                <label
                  key={a}
                  className={`block border rounded-lg p-2.5 cursor-pointer transition ${
                    cfg.feeAllocation === a ? "border-teal bg-teal-light/40" : "border-line hover:border-teal/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={cfg.feeAllocation === a}
                      onChange={() => set("feeAllocation", a)}
                      className="accent-teal"
                    />
                    <span className="font-semibold text-navy text-sm">{ALLOC_LABEL[a]}</span>
                    {a === "buyer_pays" && <span className="t-tag bg-red-100 text-red-700 ml-auto">restricted</span>}
                  </div>
                </label>
              ))}
            </div>
            <p className="t-hint">{ALLOC_HELP[cfg.feeAllocation]}</p>
          </div>

          <div className="pt-3 border-t border-line">
            <label className="t-label">Minimum digital price (USD)</label>
            <input
              className="t-input"
              type="number"
              step="0.5"
              value={cfg.minimumDigitalPrice}
              onChange={(e) => set("minimumDigitalPrice", Number(e.target.value))}
            />
          </div>
          <div>
            <label className="t-label">Fee-free threshold (USD)</label>
            <input
              className="t-input"
              type="number"
              value={cfg.digitalMinimumWithoutFee}
              onChange={(e) => set("digitalMinimumWithoutFee", Number(e.target.value))}
            />
            <p className="t-hint">Digital only. Physical orders carry shipping; services carry their own price.</p>
          </div>
          <div>
            <label className="t-label">Small-order fee (USD)</label>
            <input
              className="t-input"
              type="number"
              step="0.05"
              value={cfg.smallOrderFee}
              onChange={(e) => set("smallOrderFee", Number(e.target.value))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-line">
            <div>
              <label className="t-label">Digital fee (%)</label>
              <input
                className="t-input"
                type="number"
                value={cfg.platformFeePercent * 100}
                onChange={(e) => set("platformFeePercent", Number(e.target.value) / 100)}
              />
            </div>
            <div>
              <label className="t-label">Physical fee (%)</label>
              <input
                className="t-input"
                type="number"
                value={cfg.platformFeePercentPhysical * 100}
                onChange={(e) => set("platformFeePercentPhysical", Number(e.target.value) / 100)}
              />
            </div>
            <div>
              <label className="t-label">Service fee (%)</label>
              <input
                className="t-input"
                type="number"
                value={cfg.servicePlatformFeePercent * 100}
                onChange={(e) => set("servicePlatformFeePercent", Number(e.target.value) / 100)}
              />
              <p className="t-hint">Services are quoted work — separate rate, separate refund logic.</p>
            </div>
            <div>
              <label className="t-label">Tax rate (%)</label>
              <input
                className="t-input"
                type="number"
                step="0.5"
                value={cfg.taxRate * 100}
                onChange={(e) => set("taxRate", Number(e.target.value) / 100)}
              />
            </div>
            <div>
              <label className="t-label">Stripe fixed ($)</label>
              <input
                className="t-input"
                type="number"
                step="0.05"
                value={cfg.stripeFixedFee}
                onChange={(e) => set("stripeFixedFee", Number(e.target.value))}
              />
            </div>
            <div>
              <label className="t-label">Stripe percent (%)</label>
              <input
                className="t-input"
                type="number"
                step="0.1"
                value={cfg.stripePercent * 100}
                onChange={(e) => set("stripePercent", Number(e.target.value) / 100)}
              />
            </div>
          </div>
        </div>

        {/* Scenarios */}
        <div className="space-y-4">
          {results.map(({ name, b, balance, shipping }) => (
            <div key={name} className="t-card overflow-hidden">
              <div className="px-4 py-2.5 bg-panel border-b border-line flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-navy text-sm">{name}</span>
                {b.platformLoses && <span className="t-tag bg-red-100 text-red-700">platform loses money</span>}
                <span
                  className={`t-tag ml-auto ${
                    balance.balanced ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                  }`}
                  title="buyerTotal = sellerNet + platformNet + stripeFee + tax + shippingCost"
                >
                  {balance.balanced ? "✓ books close" : `✕ off by $${balance.delta}`}
                </span>
              </div>

              <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-line">
                <div className="p-4">
                  <div className="text-xs uppercase tracking-wide text-muted mb-2">Buyer</div>
                  <dl className="text-sm space-y-1">
                    <Row k="Goods" v={b.goodsSubtotal} />
                    {b.serviceSubtotal > 0 && <Row k="Services" v={b.serviceSubtotal} />}
                    {b.shipping > 0 && <Row k="Shipping" v={b.shipping} />}
                    {b.smallOrderFee > 0 && <Row k="Small-order fee" v={b.smallOrderFee} />}
                    {b.tax > 0 && <Row k="Tax" v={b.tax} />}
                    {b.stripeFeePaidByBuyer > 0 && <Row k="Processing surcharge" v={b.stripeFeePaidByBuyer} />}
                    <div className="flex justify-between font-bold text-navy border-t border-line pt-1.5 mt-1.5">
                      <dt>Buyer total</dt>
                      <dd>${b.buyerTotal.toFixed(2)}</dd>
                    </div>
                  </dl>
                </div>

                <div className="p-4">
                  <div className="text-xs uppercase tracking-wide text-muted mb-2">Where it lands</div>
                  <dl className="text-sm space-y-1">
                    <Row k="Seller net" v={b.sellerNet} strong />
                    <Row k="Platform net revenue" v={b.platformNetRevenue} strong tone={b.platformLoses ? "text-danger" : "text-ok"} />
                    <Row k="Stripe" v={b.stripeFee} muted />
                    {shipping ? <Row k="Carrier (label)" v={shipping} muted /> : null}
                    {b.tax > 0 && <Row k="Tax authority" v={b.tax} muted />}
                  </dl>
                  <div className="mt-2 pt-2 border-t border-line text-[11px] text-muted leading-relaxed">
                    Stripe fee ${b.stripeFee.toFixed(2)} ={" "}
                    {b.stripeFeePaidByBuyer > 0 && `buyer $${b.stripeFeePaidByBuyer.toFixed(2)} `}
                    {b.stripeFeePaidBySeller > 0 && `seller $${b.stripeFeePaidBySeller.toFixed(2)} `}
                    {b.stripeFeePaidByPlatform > 0 && `platform $${b.stripeFeePaidByPlatform.toFixed(2)}`}
                    {" · "}
                    {b.stripeFeePctOfGoods.toFixed(1)}% of merchandise · seller keeps {b.sellerTakePct.toFixed(0)}%
                  </div>
                </div>
              </div>
            </div>
          ))}

          <p className="t-hint">
            Try <strong>Platform absorbs</strong> with the small-order fee set to $0: the $2 and $5 scenarios go red.
            That is the whole business case for the small-order fee, stated as arithmetic rather than as an assertion.
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v, muted, strong, tone }: { k: string; v: number; muted?: boolean; strong?: boolean; tone?: string }) {
  return (
    <div className={`flex justify-between ${muted ? "text-muted" : ""} ${strong ? "font-semibold" : ""}`}>
      <dt>{k}</dt>
      <dd className={tone ?? (strong ? "text-navy" : "")}>${v.toFixed(2)}</dd>
    </div>
  );
}
