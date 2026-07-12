"use client";

import { useState } from "react";
import { seedCampaigns } from "@/lib/campaigns";
import { REVIEW_LABEL, estimateMargin, quoteDaysRemaining, computeForecast } from "@/lib/build";
import { SectionTitle } from "@/components/ui";
import { useApp } from "@/lib/store";

export default function BuildManufacturingPage() {
  const c = seedCampaigns[0];
  const { showToast } = useApp();
  const [handled, setHandled] = useState<string[]>(c.review.handledRecommendations);
  const [price, setPrice] = useState(c.unitPrice);

  const forecast = computeForecast(c);
  const days = quoteDaysRemaining(c.review, new Date("2026-07-12"));
  const target = forecast.recommendedProductionQuantity;

  const tiers = c.review.quoteTiers.map((t) => ({
    tier: t,
    margin: estimateMargin(price, t.quantity, c.review),
    isTarget: target >= t.quantity && !c.review.quoteTiers.some((x) => x.quantity > t.quantity && target >= x.quantity),
  }));

  return (
    <div>
      <SectionTitle
        right={<span className={`t-tag ${REVIEW_LABEL[c.review.status].tone}`}>{REVIEW_LABEL[c.review.status].label}</span>}
      >
        DFM Review &amp; Tiered Quote — {c.review.partnerName}
      </SectionTitle>

      <p className="text-sm text-muted mb-5 max-w-3xl">
        The manufacturing partner reviews the design for manufacturability and returns a quote at several volumes. This
        is what makes a preorder a business decision rather than a wish: demand and unit cost are on the same screen.
      </p>

      {days != null && days <= 30 && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900 mb-5">
          <strong>Quote expires in {days} days</strong> ({c.review.quoteValidUntil}). Component prices move — after
          expiry every margin figure below is fiction until the quote is refreshed.
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* Tiers */}
          <div className="t-card overflow-hidden">
            <div className="px-4 py-2.5 bg-panel border-b border-line flex items-center gap-3 flex-wrap">
              <span className="font-semibold text-navy text-sm">Quote tiers</span>
              <div className="ml-auto flex items-center gap-2">
                <label className="text-xs text-muted">Retail price</label>
                <input
                  className="t-input w-24 py-1"
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                />
              </div>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-white text-xs uppercase text-muted border-b border-line">
                <tr>
                  <th className="text-left px-4 py-2">Quantity</th>
                  <th className="text-right px-4 py-2">Unit cost</th>
                  <th className="text-right px-4 py-2">Lead time</th>
                  <th className="text-right px-4 py-2">Profit / unit</th>
                  <th className="text-right px-4 py-2">Margin</th>
                  <th className="text-right px-4 py-2">Total profit</th>
                </tr>
              </thead>
              <tbody>
                {tiers.map(({ tier, margin, isTarget }) => (
                  <tr
                    key={tier.quantity}
                    className={`border-b border-line ${isTarget ? "bg-teal-light/50" : ""}`}
                  >
                    <td className="px-4 py-3 font-semibold text-navy">
                      {tier.quantity}
                      {isTarget && <span className="t-tag bg-teal text-white ml-2">recommended</span>}
                    </td>
                    <td className="px-4 py-3 text-right">${tier.unitCost.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-muted">{tier.leadTimeDays} d</td>
                    <td className={`px-4 py-3 text-right ${margin.profit < 0 ? "text-danger font-semibold" : ""}`}>
                      ${margin.profit.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`t-tag ${
                          margin.marginPct >= 35
                            ? "bg-emerald-100 text-emerald-700"
                            : margin.marginPct >= 15
                            ? "bg-amber-100 text-amber-800"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {margin.marginPct.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-navy">
                      ${(margin.profit * tier.quantity).toFixed(0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-3 bg-panel/60 text-xs text-slate leading-relaxed">
              The <strong className="text-navy">recommended</strong> tier is the one the demand forecast actually
              supports ({target} units) — not the one with the best headline margin. Producing 200 to chase a 3-point
              margin gain, when demand forecasts 100, is how hardware sellers end up with a garage full of stock.
            </div>
          </div>

          {/* Recommendations */}
          <div className="t-card overflow-hidden">
            <div className="px-4 py-2.5 bg-panel border-b border-line font-semibold text-navy text-sm">
              DFM findings — {handled.length}/{c.review.recommendations.length} handled
            </div>
            <div className="divide-y divide-line">
              {c.review.recommendations.map((r) => {
                const done = handled.includes(r);
                return (
                  <label key={r} className="flex items-start gap-3 p-3 text-sm cursor-pointer hover:bg-panel/40">
                    <input
                      type="checkbox"
                      checked={done}
                      onChange={() =>
                        setHandled((h) => (done ? h.filter((x) => x !== r) : [...h, r]))
                      }
                      className="mt-0.5 accent-teal"
                    />
                    <span className={done ? "text-muted line-through" : "text-slate"}>{r}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <aside className="space-y-5">
          <div className="t-card p-4">
            <h3 className="font-semibold text-navy text-sm mb-2">Scores</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-navy">{c.review.dfmScore}</span>
              <span className="text-sm text-muted">/ 100</span>
            </div>
            <dl className="mt-3 text-sm space-y-1">
              <Kv k="BOM risk" v={c.review.bomRisk} />
              <Kv k="Assembly feasibility" v={c.review.assemblyFeasibility} />
              <Kv k="Testability" v={c.review.testability} />
            </dl>
          </div>

          <div className="t-card p-4">
            <h3 className="font-semibold text-navy text-sm mb-2">Manufacturing package</h3>
            <ul className="text-sm space-y-1.5 text-slate">
              {["Gerber (RS-274X)", "Drill file", "Pick & place (CPL)", "BOM (with MPNs)", "Assembly drawing", "Test procedure"].map(
                (f) => (
                  <li key={f} className="flex items-center gap-2">
                    <span className="text-teal">✓</span>
                    {f}
                  </li>
                )
              )}
            </ul>
            <button className="t-btn-ghost w-full mt-3" onClick={() => showToast("Manufacturing package downloaded")}>
              Download package
            </button>
            <p className="t-hint mt-2">
              The partner receives fabrication outputs only. Editable sources are never included unless the seller
              explicitly releases them.
            </p>
          </div>

          <div className="t-card p-4">
            <h3 className="font-semibold text-navy text-sm mb-1">Public summary</h3>
            <p className="text-xs text-slate leading-relaxed">{c.review.publicSummary}</p>
            <p className="t-hint mt-2">This is what backers see. The full findings list stays private.</p>
          </div>

          <button
            className="t-btn-primary w-full"
            onClick={() => showToast("New review requested — the existing quote will be discarded")}
          >
            Request new review
          </button>
        </aside>
      </div>
    </div>
  );
}

function Kv({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted">{k}</dt>
      <dd className="text-slate capitalize font-medium">{v}</dd>
    </div>
  );
}
