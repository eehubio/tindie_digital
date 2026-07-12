"use client";

import { useMemo, useState } from "react";
import {
  logisticsProviders as seedProviders,
  defaultLogisticsConfig,
  compareProviders,
  MARKUP_HELP,
  ADJUSTMENT_HELP,
  LogisticsProvider,
  LogisticsConfig,
  MarkupMode,
  AdjustmentPolicy,
} from "@/lib/logistics";
import { SectionTitle } from "@/components/ui";
import { useApp } from "@/lib/store";

const STATUS_TONE: Record<LogisticsProvider["status"], string> = {
  active: "bg-emerald-100 text-emerald-700",
  draft: "bg-panel text-slate",
  disabled: "bg-red-100 text-red-700",
};

const KIND_LABEL: Record<LogisticsProvider["kind"], string> = {
  aggregator: "rate aggregator",
  carrier_direct: "direct carrier account",
  reseller: "reseller",
  manual: "manual lane",
};

export default function AdminLogisticsPage() {
  const { showToast } = useApp();
  const [providers, setProviders] = useState<LogisticsProvider[]>(seedProviders);
  const [cfg, setCfg] = useState<LogisticsConfig>(defaultLogisticsConfig);
  const [open, setOpen] = useState<string | null>(null);

  // Comparator inputs
  const [retail, setRetail] = useState(16.5);
  const [origin, setOrigin] = useState("US");
  const [crossBorder, setCrossBorder] = useState(true);

  const quotes = useMemo(
    () => compareProviders(retail, origin, crossBorder, cfg, providers),
    [retail, origin, crossBorder, cfg, providers]
  );
  const winner = quotes.find((q) => q.eligible);

  const patch = (id: string, p: Partial<LogisticsProvider>) =>
    setProviders((l) => l.map((x) => (x.id === id ? { ...x, ...p } : x)));
  const setC = <K extends keyof LogisticsConfig>(k: K, v: LogisticsConfig[K]) => setCfg((c) => ({ ...c, [k]: v }));

  const platformMargin = winner ? winner.sellerPays - winner.platformCost : 0;

  return (
    <div>
      <SectionTitle
        right={
          <button className="t-btn-primary" onClick={() => showToast("Logistics configuration saved")}>
            Save configuration
          </button>
        }
      >
        Logistics Providers
      </SectionTitle>

      <div className="t-card p-4 mb-5 bg-panel/60 text-sm text-slate leading-relaxed">
        <strong className="text-navy">Carriers are records, not code.</strong> Each provider below has its own
        integration depth, negotiated discount, per-label fee and origin coverage. The fulfillment screen rate-shops
        across the eligible ones and buys from the cheapest — so adding EasyPost as a failover, or switching a lane to a
        direct DHL account once volume justifies it, is a status change here rather than a deploy.
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Providers */}
      <h2 className="font-bold text-navy mb-2">Providers</h2>
      <div className="space-y-3 mb-8">
        {providers
          .slice()
          .sort((a, b) => a.priority - b.priority)
          .map((p) => {
            const isOpen = open === p.id;
            return (
              <div key={p.id} className="t-card">
                <div className="p-4 flex flex-wrap items-center gap-3">
                  <span className="w-9 h-9 rounded-md bg-navy text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {p.name.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-navy">{p.name}</h3>
                      <span className={`t-tag ${STATUS_TONE[p.status]}`}>{p.status}</span>
                      <span className="t-tag bg-panel text-slate">{KIND_LABEL[p.kind]}</span>
                      {p.connected ? (
                        <span className="t-tag bg-teal-light text-teal-dark">API connected</span>
                      ) : (
                        <span className="t-tag bg-amber-100 text-amber-800">not connected</span>
                      )}
                      <span className="text-xs text-muted">priority {p.priority}</span>
                    </div>
                    <p className="text-xs text-muted mt-1">{p.notes}</p>
                    <div className="text-xs text-muted mt-1 flex flex-wrap gap-x-3">
                      <span>
                        Discount <strong className="text-ok">−{(p.discountPct * 100).toFixed(0)}%</strong> off retail
                      </span>
                      <span>Per-label ${p.perLabelFee.toFixed(2)}</span>
                      <span>Monthly ${p.monthlyFee.toFixed(0)}</span>
                      <span>From {p.originRegions.join(", ")}</span>
                    </div>
                  </div>
                  <button className="t-btn-ghost" onClick={() => setOpen(isOpen ? null : p.id)}>
                    {isOpen ? "Close" : "Configure"}
                  </button>
                </div>

                {isOpen && (
                  <div className="border-t border-line bg-panel/50 p-4 grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="t-label">Status</label>
                      <select
                        className="t-input"
                        value={p.status}
                        onChange={(e) => patch(p.id, { status: e.target.value as LogisticsProvider["status"] })}
                      >
                        <option value="active">active — used in rate shopping</option>
                        <option value="draft">draft — configured, not live</option>
                        <option value="disabled">disabled</option>
                      </select>
                      <p className="t-hint">Draft keeps a provider ready as a failover without exposing it.</p>
                    </div>
                    <div>
                      <label className="t-label">Negotiated discount (% off retail)</label>
                      <input
                        className="t-input"
                        type="number"
                        step="1"
                        value={p.discountPct * 100}
                        onChange={(e) => patch(p.id, { discountPct: Number(e.target.value) / 100 })}
                      />
                      <p className="t-hint">Improves with volume. Re-negotiate and change one number.</p>
                    </div>
                    <div>
                      <label className="t-label">Per-label fee (USD)</label>
                      <input
                        className="t-input"
                        type="number"
                        step="0.01"
                        value={p.perLabelFee}
                        onChange={(e) => patch(p.id, { perLabelFee: Number(e.target.value) })}
                      />
                      <p className="t-hint">
                        Small, but at 5,000 labels a month a $0.05 difference is a real line item.
                      </p>
                    </div>
                    <div>
                      <label className="t-label">Routing priority</label>
                      <input
                        className="t-input"
                        type="number"
                        min={1}
                        value={p.priority}
                        onChange={(e) => patch(p.id, { priority: Number(e.target.value) })}
                      />
                      <p className="t-hint">Tie-break when two providers quote the same lane at the same price.</p>
                    </div>
                    <div>
                      <label className="t-label">Integration depth</label>
                      <select
                        className="t-input"
                        value={p.integration}
                        onChange={(e) => patch(p.id, { integration: e.target.value as LogisticsProvider["integration"] })}
                      >
                        <option value="rate_and_label_api">Rates + label purchase + tracking</option>
                        <option value="rate_api_only">Rates only — label bought elsewhere</option>
                        <option value="manual">Manual — seller pastes tracking</option>
                      </select>
                    </div>
                    <div>
                      <label className="t-label">Capabilities</label>
                      <label className="flex items-center gap-2 text-sm mt-1.5">
                        <input
                          type="checkbox"
                          checked={p.supportsCustomsDocs}
                          onChange={(e) => patch(p.id, { supportsCustomsDocs: e.target.checked })}
                        />
                        Generates commercial invoice / CN22
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={p.supportsTracking}
                          onChange={(e) => patch(p.id, { supportsTracking: e.target.checked })}
                        />
                        Tracking webhooks
                      </label>
                      <p className="t-hint">
                        A provider without customs docs is automatically excluded from cross-border lanes — not silently
                        used and then failed at the border.
                      </p>
                    </div>
                    <div className="md:col-span-3">
                      <label className="t-label">Carriers</label>
                      <div className="flex flex-wrap gap-1">
                        {p.carriers.map((c) => (
                          <span key={c} className="t-tag bg-white border border-line text-slate">
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="md:col-span-3 flex justify-end gap-2 pt-2 border-t border-line">
                      <button className="t-btn-ghost" onClick={() => setOpen(null)}>
                        Cancel
                      </button>
                      <button
                        className="t-btn-primary"
                        onClick={() => {
                          setOpen(null);
                          showToast(`${p.name} updated — rate shopping picks this up immediately`);
                        }}
                      >
                        Save provider
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {/* ---------------------------------------------------------------- */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Policies */}
        <div className="t-card p-5">
          <h2 className="font-bold text-navy mb-3">Label pricing policy</h2>

          <label className="t-label">What the seller is charged for a label</label>
          <div className="space-y-2">
            {(["at_cost", "fixed", "percent"] as MarkupMode[]).map((m) => (
              <label
                key={m}
                className={`flex items-start gap-3 border rounded-lg p-3 cursor-pointer transition ${
                  cfg.markupMode === m ? "border-teal bg-teal-light/40" : "border-line hover:border-teal/50"
                }`}
              >
                <input
                  type="radio"
                  checked={cfg.markupMode === m}
                  onChange={() => setC("markupMode", m)}
                  className="mt-1 accent-teal"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-navy text-sm">
                      {m === "at_cost" ? "At cost" : m === "fixed" ? "Fixed handling fee" : "Percentage markup"}
                    </span>
                    {m === "at_cost" && <span className="t-tag bg-emerald-100 text-emerald-700">recommended</span>}
                    {m === "percent" && <span className="t-tag bg-red-100 text-red-700">trust risk</span>}
                  </div>
                  <p className="text-xs text-muted mt-0.5">{MARKUP_HELP[m]}</p>
                </div>
              </label>
            ))}
          </div>

          {cfg.markupMode === "fixed" && (
            <div className="mt-3 max-w-[200px]">
              <label className="t-label">Handling fee (USD / label)</label>
              <input
                className="t-input"
                type="number"
                step="0.25"
                value={cfg.markupFixed}
                onChange={(e) => setC("markupFixed", Number(e.target.value))}
              />
            </div>
          )}
          {cfg.markupMode === "percent" && (
            <div className="mt-3 max-w-[200px]">
              <label className="t-label">Markup (%)</label>
              <input
                className="t-input"
                type="number"
                step="1"
                value={cfg.markupPercent * 100}
                onChange={(e) => setC("markupPercent", Number(e.target.value) / 100)}
              />
            </div>
          )}

          {cfg.markupMode !== "at_cost" && (
            <div className="mt-3 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900">
              Sellers compare the label price here against the carrier&apos;s own website within a week of joining. A
              markup is discoverable, so it must be <strong>shown as its own line</strong> at fulfillment — never folded
              into the rate. Anything else reads as a hidden fee, and hidden fees are what the seller-trust work is
              currently trying to repair.
            </div>
          )}

          <div className="mt-5 pt-4 border-t border-line">
            <h3 className="font-semibold text-navy text-sm mb-1">Post-billing adjustments</h3>
            <p className="text-xs text-muted mb-2">
              Carriers re-rate a parcel after pickup when the actual weight or dimensions differ from the declaration. It
              is not an edge case — it is a weekly occurrence at any volume. Someone pays.
            </p>
            <div className="space-y-2">
              {(["seller_absorbs", "platform_absorbs", "split"] as AdjustmentPolicy[]).map((a) => (
                <label
                  key={a}
                  className={`flex items-start gap-3 border rounded-lg p-3 cursor-pointer transition ${
                    cfg.adjustmentPolicy === a ? "border-teal bg-teal-light/40" : "border-line hover:border-teal/50"
                  }`}
                >
                  <input
                    type="radio"
                    checked={cfg.adjustmentPolicy === a}
                    onChange={() => setC("adjustmentPolicy", a)}
                    className="mt-1 accent-teal"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-navy text-sm capitalize">{a.replace(/_/g, " ")}</span>
                      {a === "split" && <span className="t-tag bg-emerald-100 text-emerald-700">recommended</span>}
                    </div>
                    <p className="text-xs text-muted mt-0.5">{ADJUSTMENT_HELP[a]}</p>
                  </div>
                </label>
              ))}
            </div>
            {cfg.adjustmentPolicy === "split" && (
              <div className="mt-3 max-w-[240px]">
                <label className="t-label">Escalate adjustments over (USD)</label>
                <input
                  className="t-input"
                  type="number"
                  step="1"
                  value={cfg.adjustmentAlertOver}
                  onChange={(e) => setC("adjustmentAlertOver", Number(e.target.value))}
                />
                <p className="t-hint">
                  Under ${cfg.adjustmentAlertOver.toFixed(2)}: platform absorbs silently. Over: charged to the seller
                  with the carrier&apos;s evidence attached.
                </p>
              </div>
            )}
          </div>

          <div className="mt-5 pt-4 border-t border-line">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={cfg.insuranceEnabled}
                onChange={(e) => setC("insuranceEnabled", e.target.checked)}
                className="mt-1 accent-teal"
              />
              <div>
                <div className="font-semibold text-navy text-sm">Offer parcel insurance</div>
                <p className="text-xs text-muted">
                  {(cfg.insurancePercent * 100).toFixed(1)}% of declared value, opt-in per shipment. A lost $99 kit is a
                  refund plus a dispute plus a lost seller — insurance is cheaper than all three.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Comparator */}
        <div className="t-card p-5">
          <h2 className="font-bold text-navy mb-3">Rate-shop simulator</h2>
          <div className="grid sm:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="t-label">Carrier retail rate</label>
              <input
                className="t-input"
                type="number"
                step="0.5"
                value={retail}
                onChange={(e) => setRetail(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="t-label">Ships from</label>
              <select className="t-input" value={origin} onChange={(e) => setOrigin(e.target.value)}>
                {["US", "EU", "GB", "CA", "AU", "CN"].map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="t-label">Lane</label>
              <select
                className="t-input"
                value={crossBorder ? "x" : "d"}
                onChange={(e) => setCrossBorder(e.target.value === "x")}
              >
                <option value="d">Domestic</option>
                <option value="x">Cross-border</option>
              </select>
            </div>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted border-b border-line">
                <th className="py-2">Provider</th>
                <th className="text-right py-2">Platform cost</th>
                <th className="text-right py-2">Seller pays</th>
                <th className="text-right py-2">Platform net</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => {
                const isWinner = q === winner;
                const net = q.sellerPays - q.platformCost;
                return (
                  <tr
                    key={q.provider.id}
                    className={`border-b border-line ${!q.eligible ? "opacity-40" : isWinner ? "bg-teal-light/50" : ""}`}
                  >
                    <td className="py-2">
                      <div className="font-medium text-navy">
                        {q.provider.name}
                        {isWinner && <span className="t-tag bg-teal text-white ml-2">selected</span>}
                      </div>
                      {!q.eligible && <div className="text-xs text-danger">{q.reason}</div>}
                    </td>
                    <td className="py-2 text-right">{q.eligible ? `$${q.platformCost.toFixed(2)}` : "—"}</td>
                    <td className="py-2 text-right font-semibold text-navy">
                      {q.eligible ? `$${q.sellerPays.toFixed(2)}` : "—"}
                    </td>
                    <td className={`py-2 text-right ${net > 0 ? "text-tag" : "text-muted"}`}>
                      {q.eligible ? `$${net.toFixed(2)}` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {winner && (
            <div className="mt-4 rounded-lg bg-panel border border-line p-3 text-sm">
              <div className="text-slate">
                Retail ${retail.toFixed(2)} → <strong className="text-navy">{winner.provider.name}</strong> at $
                {winner.platformCost.toFixed(2)} (−{(winner.provider.discountPct * 100).toFixed(0)}% + $
                {winner.provider.perLabelFee.toFixed(2)} per label). The seller pays{" "}
                <strong className="text-navy">${winner.sellerPays.toFixed(2)}</strong>, saving{" "}
                <strong className="text-ok">${(retail - winner.sellerPays).toFixed(2)}</strong> against buying the label
                themselves.
              </div>
              <div className="mt-2 pt-2 border-t border-line text-xs text-muted">
                Platform margin on this label:{" "}
                <strong className={platformMargin > 0 ? "text-tag" : "text-ok"}>${platformMargin.toFixed(2)}</strong>
                {platformMargin === 0 &&
                  " — at cost. The negotiated discount is passed straight through, which is itself the seller benefit."}
              </div>
            </div>
          )}

          <p className="t-hint mt-3">
            Note what the exclusions do: on a cross-border lane, Pirate Ship drops out despite having the best discount,
            because it cannot generate a commercial invoice. Cheapest is not eligible — that rule belongs in the routing
            engine, not in a seller&apos;s memory.
          </p>
        </div>
      </div>
    </div>
  );
}
