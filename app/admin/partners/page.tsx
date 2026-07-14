"use client";

import { useState } from "react";
import { ServicePartner } from "@/lib/types";
import { SectionTitle, PartnerLogo, Stars } from "@/components/ui";
import { useApp } from "@/lib/store";
import { isBuyerVisible } from "@/lib/engine";

const STATUS_TONE: Record<ServicePartner["status"], string> = {
  active: "bg-emerald-100 text-emerald-700",
  draft: "bg-panel text-slate",
  suspended: "bg-red-100 text-red-700",
  restricted: "bg-amber-100 text-amber-800",
};

export default function AdminPartnersPage() {
  const { partnerList: list, patchPartner, addPartner, showToast } = useApp();
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", country: "US", types: "pcb_manufacturer" });

  function patch(id: string, p: Partial<ServicePartner>) {
    patchPartner(id, p);
  }

  function createPartner() {
    const id = "pt_" + form.name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 12) + Math.random().toString(36).slice(2, 4);
    addPartner({
      id,
      slug: id,
      name: form.name,
      logoToken: form.name.slice(0, 2).toUpperCase(),
      description: "Newly onboarded — complete profile before activation.",
      partnerTypes: [form.types as ServicePartner["partnerTypes"][number]],
      serviceCountries: [form.country],
      headquartersCountry: form.country,
      shippingCountries: [form.country],
      languages: ["en"],
      quoteMode: "manual_quote",
      // Everything starts SAFE: draft + nothing signed → buyers cannot see it
      // until every readiness condition below is flipped by a human.
      status: "draft",
      maxLayers: 4,
      materials: ["FR-4"],
      minTraceMm: 0.15,
      minQty: 1,
      maxQty: 500,
      currencies: ["USD"],
      packages: ["THT", "0402"],
      contractStatus: "none",
      ndaStatus: "none",
      dataProcessingAgreement: "none",
      payoutReady: false,
      apiHealth: "not_integrated",
      acceptingNewOrders: false,
      capacityStatus: "normal",
      lastCapabilityVerifiedAt: new Date().toISOString().slice(0, 10),
      featured: false,
      strategic: false,
      rating: 0,
      completedOrders: 0,
      onTimeRate: 0,
      disputeRate: 0,
      minLeadDays: 7,
      maxLeadDays: 21,
      fromPricePcb: 20,
      commissionModel: "revenue_share",
      commissionRate: 0.08,
    });
    setAdding(false);
    setForm({ name: "", country: "US", types: "pcb_manufacturer" });
  }

  return (
    <div>
      <SectionTitle right={<button className="t-btn-primary" onClick={() => setAdding((v) => !v)}>+ Add partner</button>}>
        Partner Network
      </SectionTitle>

      {adding && (
        <div className="t-card p-4 mb-5 border-teal/40">
          <h3 className="font-semibold text-navy mb-3">New partner (created as draft)</h3>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="t-label">Company name</label>
              <input className="t-input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Aisler B.V." />
            </div>
            <div>
              <label className="t-label">HQ country</label>
              <select className="t-input" value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}>
                {["US", "CN", "DE", "NL", "GB", "JP", "IN"].map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="t-label">Primary service</label>
              <select className="t-input" value={form.types} onChange={(e) => setForm((f) => ({ ...f, types: e.target.value }))}>
                <option value="pcb_manufacturer">PCB fabrication</option>
                <option value="pcb_assembly">PCB assembly</option>
                <option value="design_review">Design review</option>
                <option value="component_sourcing">Component sourcing</option>
                <option value="testing_service">Testing</option>
                <option value="fulfillment">Fulfillment</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button className="t-btn-ghost" onClick={() => setAdding(false)}>Cancel</button>
            <button className="t-btn-primary disabled:opacity-40" disabled={!form.name.trim()} onClick={createPartner}>
              Create draft partner
            </button>
          </div>
          <p className="t-hint mt-2">
            New partners are born <strong>draft</strong> with nothing signed — the buyer-visible badge stays red until
            contract, NDA, DPA, payouts and integration are each flipped by a human. There is no shortcut through that
            list, on purpose.
          </p>
        </div>
      )}

      <p className="text-sm text-muted mb-5 max-w-3xl">
        Every partner is a record — capabilities, regions, lead times, commission model and routing status are stored
        data, never hardcoded. But <strong>&ldquo;active&rdquo; in a database is not the same thing as &ldquo;safe to
        send a paying buyer to&rdquo;</strong>: a partner is only buyer-visible when the contract, NDA and DPA are
        signed, payouts work, the integration is up, and they are actually accepting orders with capacity to spare. The
        badge below is computed from all of those, not from the status field alone.
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
                    {isBuyerVisible(p) ? (
                      <span className="t-tag bg-emerald-100 text-emerald-700">✓ buyer-visible</span>
                    ) : (
                      <span className="t-tag bg-red-100 text-red-700">not shown to buyers</span>
                    )}
                    {p.featured && (
                      <span className="t-tag bg-tag text-white" title="Paid placement, labelled as Sponsored. Never a ranking boost.">
                        featured / sponsored
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {(
                      [
                        [p.contractStatus === "signed", "contract"],
                        [p.ndaStatus === "signed", "NDA"],
                        [p.dataProcessingAgreement === "signed", "DPA"],
                        [p.payoutReady, "payouts"],
                        [p.apiHealth !== "down" && p.apiHealth !== "not_integrated", "API"],
                        [p.acceptingNewOrders, "accepting orders"],
                        [p.capacityStatus !== "full", `capacity: ${p.capacityStatus}`],
                      ] as [boolean, string][]
                    ).map(([ok, label]) => (
                      <span
                        key={label}
                        className={`t-tag ${ok ? "bg-panel text-slate" : "bg-red-100 text-red-700"}`}
                      >
                        {ok ? "✓" : "✕"} {label}
                      </span>
                    ))}
                    <span className="t-tag bg-panel text-slate">
                      verified {p.lastCapabilityVerifiedAt}
                    </span>
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
                    <label className="t-label">Commercial relationship</label>
                    <label className="flex items-center gap-2 text-sm mt-2">
                      <input
                        type="checkbox"
                        checked={p.featured}
                        onChange={(e) => patch(p.id, { featured: e.target.checked })}
                      />
                      Featured placement (shown to buyers as <strong>Sponsored</strong>)
                    </label>
                    <p className="t-hint">
                      This buys a <em>labelled</em> slot. It does <strong>not</strong> affect the routing score — the old
                      engine gave strategic partners 5% of the match score, which dressed a commercial relationship up as
                      a technical fit. A ranking that quietly favours whoever pays us is an advertisement wearing a
                      routing score. It has been removed.
                    </p>
                  </div>

                  <div>
                    <label className="t-label">Accepting new orders</label>
                    <select
                      className="t-input"
                      value={p.acceptingNewOrders ? "y" : "n"}
                      onChange={(e) => patch(p.id, { acceptingNewOrders: e.target.value === "y" })}
                    >
                      <option value="y">Yes</option>
                      <option value="n">No — paused</option>
                    </select>
                    <p className="t-hint">A paused partner disappears from buyer routing immediately.</p>
                  </div>

                  <div>
                    <label className="t-label">Capacity</label>
                    <select
                      className="t-input"
                      value={p.capacityStatus}
                      onChange={(e) => patch(p.id, { capacityStatus: e.target.value as ServicePartner["capacityStatus"] })}
                    >
                      <option value="normal">Normal</option>
                      <option value="constrained">Constrained — flagged to buyers</option>
                      <option value="full">Full — excluded from routing</option>
                    </select>
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
