"use client";

import { getCampaign } from "@/lib/campaigns";
import {
  CAMPAIGN_TYPE_LABEL,
  CAMPAIGN_TYPE_RISK,
  MATURITY_LABEL,
  REVIEW_LABEL,
} from "@/lib/build";
import { useApp } from "@/lib/store";
import { notFound } from "next/navigation";
import { useState } from "react";

export default function CampaignPage({ params }: { params: { slug: string } }) {
  const c = getCampaign(params.slug);
  const { showToast } = useApp();
  const [variant, setVariant] = useState(0);
  const [qty, setQty] = useState(1);

  if (!c) return notFound();

  const pct = Math.min(100, (c.reservedUnits / c.minimumUnits) * 100);
  const daysLeft = Math.ceil((new Date(c.campaignEnd).getTime() - new Date("2026-07-12").getTime()) / 86400000);
  const v = c.variants[variant];
  const risk = CAMPAIGN_TYPE_RISK[c.campaignType];
  const publicMilestones = c.milestones.filter((m) => m.visibility === "public");

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-6 items-start">
      <div>
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span className="t-tag bg-cta text-white">Preorder · {CAMPAIGN_TYPE_LABEL[c.campaignType]}</span>
          <span className="t-tag bg-panel text-slate">{MATURITY_LABEL[c.maturityLevel]}</span>
          <span className={`t-tag ${REVIEW_LABEL[c.review.status].tone}`}>
            {c.review.partnerName} · DFM {c.review.dfmScore}/100
          </span>
        </div>
        <h1 className="text-2xl font-bold text-navy">{c.title}</h1>
        <p className="text-muted mt-1">{c.subtitle}</p>
        <p className="text-sm text-muted mt-1">by {c.ownerName}</p>

        <div className="mt-4 aspect-[16/9] rounded-lg bg-gradient-to-br from-navy via-slate to-teal-dark flex items-center justify-center text-white/40 text-sm">
          product image
        </div>

        {/* The risk statement, up front */}
        <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h2 className="font-bold text-amber-900 text-sm mb-1">⚠ This is a preorder, not a product in stock</h2>
          <p className="text-sm text-amber-900/90 leading-relaxed">{c.publicRiskSummary}</p>
          <p className="text-xs text-amber-900/80 mt-2">{c.refundPolicy}</p>
        </div>

        <div className="mt-6">
          <h2 className="font-bold text-navy mb-2">About</h2>
          <p className="text-slate leading-relaxed">{c.description}</p>
        </div>

        <div className="mt-6">
          <h2 className="font-bold text-navy mb-2">Specs</h2>
          <div className="t-card overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {c.specs.map((s) => (
                  <tr key={s.label} className="border-b border-line last:border-0">
                    <td className="px-4 py-2 text-muted w-40">{s.label}</td>
                    <td className="px-4 py-2 text-navy font-medium">{s.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Manufacturing transparency — the thing crowdfunding platforms never show */}
        <div className="mt-6">
          <h2 className="font-bold text-navy mb-2">Manufacturing review</h2>
          <div className="t-card p-4">
            <p className="text-sm text-slate leading-relaxed">{c.review.publicSummary}</p>
            <p className="text-xs text-muted mt-2">
              An independent partner has reviewed this design for manufacturability and quoted the production run. That
              does not guarantee delivery — but it does mean the seller knows what the board costs to build before
              taking your money.
            </p>
          </div>
        </div>

        <div className="mt-6">
          <h2 className="font-bold text-navy mb-2">Progress</h2>
          <div className="t-card p-4 space-y-3">
            {publicMilestones.map((m) => (
              <div key={m.id} className="flex items-center gap-3">
                <span
                  className={`w-3 h-3 rounded-full shrink-0 ${
                    m.status === "completed" ? "bg-teal" : m.status === "in_progress" ? "bg-tag" : "bg-line"
                  }`}
                />
                <span className={`text-sm flex-1 ${m.status === "completed" ? "text-muted" : "text-navy font-medium"}`}>
                  {m.title}
                </span>
                {m.status === "in_progress" && (
                  <div className="w-24 h-1.5 bg-line rounded-full overflow-hidden">
                    <div className="h-full bg-tag" style={{ width: `${m.progress}%` }} />
                  </div>
                )}
                <span className="text-xs text-muted w-20 text-right">{m.targetDate}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reserve box */}
      <aside className="lg:sticky lg:top-4 border border-line rounded-lg bg-white shadow-card p-5">
        <div className="text-3xl font-bold text-navy">
          {c.reservedUnits}
          <span className="text-base text-muted"> / {c.minimumUnits}</span>
        </div>
        <div className="text-sm text-muted">units reserved · {daysLeft} days left</div>
        <div className="h-2.5 rounded-full bg-line overflow-hidden mt-2">
          <div className="h-full bg-teal" style={{ width: `${pct}%` }} />
        </div>

        <div className={`mt-3 rounded-md px-3 py-2 text-xs font-semibold ${risk.tone}`}>{risk.label}</div>

        <div className="mt-4">
          <label className="t-label">Choose a version</label>
          <div className="space-y-2">
            {c.variants.map((x, i) => (
              <label
                key={x.id}
                className={`flex items-center gap-2 border rounded-md px-3 py-2 text-sm cursor-pointer ${
                  i === variant ? "border-teal bg-teal-light/50" : "border-line"
                }`}
              >
                <input type="radio" checked={i === variant} onChange={() => setVariant(i)} className="accent-teal" />
                <span className="flex-1">
                  <span className="text-navy font-medium">{x.name}</span>
                  <span className="block text-xs text-muted">{x.reservedQuantity} reserved</span>
                </span>
                <span className="font-bold text-navy">${x.unitPrice}</span>
              </label>
            ))}
          </div>
        </div>

        {c.earlyBirdPrice && (
          <div className="mt-3 rounded-md bg-teal-light border border-teal/30 px-3 py-2 text-xs text-teal-dark">
            <strong>Early bird ${c.earlyBirdPrice}</strong> for the first {c.earlyBirdQuantity} backers —{" "}
            {Math.max(0, (c.earlyBirdQuantity ?? 0) - c.reservedUnits)} left.
          </div>
        )}

        <div className="mt-3">
          <label className="t-label">Quantity</label>
          <input className="t-input" type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value))} />
        </div>

        <div className="mt-3 flex justify-between font-bold text-navy">
          <span>Total</span>
          <span>${(v.unitPrice * qty).toFixed(2)}</span>
        </div>

        <button
          className="t-btn-cta w-full mt-3"
          onClick={() => showToast("Card authorised — you will not be charged unless the goal is reached")}
        >
          Reserve {qty} unit{qty > 1 ? "s" : ""}
        </button>

        <p className="text-[11px] text-muted mt-3 leading-relaxed">
          Your card is authorised now and charged only if {c.minimumUnits} units are reserved by {c.campaignEnd}. If the
          goal is missed, the authorisation is released and you are never charged. Estimated shipping:{" "}
          <strong className="text-navy">{c.estimatedShipDate}</strong>.
        </p>
      </aside>
    </div>
  );
}
