"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";
import { SectionTitle } from "@/components/ui";

/**
 * New-seller applications. Approval is a REAL decision, not a rubber stamp:
 * the corridor the seller lands on (Stripe vs Wise) decides their reserve and
 * hold from day one, and a rejection carries a reason the applicant reads.
 */
export default function AdminSellersPage() {
  const { sellerApplications, decideApplication } = useApp();
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const pending = sellerApplications.filter((a) => a.status === "pending");
  const decided = sellerApplications.filter((a) => a.status !== "pending");

  return (
    <div>
      <SectionTitle>Seller Applications</SectionTitle>

      <div className="t-card p-4 mb-5 bg-panel/60 text-sm text-slate leading-relaxed">
        Approval sets the seller&apos;s <strong className="text-navy">payment corridor</strong>, and the corridor sets
        their risk defaults: Stripe-region sellers start at 0% reserve / T+2; Wise-corridor sellers (CN/IN/other) start
        at 10% rolling reserve / T+14, because a Wise payout, once sent, cannot be recovered. Tell the seller this at
        approval time — a reserve they learn about on their first payout is a trust incident.
      </div>

      <h2 className="font-bold text-navy mb-2">Pending ({pending.length})</h2>
      <div className="space-y-3 mb-8">
        {pending.length === 0 && <div className="t-card p-6 text-center text-muted text-sm">No pending applications.</div>}
        {pending.map((a) => (
          <div key={a.id} className="t-card p-4">
            <div className="flex items-start gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-navy">{a.storeName}</h3>
                  <span className="t-tag bg-panel text-slate">{a.country}</span>
                  <span className={`t-tag ${a.corridor === "stripe" ? "bg-teal-light text-teal-dark" : "bg-amber-100 text-amber-800"}`}>
                    {a.corridor === "stripe" ? "Stripe corridor · 0% / T+2" : "Wise corridor · 10% / T+14"}
                  </span>
                </div>
                <p className="text-sm text-muted mt-1">
                  {a.applicantName} · applied {a.appliedAt}
                </p>
                <p className="text-sm text-slate mt-1">Plans to sell: {a.productsPlanned}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button className="t-btn-primary" onClick={() => decideApplication(a.id, "approved")}>
                  Approve
                </button>
                <button className="t-btn-ghost" onClick={() => setRejecting(rejecting === a.id ? null : a.id)}>
                  Reject…
                </button>
              </div>
            </div>

            {rejecting === a.id && (
              <div className="mt-3 pt-3 border-t border-line">
                <label className="t-label">Reason (the applicant reads this verbatim)</label>
                <div className="flex gap-2">
                  <input
                    className="t-input flex-1"
                    placeholder='e.g. "We need proof of your rights to the listed designs — reply with links or documentation and we will re-review."'
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                  <button
                    className="t-btn-cta disabled:opacity-40"
                    disabled={!reason.trim()}
                    onClick={() => {
                      decideApplication(a.id, "rejected", reason.trim());
                      setRejecting(null);
                      setReason("");
                    }}
                  >
                    Reject
                  </button>
                </div>
                <p className="t-hint">
                  A rejection without a path back is a churned maker forever. Where possible, say what would change the
                  decision.
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      <h2 className="font-bold text-navy mb-2">Decided</h2>
      <div className="t-card overflow-hidden">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-line">
            {decided.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-2 font-semibold text-navy">{a.storeName}</td>
                <td className="px-4 py-2 text-muted hidden sm:table-cell">{a.country} · {a.corridor}</td>
                <td className="px-4 py-2 text-xs text-muted hidden md:table-cell">{a.decisionReason ?? ""}</td>
                <td className="px-4 py-2 text-right">
                  <span className={`t-tag ${a.status === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{a.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
