"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";
import { SectionTitle } from "@/components/ui";
import { Dispute, DisputeStatus } from "@/lib/types";

const STATUS_LABEL: Record<DisputeStatus, string> = {
  reported: "Reported",
  seller_response: "Awaiting seller",
  repair_offered: "Repair offered",
  buyer_confirm: "Awaiting buyer confirmation",
  mediation: "Platform mediation",
  resolved_refund: "Resolved — full refund",
  resolved_partial: "Resolved — partial refund",
  resolved_rejected: "Resolved — claim rejected",
};

const STATUS_TONE: Record<DisputeStatus, string> = {
  reported: "bg-panel text-slate",
  seller_response: "bg-amber-100 text-amber-800",
  repair_offered: "bg-blue-100 text-blue-700",
  buyer_confirm: "bg-blue-100 text-blue-700",
  mediation: "bg-violet-100 text-violet-700",
  resolved_refund: "bg-emerald-100 text-emerald-700",
  resolved_partial: "bg-emerald-100 text-emerald-700",
  resolved_rejected: "bg-red-100 text-red-700",
};

const TYPE_LABEL: Record<Dispute["type"], string> = {
  download_failed: "Download failed",
  corrupted_file: "Corrupted file",
  missing_files: "Missing files",
  incompatible_version: "Incompatible KiCad version",
  materially_not_as_described: "Materially not as described",
  license_issue: "License issue",
  unauthorized_charge: "Unauthorized charge",
  ip_infringement: "IP infringement",
};

// Which evidence the platform can produce automatically for a digital sale.
const AUTO_EVIDENCE = [
  "Download log (timestamps, IP, bytes served, success/fail)",
  "File integrity hash (SHA-256 at publish vs. at delivery)",
  "Version history + changelog for the purchased version",
  "License terms snapshot as shown at checkout",
  "Seller support response times",
];

export default function AdminDisputesPage() {
  const { disputes, showToast } = useApp();
  const [open, setOpen] = useState<string | null>(disputes[0]?.id ?? null);
  const [statuses, setStatuses] = useState<Record<string, DisputeStatus>>({});

  const cur = (d: Dispute) => statuses[d.id] ?? d.status;

  return (
    <div>
      <SectionTitle right={<span className="text-sm text-muted">{disputes.length} case(s)</span>}>
        Dispute Mediation
      </SectionTitle>

      <p className="text-sm text-muted mb-5 max-w-3xl">
        Digital goods cannot be &ldquo;returned&rdquo;, so the policy is <strong>repair-first</strong>: the seller gets a
        fixed window to fix the file or supply the missing asset. Refunds are the fallback, and every decision is
        backed by machine-generated evidence rather than argument.
      </p>

      <div className="space-y-3">
        {disputes.map((d) => {
          const isOpen = open === d.id;
          const s = cur(d);
          return (
            <div key={d.id} className="t-card">
              <button
                className="w-full text-left p-4 flex flex-wrap items-center gap-3"
                onClick={() => setOpen(isOpen ? null : d.id)}
              >
                <span className="font-mono text-xs text-muted">{d.id}</span>
                <span className={`t-tag ${STATUS_TONE[s]}`}>{STATUS_LABEL[s]}</span>
                <span className="t-tag bg-panel text-slate">{TYPE_LABEL[d.type]}</span>
                <span className="font-semibold text-navy">{d.productTitle}</span>
                <span className="text-sm text-muted">
                  {d.buyerName} vs {d.sellerName} · opened {d.openedAt}
                </span>
                <span className="ml-auto text-link text-sm">{isOpen ? "Collapse" : "Review"}</span>
              </button>

              {isOpen && (
                <div className="border-t border-line grid lg:grid-cols-3">
                  <div className="lg:col-span-2 p-4 space-y-3">
                    <h4 className="font-semibold text-navy text-sm">Case thread</h4>
                    {d.messages.map((m, i) => (
                      <div
                        key={i}
                        className={`rounded-lg p-3 text-sm max-w-[90%] ${
                          m.from === "buyer"
                            ? "bg-panel text-slate"
                            : "bg-teal-light text-teal-dark ml-auto"
                        }`}
                      >
                        <div className="text-xs font-semibold capitalize mb-1">
                          {m.from} · {m.at}
                        </div>
                        {m.body}
                      </div>
                    ))}

                    <div className="pt-3 border-t border-line">
                      <label className="t-label">Mediator note</label>
                      <textarea className="t-input" rows={2} placeholder="Findings and rationale…" />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {(
                        [
                          ["repair_offered", "Order repair (7-day window)"],
                          ["resolved_partial", "Partial refund"],
                          ["resolved_refund", "Full refund + revoke license"],
                          ["resolved_rejected", "Reject claim"],
                        ] as [DisputeStatus, string][]
                      ).map(([st, label]) => (
                        <button
                          key={st}
                          className={st === "resolved_rejected" ? "t-btn-ghost" : "t-btn-primary"}
                          onClick={() => {
                            setStatuses((x) => ({ ...x, [d.id]: st }));
                            showToast(`${d.id} → ${STATUS_LABEL[st]}`);
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <aside className="p-4 bg-panel/60 border-l border-line">
                    <h4 className="font-semibold text-navy text-sm mb-2">Auto-collected evidence</h4>
                    <ul className="space-y-2 text-xs text-slate">
                      {AUTO_EVIDENCE.map((e) => (
                        <li key={e} className="flex gap-2">
                          <span className="text-teal">✓</span>
                          <span>{e}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 pt-3 border-t border-line text-xs text-muted">
                      <p className="mb-2">
                        <strong className="text-navy">Refund → license revoked.</strong> The entitlement is set to{" "}
                        <code>revoked</code> and download tokens are invalidated, so a refund cannot be used as a
                        free-download exploit.
                      </p>
                      <p>
                        Repeat claimants and repeat-offending sellers are both tracked; abuse on either side
                        triggers review.
                      </p>
                    </div>
                  </aside>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
