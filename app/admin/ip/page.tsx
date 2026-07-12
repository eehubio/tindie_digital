"use client";

import { useState } from "react";
import { seedIpComplaints } from "@/lib/mock";
import { IpComplaint } from "@/lib/types";
import { SectionTitle } from "@/components/ui";
import { useApp } from "@/lib/store";

const TONE: Record<IpComplaint["status"], string> = {
  submitted: "bg-panel text-slate",
  under_review: "bg-amber-100 text-amber-800",
  listing_restricted: "bg-violet-100 text-violet-700",
  counter_filed: "bg-blue-100 text-blue-700",
  removed: "bg-red-100 text-red-700",
  dismissed: "bg-emerald-100 text-emerald-700",
};

const PROTECTIONS = [
  {
    title: "Seller originality declaration",
    body: "Publishing requires an explicit declaration of ownership or a compatible upstream license, recorded with a timestamp and account identity.",
  },
  {
    title: "Scoped file release",
    body: "Buyers receive only the license tier they bought; manufacturing partners receive only fabrication outputs unless the seller opts in to full sources.",
  },
  {
    title: "Watermarking & fingerprinting",
    body: "Delivered packages carry a per-entitlement fingerprint, so a leaked file can be traced back to the buying account.",
  },
  {
    title: "Partner confidentiality",
    body: "Every partner in the network is bound to use design files strictly for the routed order, with no derivative reuse.",
  },
  {
    title: "Notice & counter-notice",
    body: "Rights holders file a claim; the listing can be restricted pending review; the seller may counter-file with evidence.",
  },
];

export default function AdminIpPage() {
  const [list, setList] = useState<IpComplaint[]>(seedIpComplaints);
  const { showToast } = useApp();

  function setStatus(id: string, status: IpComplaint["status"]) {
    setList((l) => l.map((c) => (c.id === id ? { ...c, status } : c)));
    showToast(`${id} → ${status.replace(/_/g, " ")}`);
  }

  return (
    <div>
      <SectionTitle>IP Protection &amp; Complaints</SectionTitle>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          {list.map((c) => (
            <div key={c.id} className="t-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-muted">{c.id}</span>
                <span className={`t-tag ${TONE[c.status]}`}>{c.status.replace(/_/g, " ")}</span>
                <span className="text-sm text-muted ml-auto">filed {c.filedAt}</span>
              </div>
              <h3 className="font-bold text-navy mt-1">{c.productTitle}</h3>
              <dl className="mt-2 text-sm grid sm:grid-cols-2 gap-x-6 gap-y-1">
                <div className="flex gap-2">
                  <dt className="text-muted w-28 shrink-0">Complainant</dt>
                  <dd>{c.complainant}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-muted w-28 shrink-0">Rights holder</dt>
                  <dd>{c.rightsHolder}</dd>
                </div>
                <div className="flex gap-2 sm:col-span-2">
                  <dt className="text-muted w-28 shrink-0">Basis</dt>
                  <dd>{c.basis}</dd>
                </div>
              </dl>

              <div className="mt-4 pt-3 border-t border-line flex flex-wrap gap-2">
                <button className="t-btn-primary" onClick={() => setStatus(c.id, "listing_restricted")}>
                  Restrict listing pending review
                </button>
                <button className="t-btn-ghost" onClick={() => setStatus(c.id, "counter_filed")}>
                  Log seller counter-notice
                </button>
                <button className="t-btn-ghost" onClick={() => setStatus(c.id, "removed")}>
                  Remove listing
                </button>
                <button className="t-btn-ghost" onClick={() => setStatus(c.id, "dismissed")}>
                  Dismiss claim
                </button>
              </div>
            </div>
          ))}

          <div className="t-card p-4 border-dashed">
            <h3 className="font-semibold text-navy text-sm">File a new complaint</h3>
            <div className="grid sm:grid-cols-2 gap-3 mt-2">
              <div>
                <label className="t-label">Listing</label>
                <input className="t-input" placeholder="Design URL or ID" />
              </div>
              <div>
                <label className="t-label">Rights holder</label>
                <input className="t-input" placeholder="Company or individual" />
              </div>
              <div className="sm:col-span-2">
                <label className="t-label">Basis of claim</label>
                <textarea className="t-input" rows={2} placeholder="Describe the infringement and your rights…" />
                <p className="t-hint">
                  Sworn statement required. Bad-faith complaints are penalised the same way bad-faith listings are.
                </p>
              </div>
            </div>
            <button className="t-btn-cta mt-3" onClick={() => showToast("Complaint submitted for review")}>
              Submit complaint
            </button>
          </div>
        </div>

        <aside className="t-card p-5 h-fit">
          <h3 className="font-bold text-navy mb-3">How IP is protected</h3>
          <ul className="space-y-4">
            {PROTECTIONS.map((p) => (
              <li key={p.title}>
                <div className="text-sm font-semibold text-navy">{p.title}</div>
                <p className="text-xs text-muted mt-0.5">{p.body}</p>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted mt-5 pt-4 border-t border-line">
            No technical measure makes a design file uncopyable once delivered. The realistic goal is{" "}
            <strong className="text-navy">traceability plus a credible enforcement path</strong>, which is what raises
            the cost of infringement enough to make a legitimate purchase the rational choice.
          </p>
        </aside>
      </div>
    </div>
  );
}
