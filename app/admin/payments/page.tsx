"use client";

import { useMemo, useState } from "react";
import { paymentConfig as seedCfg } from "@/lib/mock";
import { PaymentConfig, CartItem } from "@/lib/types";
import { computePayment } from "@/lib/engine";
import { SectionTitle } from "@/components/ui";
import { useApp } from "@/lib/store";

function item(price: number, qty: number): CartItem {
  return {
    key: `sim_${price}_${qty}`,
    productId: "sim",
    productTitle: "Simulated asset",
    productType: "digital",
    fulfillmentType: "download",
    sellerName: "Sim Seller",
    unitPrice: price,
    qty,
  };
}

export default function AdminPaymentsPage() {
  const [cfg, setCfg] = useState<PaymentConfig>(seedCfg);
  const [simPrice, setSimPrice] = useState(5);
  const [simQty, setSimQty] = useState(1);
  const { showToast } = useApp();

  const sim = useMemo(() => computePayment([item(simPrice, simQty)], cfg), [simPrice, simQty, cfg]);

  // Sweep: what a lone purchase costs at each price point.
  const sweep = useMemo(
    () =>
      [2, 3, 5, 8, 10, 15, 25, 49].map((p) => {
        const b = computePayment([item(p, 1)], cfg);
        return { price: p, ...b };
      }),
    [cfg]
  );

  const set = <K extends keyof PaymentConfig>(k: K, v: number) => setCfg((c) => ({ ...c, [k]: v }));

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

      <div className="t-card p-4 mb-5 bg-panel/60">
        <p className="text-sm text-slate">
          <strong className="text-navy">The problem.</strong> A $5 KiCad asset carries a fixed{" "}
          ${cfg.stripeFixedFee.toFixed(2)} Stripe fee plus {(cfg.stripePercent * 100).toFixed(1)}% — over{" "}
          {computePayment([item(5, 1)], { ...cfg, smallOrderFee: 0, digitalMinimumWithoutFee: 0 }).stripeFeePctOfGross.toFixed(
            1
          )}
          % of the sale before the platform takes anything. Three levers fix it, all configured here:{" "}
          <strong className="text-navy">a floor price</strong>, <strong className="text-navy">a small-order fee</strong>{" "}
          below a fee-free threshold, and <strong className="text-navy">consolidated cart checkout</strong> so one Stripe
          charge covers many assets.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Config */}
        <div className="t-card p-5 space-y-4">
          <h3 className="font-bold text-navy">Platform levers</h3>

          <div>
            <label className="t-label">Minimum digital price (USD)</label>
            <input
              className="t-input"
              type="number"
              step="0.5"
              value={cfg.minimumDigitalPrice}
              onChange={(e) => set("minimumDigitalPrice", Number(e.target.value))}
            />
            <p className="t-hint">Below this, a listing cannot be priced. Blocks structurally unprofitable sales.</p>
          </div>

          <div>
            <label className="t-label">Fee-free threshold (USD)</label>
            <input
              className="t-input"
              type="number"
              step="1"
              value={cfg.digitalMinimumWithoutFee}
              onChange={(e) => set("digitalMinimumWithoutFee", Number(e.target.value))}
            />
            <p className="t-hint">Carts at or above this pay no small-order fee — this is what pushes bundling.</p>
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
            <p className="t-hint">Charged to the buyer, not deducted from the seller. Sellers keep their headline price.</p>
          </div>

          <div>
            <label className="t-label">Platform fee on digital (%)</label>
            <input
              className="t-input"
              type="number"
              step="0.5"
              value={cfg.platformFeePercent * 100}
              onChange={(e) => set("platformFeePercent", Number(e.target.value) / 100)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-line">
            <div>
              <label className="t-label">Stripe fixed (USD)</label>
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

        {/* Simulator */}
        <div className="t-card p-5 lg:col-span-2">
          <h3 className="font-bold text-navy">Live simulator</h3>
          <div className="grid sm:grid-cols-2 gap-4 mt-3">
            <div>
              <label className="t-label">Asset price (USD)</label>
              <input
                className="t-input"
                type="range"
                min={1}
                max={50}
                step={1}
                value={simPrice}
                onChange={(e) => setSimPrice(Number(e.target.value))}
              />
              <div className="text-sm text-navy font-semibold">${simPrice.toFixed(2)}</div>
              {simPrice < cfg.minimumDigitalPrice && (
                <p className="t-hint text-danger">Below the minimum digital price — listing would be rejected.</p>
              )}
            </div>
            <div>
              <label className="t-label">Assets in cart</label>
              <input
                className="t-input"
                type="range"
                min={1}
                max={8}
                step={1}
                value={simQty}
                onChange={(e) => setSimQty(Number(e.target.value))}
              />
              <div className="text-sm text-navy font-semibold">
                {simQty} item{simQty > 1 ? "s" : ""}
              </div>
              <p className="t-hint">One Stripe charge per cart — the fixed fee is paid once.</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-4 gap-3 mt-5">
            <Tile label="Buyer pays" value={`$${sim.buyerTotal.toFixed(2)}`} />
            <Tile
              label="Small-order fee"
              value={`$${sim.smallOrderFee.toFixed(2)}`}
              tone={sim.smallOrderFee ? "text-tag" : "text-ok"}
            />
            <Tile
              label="Stripe cost"
              value={`$${sim.stripeFee.toFixed(2)}`}
              tone={sim.stripeFeePctOfGross > 8 ? "text-danger" : "text-navy"}
            />
            <Tile
              label="Stripe % of goods"
              value={`${sim.stripeFeePctOfGross.toFixed(1)}%`}
              tone={sim.stripeFeePctOfGross > 8 ? "text-danger" : "text-ok"}
            />
          </div>

          <div className="mt-3 text-sm bg-panel rounded-lg p-3 text-slate">
            Seller receives <strong className="text-navy">${sim.sellerNet.toFixed(2)}</strong> (
            {sim.effectiveTakeForSeller.toFixed(0)}% of goods value). Platform margin after Stripe:{" "}
            <strong className={sim.platformFee - sim.stripeFee + sim.smallOrderFee >= 0 ? "text-ok" : "text-danger"}>
              ${(sim.platformFee + sim.smallOrderFee - sim.stripeFee).toFixed(2)}
            </strong>
            .
          </div>

          <h4 className="font-semibold text-navy text-sm mt-6 mb-2">
            Single-item purchase across price points (current config)
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted border-b border-line">
                  <th className="py-2">Price</th>
                  <th>Buyer pays</th>
                  <th>Small-order fee</th>
                  <th>Stripe</th>
                  <th>Stripe % of goods</th>
                  <th>Platform net</th>
                </tr>
              </thead>
              <tbody>
                {sweep.map((r) => {
                  const net = r.platformFee + r.smallOrderFee - r.stripeFee;
                  const blocked = r.price < cfg.minimumDigitalPrice;
                  return (
                    <tr key={r.price} className={`border-b border-line ${blocked ? "opacity-40" : ""}`}>
                      <td className="py-2 font-semibold text-navy">
                        ${r.price.toFixed(2)}
                        {blocked && <span className="t-tag bg-red-100 text-red-700 ml-2">blocked</span>}
                      </td>
                      <td>${r.buyerTotal.toFixed(2)}</td>
                      <td>{r.smallOrderFee ? `$${r.smallOrderFee.toFixed(2)}` : "—"}</td>
                      <td>${r.stripeFee.toFixed(2)}</td>
                      <td className={r.stripeFeePctOfGross > 8 ? "text-danger font-semibold" : "text-ok"}>
                        {r.stripeFeePctOfGross.toFixed(1)}%
                      </td>
                      <td className={net >= 0 ? "text-ok" : "text-danger font-semibold"}>${net.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="t-hint mt-2">
            Try setting the small-order fee to $0 — the platform goes negative on every sale under roughly $5. That is the
            economics being fixed here, not a UI preference.
          </p>
        </div>
      </div>
    </div>
  );
}

function Tile({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="border border-line rounded-lg p-3">
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className={`text-lg font-bold mt-0.5 ${tone ?? "text-navy"}`}>{value}</div>
    </div>
  );
}
