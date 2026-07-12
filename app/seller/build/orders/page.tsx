"use client";

import { seedCampaigns } from "@/lib/campaigns";
import { computeForecast, trendPoints, countryBreakdown, estimateMargin } from "@/lib/build";
import { SectionTitle } from "@/components/ui";

export default function BuildOrdersPage() {
  const c = seedCampaigns[0];
  const forecast = computeForecast(c);
  const trend = trendPoints(c);
  const countries = countryBreakdown(c);
  const margin = estimateMargin(c.unitPrice, forecast.recommendedProductionQuantity, c.review);

  const revenue = c.orders.reduce((s, o) => s + o.amount, 0);
  const maxY = Math.max(c.minimumUnits, ...trend.map((t) => t.cumulativeUnits)) * 1.15;

  const W = 640;
  const H = 200;
  const px = (i: number) => (i / Math.max(1, trend.length - 1)) * (W - 40) + 30;
  const py = (v: number) => H - 25 - (v / maxY) * (H - 45);
  const path = trend.map((t, i) => `${i === 0 ? "M" : "L"}${px(i)},${py(t.cumulativeUnits)}`).join(" ");
  const goalY = py(c.minimumUnits);

  const variants = c.variants.map((v) => ({
    ...v,
    units: c.orders.filter((o) => o.variantName === v.name).reduce((s, o) => s + o.units, 0),
  }));
  const totalUnits = variants.reduce((s, v) => s + v.units, 0) || 1;

  return (
    <div>
      <SectionTitle right={<span className="text-sm text-muted">{c.orders.length} orders</span>}>
        Orders &amp; Demand Forecast
      </SectionTitle>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <Stat label="Units reserved" value={`${c.reservedUnits}`} sub={`goal ${c.minimumUnits}`} />
        <Stat label="Reserved value" value={`$${revenue.toLocaleString()}`} sub="not yet captured" />
        <Stat label="Orders" value={`${c.orders.length}`} sub={`${countries.length} countries`} />
        <Stat
          label="Recommended run"
          value={`${forecast.recommendedProductionQuantity}`}
          sub={`${forecast.confidence}% confidence`}
          tone="text-teal"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* Trend */}
          <div className="t-card p-5">
            <h3 className="font-semibold text-navy text-sm mb-3">Cumulative preorders</h3>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Cumulative preorder trend">
              {/* goal line */}
              <line x1={30} y1={goalY} x2={W - 10} y2={goalY} stroke="#EE7752" strokeDasharray="4 4" strokeWidth={1.5} />
              <text x={W - 12} y={goalY - 6} textAnchor="end" fontSize="10" fill="#EE7752">
                goal {c.minimumUnits}
              </text>
              {/* area + line */}
              <path d={`${path} L${px(trend.length - 1)},${H - 25} L${px(0)},${H - 25} Z`} fill="#38B2AC" opacity="0.12" />
              <path d={path} fill="none" stroke="#38B2AC" strokeWidth={2.5} strokeLinejoin="round" />
              {trend.map((t, i) => (
                <circle key={t.date} cx={px(i)} cy={py(t.cumulativeUnits)} r={3} fill="#38B2AC" />
              ))}
              {/* axis */}
              <line x1={30} y1={H - 25} x2={W - 10} y2={H - 25} stroke="#E0E6ED" />
              <text x={30} y={H - 8} fontSize="9" fill="#8492A6">
                {trend[0]?.date}
              </text>
              <text x={W - 10} y={H - 8} textAnchor="end" fontSize="9" fill="#8492A6">
                {trend[trend.length - 1]?.date}
              </text>
            </svg>
            <p className="t-hint">
              The forecast extrapolates from the elapsed share of the campaign window, then applies a stage correction
              and an 8% spare/scrap allowance. It is a projection, not a promise — which is why the conservative figure
              is shown next to it.
            </p>
          </div>

          {/* Orders table */}
          <div className="t-card overflow-hidden">
            <div className="px-4 py-2.5 bg-panel border-b border-line font-semibold text-navy text-sm">Recent orders</div>
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted border-b border-line">
                <tr>
                  <th className="text-left px-4 py-2">Date</th>
                  <th className="text-left px-4 py-2">Country</th>
                  <th className="text-left px-4 py-2">Variant</th>
                  <th className="text-right px-4 py-2">Units</th>
                  <th className="text-right px-4 py-2">Value</th>
                  <th className="text-right px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {[...c.orders].reverse().map((o) => (
                  <tr key={o.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-2 text-muted">{o.date}</td>
                    <td className="px-4 py-2">{o.country}</td>
                    <td className="px-4 py-2 text-slate">{o.variantName}</td>
                    <td className="px-4 py-2 text-right">{o.units}</td>
                    <td className="px-4 py-2 text-right">${o.amount}</td>
                    <td className="px-4 py-2 text-right">
                      <span className="t-tag bg-amber-100 text-amber-800">{o.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="space-y-5">
          <div className="t-card p-4">
            <h3 className="font-semibold text-navy text-sm mb-3">Forecast</h3>
            <div className="space-y-2">
              <Bar label="Conservative" v={forecast.conservativeUnits} max={forecast.optimisticUnits} tone="bg-muted" />
              <Bar label="Expected" v={forecast.expectedUnits} max={forecast.optimisticUnits} tone="bg-teal" />
              <Bar label="Optimistic" v={forecast.optimisticUnits} max={forecast.optimisticUnits} tone="bg-teal/40" />
            </div>
            <div className="mt-3 rounded-lg bg-teal-light/50 border border-teal/30 p-3 text-sm">
              <div className="font-semibold text-teal-dark">
                Produce {forecast.recommendedProductionQuantity} units
              </div>
              <div className="text-xs text-teal-dark/80 mt-1">
                At that volume the {c.review.partnerName} tier is ${margin.manufacturingCost.toFixed(2)}/unit →{" "}
                <strong>{margin.marginPct.toFixed(1)}% margin</strong>, total profit ~$
                {(margin.profit * forecast.recommendedProductionQuantity).toFixed(0)}.
              </div>
            </div>
          </div>

          <div className="t-card p-4">
            <h3 className="font-semibold text-navy text-sm mb-2">By country</h3>
            {countries.map((k) => (
              <div key={k.country} className="flex items-center gap-2 text-sm py-1">
                <span className="w-8 font-mono text-muted">{k.country}</span>
                <div className="flex-1 h-2 bg-line rounded-full overflow-hidden">
                  <div className="h-full bg-teal" style={{ width: `${(k.units / c.reservedUnits) * 100}%` }} />
                </div>
                <span className="w-8 text-right text-navy font-semibold">{k.units}</span>
              </div>
            ))}
            <p className="t-hint mt-2">
              Concentration matters: a run that is 40% EU changes the shipping profile and the IOSS decision.
            </p>
          </div>

          <div className="t-card p-4">
            <h3 className="font-semibold text-navy text-sm mb-2">By variant</h3>
            {variants.map((v) => (
              <div key={v.id} className="py-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate">{v.name}</span>
                  <span className="font-semibold text-navy">{v.units}</span>
                </div>
                <div className="h-2 bg-line rounded-full overflow-hidden mt-1">
                  <div className="h-full bg-cta" style={{ width: `${(v.units / totalUnits) * 100}%` }} />
                </div>
                <div className="text-xs text-muted mt-0.5">
                  {v.sku} · ${v.unitPrice}
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="t-card p-4">
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${tone ?? "text-navy"}`}>{value}</div>
      {sub && <div className="text-xs text-muted mt-1">{sub}</div>}
    </div>
  );
}

function Bar({ label, v, max, tone }: { label: string; v: number; max: number; tone: string }) {
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className="text-slate">{label}</span>
        <span className="font-semibold text-navy">{v}</span>
      </div>
      <div className="h-2 bg-line rounded-full overflow-hidden mt-1">
        <div className={`h-full ${tone}`} style={{ width: `${(v / max) * 100}%` }} />
      </div>
    </div>
  );
}
