"use client";

import Link from "next/link";
import { seedCampaigns } from "@/lib/campaigns";
import {
  STATUS_LABEL,
  REVIEW_LABEL,
  READINESS_LABEL,
  CAMPAIGN_TYPE_LABEL,
  CAMPAIGN_TYPE_RISK,
  MATURITY_LABEL,
  computeForecast,
  quoteDaysRemaining,
  buildCampaignPayload,
  ReadinessState,
} from "@/lib/build";
import { SectionTitle } from "@/components/ui";
import { useState } from "react";

export default function BuildDashboard() {
  const c = seedCampaigns[0];
  const forecast = computeForecast(c);
  const days = quoteDaysRemaining(c.review, new Date("2026-07-12"));
  const pct = Math.min(100, (c.reservedUnits / c.minimumUnits) * 100);
  const [showJson, setShowJson] = useState(false);

  const readinessRows = Object.entries(c.readiness) as [string, ReadinessState][];
  const daysLeft = Math.ceil((new Date(c.campaignEnd).getTime() - new Date("2026-07-12").getTime()) / 86400000);

  return (
    <div>
      <SectionTitle
        right={
          <div className="flex items-center gap-2">
            <span className={`t-tag ${STATUS_LABEL[c.status].tone}`}>{STATUS_LABEL[c.status].label}</span>
            <Link href={`/campaign/${c.slug}`} className="t-btn-ghost text-sm">
              View buyer page →
            </Link>
          </div>
        }
      >
        {c.title}
      </SectionTitle>

      <p className="text-sm text-muted mb-5 max-w-3xl">
        {c.subtitle} · {CAMPAIGN_TYPE_LABEL[c.campaignType]} ·{" "}
        <span className={`t-tag ${CAMPAIGN_TYPE_RISK[c.campaignType].tone}`}>
          {CAMPAIGN_TYPE_RISK[c.campaignType].label}
        </span>{" "}
        · {MATURITY_LABEL[c.maturityLevel]}
      </p>

      {/* Goal */}
      <div className="t-card p-5 mb-5">
        <div className="flex items-end justify-between mb-2 flex-wrap gap-2">
          <div>
            <div className="text-3xl font-bold text-navy">
              {c.reservedUnits}
              <span className="text-lg text-muted"> / {c.minimumUnits} units</span>
            </div>
            <div className="text-sm text-muted">
              ${(c.reservedUnits * c.unitPrice).toLocaleString()} reserved · {daysLeft} days left
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-teal">{pct.toFixed(0)}%</div>
            <div className="text-xs text-muted">of minimum goal</div>
          </div>
        </div>
        <div className="h-3 rounded-full bg-line overflow-hidden">
          <div className="h-full bg-teal transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-muted mt-2">
          Nothing has been captured. Cards are authorised and only charged if {c.minimumUnits} units are reached by{" "}
          {c.campaignEnd}.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* Forecast */}
          <Card
            title="Demand forecast"
            right={<span className="t-tag bg-panel text-slate">{forecast.confidence}% confidence</span>}
          >
            <div className="grid grid-cols-3 gap-3 mb-3">
              <Tile label="Conservative" value={`${forecast.conservativeUnits}`} />
              <Tile label="Expected" value={`${forecast.expectedUnits}`} tone="text-teal" />
              <Tile label="Optimistic" value={`${forecast.optimisticUnits}`} />
            </div>
            <div className="rounded-lg bg-teal-light/50 border border-teal/30 p-3">
              <div className="text-sm font-semibold text-teal-dark">
                Recommended production run: {forecast.recommendedProductionQuantity} units
              </div>
              <ul className="text-xs text-teal-dark/80 mt-1 space-y-0.5">
                {forecast.notes.map((n) => (
                  <li key={n}>· {n}</li>
                ))}
              </ul>
            </div>
            <Link href="/seller/build/orders" className="text-link text-sm hover:underline mt-3 inline-block">
              Orders &amp; demand detail →
            </Link>
          </Card>

          {/* Milestones */}
          <Card title="Milestones">
            <div className="space-y-2">
              {c.milestones.map((m) => (
                <div key={m.id} className="flex items-center gap-3 text-sm">
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      m.status === "completed" ? "bg-teal" : m.status === "in_progress" ? "bg-tag" : "bg-line"
                    }`}
                  />
                  <span className={m.status === "completed" ? "text-muted line-through" : "text-navy"}>{m.title}</span>
                  <span className="t-tag bg-panel text-slate text-[10px]">{m.visibility}</span>
                  <span className="ml-auto text-xs text-muted">{m.targetDate}</span>
                </div>
              ))}
            </div>
            <p className="t-hint mt-3">
              Public milestones appear on the buyer&apos;s campaign page. Internal ones do not — a backer needs to know
              the schedule, not your SMT queue.
            </p>
          </Card>
        </div>

        <div className="space-y-5">
          {/* Partner review */}
          <Card title="Manufacturing review">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`t-tag ${REVIEW_LABEL[c.review.status].tone}`}>{REVIEW_LABEL[c.review.status].label}</span>
              <span className="text-sm text-muted">{c.review.partnerName}</span>
            </div>
            {c.review.dfmScore != null && (
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-navy">{c.review.dfmScore}</span>
                <span className="text-sm text-muted">/ 100 DFM score</span>
              </div>
            )}
            <dl className="mt-2 text-xs space-y-1">
              <Kv k="BOM risk" v={c.review.bomRisk} />
              <Kv k="Assembly" v={c.review.assemblyFeasibility} />
              <Kv k="Testability" v={c.review.testability} />
            </dl>
            {days != null && (
              <div
                className={`mt-3 rounded-md px-2.5 py-2 text-xs ${
                  days <= 14 ? "bg-amber-50 border border-amber-200 text-amber-900" : "bg-panel text-slate"
                }`}
              >
                Quote valid for <strong>{days} more days</strong> (until {c.review.quoteValidUntil}). Component prices
                move; a stale quote is a wrong margin.
              </div>
            )}
            <Link href="/seller/build/manufacturing" className="text-link text-sm hover:underline mt-3 inline-block">
              DFM report &amp; tiered quotes →
            </Link>
          </Card>

          {/* Readiness */}
          <Card title="Engineering readiness">
            <div className="space-y-1.5">
              {readinessRows.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between text-sm">
                  <span className="text-slate capitalize">{k.replace(/([A-Z])/g, " $1")}</span>
                  <span className={`t-tag ${READINESS_LABEL[v].tone}`}>{READINESS_LABEL[v].label}</span>
                </div>
              ))}
            </div>
            <p className="t-hint mt-2">Pulled from the linked ezPLM project ({c.ezplmProjectId}).</p>
          </Card>

          <Card title="Activity">
            <ul className="space-y-2 text-sm">
              {c.activity.map((a) => (
                <li key={a.at + a.text} className="flex gap-2">
                  <span className="text-xs text-muted font-mono shrink-0 w-16">{a.at}</span>
                  <span className="text-slate">{a.text}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      {/* The contract */}
      <div className="mt-6 t-card p-4">
        <button className="text-sm font-semibold text-link hover:underline" onClick={() => setShowJson((v) => !v)}>
          {showJson ? "Hide" : "Show"} Campaign JSON — the ezPLM ↔ Tindie contract
        </button>
        {showJson && (
          <>
            <pre className="mt-3 bg-navy text-white/90 rounded-lg p-4 text-[11px] overflow-x-auto leading-relaxed">
              {JSON.stringify(buildCampaignPayload(c), null, 2)}
            </pre>
            <p className="t-hint mt-2">
              This payload is unchanged from the ezplm_prebuild module. ezPLM emits it; Tindie consumes it. Keeping one
              contract is what lets the design tool and the marketplace ship independently.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function Card({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="border border-line rounded-lg bg-white overflow-hidden">
      <div className="px-4 py-2.5 bg-panel border-b border-line flex items-center">
        <span className="font-semibold text-navy text-sm">{title}</span>
        <span className="ml-auto">{right}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
function Tile({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="border border-line rounded-lg p-3 text-center">
      <div className={`text-2xl font-bold ${tone ?? "text-navy"}`}>{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}
function Kv({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted">{k}</dt>
      <dd className="text-slate capitalize">{v}</dd>
    </div>
  );
}
