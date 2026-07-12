"use client";

import { useState } from "react";
import { partners as seedPartners } from "@/lib/mock";
import { ServicePartner } from "@/lib/types";
import { SectionTitle, PartnerLogo, Stars } from "@/components/ui";
import { useApp } from "@/lib/store";

const STATUS_TONE: Record<ServicePartner["status"], string> = {
  active: "bg-emerald-100 text-emerald-700",
  draft: "bg-panel text-slate",
  suspended: "bg-red-100 text-red-700",
  restricted: "bg-amber-100 text-amber-800",
};

export default function AdminPartnersPage() {
  const [list, setList] = useState<ServicePartner[]>(seedPartners);
  const [editing, setEditing] = useState<string | null>(null);
  const { showToast } = useApp();

  function patch(id: string, p: Partial<ServicePartner>) {
    setList((l) => l.map((x) => (x.id === id ? { ...x, ...p } : x)));
  }

  return (
    <div>
      <SectionTitle right={<button className="t-btn-primary">+ Add partner</button>}>
        Partner Network
      </SectionTitle>

      <p className="text-sm text-muted mb-5 max-w-3xl">
        Every partner is a record — capabilities, regions, lead times, commission model and routing status
        are stored data, never hardcoded. The routing engine reads this table directly, so adding a European
        or US partner requires no code change. Status <strong>draft</strong> keeps a partner out of buyer-facing
        routing while it is being onboarded.
      </p>

      <div className="space-y-3">
        {list.map((p) => {
          const open = editing === p.id;
          return (
            <div key={p.id} className="t-card">
              <div className="p-4 flex flex-wrap items-center gap-4">
                <PartnerLogo token={p.logoToken} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-navy">{p.name}</h3>
                    <span className={`t-tag ${STATUS_TONE[p.status]}`}>{p.status}</span>
                    {p.strategic && <span className="t-tag bg-teal-light text-teal-dark">strategic</span>}
                  </div>
                  <p className="text-sm text-muted truncate">{p.description}</p>
                  <div className="text-xs text-muted mt-1 flex flex-wrap gap-x-3 gap-y-1">
                    <span>HQ {p.headquartersCountry}</span>
                    <span>Serves {p.serviceCountries.join(", ")}</span>
                    <span>
                      Lead {p.minLeadDays}–{p.maxLeadDays}d
                    </span>
                    <span>Quote: {p.quoteMode.replace(/_/g, " ")}</span>
                    <span>
                      {p.commissionModel.replace(/_/g, " ")}
                      {p.commissionRate != null ? ` · ${(p.commissionRate * 100).toFixed(1)}%` : ""}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <Stars rating={p.rating} />
                  <div className="text-xs text-muted mt-1">
                    {p.completedOrders} orders · {(p.onTimeRate * 100).toFixed(0)}% on time ·{" "}
                    {(p.disputeRate * 100).toFixed(1)}% disputes
                  </div>
                </div>
                <button className="t-btn-ghost" onClick={() => setEditing(open ? null : p.id)}>
                  {open ? "Close" : "Configure"}
                </button>
              </div>

              {open && (
                <div className="border-t border-line bg-panel/60 p-4 grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="t-label">Routing status</label>
                    <select
                      className="t-input"
                      value={p.status}
                      onChange={(e) => patch(p.id, { status: e.target.value as ServicePartner["status"] })}
                    >
                      <option value="draft">draft — hidden from routing</option>
                      <option value="active">active</option>
                      <option value="restricted">restricted</option>
                      <option value="suspended">suspended</option>
                    </select>
                    <p className="t-hint">Draft partners can be prepared without exposure to buyers.</p>
                  </div>

                  <div>
                    <label className="t-label">Commission model</label>
                    <select
                      className="t-input"
                      value={p.commissionModel}
                      onChange={(e) =>
                        patch(p.id, { commissionModel: e.target.value as ServicePartner["commissionModel"] })
                      }
                    >
                      <option value="referral">referral (flat per lead)</option>
                      <option value="percentage">percentage of order</option>
                      <option value="fixed_fee">fixed fee</option>
                      <option value="revenue_share">revenue share</option>
                      <option value="platform_checkout">platform checkout</option>
                    </select>
                    <p className="t-hint">Each partner may settle differently — this is per-record.</p>
                  </div>

                  <div>
                    <label className="t-label">Commission rate (%)</label>
                    <input
                      className="t-input"
                      type="number"
                      step="0.5"
                      value={p.commissionRate != null ? p.commissionRate * 100 : 0}
                      onChange={(e) => patch(p.id, { commissionRate: Number(e.target.value) / 100 })}
                    />
                  </div>

                  <div>
                    <label className="t-label">Quote mode</label>
                    <select
                      className="t-input"
                      value={p.quoteMode}
                      onChange={(e) => patch(p.id, { quoteMode: e.target.value as ServicePartner["quoteMode"] })}
                    >
                      <option value="external_link">external link</option>
                      <option value="email_request">email request</option>
                      <option value="manual_quote">manual quote (in-platform)</option>
                      <option value="api_quote">API quote</option>
                      <option value="instant_checkout">instant checkout</option>
                    </select>
                    <p className="t-hint">Phase 1 partners can start on manual quotes, then upgrade to API.</p>
                  </div>

                  <div>
                    <label className="t-label">Strategic weighting</label>
                    <label className="flex items-center gap-2 text-sm mt-2">
                      <input
                        type="checkbox"
                        checked={p.strategic}
                        onChange={(e) => patch(p.id, { strategic: e.target.checked })}
                      />
                      Boost in routing score (5% weight)
                    </label>
                    <p className="t-hint">
                      Bounded on purpose — strategic partners cannot outrank a partner that lacks the required
                      capability or region.
                    </p>
                  </div>

                  <div>
                    <label className="t-label">Capabilities</label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {p.partnerTypes.map((t) => (
                        <span key={t} className="t-tag bg-panel text-slate">
                          {t.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="md:col-span-3 flex justify-end gap-2 pt-2 border-t border-line">
                    <button className="t-btn-ghost" onClick={() => setEditing(null)}>
                      Cancel
                    </button>
                    <button
                      className="t-btn-primary"
                      onClick={() => {
                        setEditing(null);
                        showToast(`${p.name} updated — routing engine picks this up immediately`);
                      }}
                    >
                      Save partner
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
