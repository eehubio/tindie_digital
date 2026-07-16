"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";
import { SectionTitle } from "@/components/ui";

/**
 * Product submission review. Two automated pre-checks feed the human decision:
 *   - ipDeclared: the originality/rights declaration was accepted
 *   - filesOk:    files parsed (digital) or listing data complete (physical)
 * Neither failing is auto-reject — but an unchecked IP declaration on a listing
 * whose title contains someone else's trademark is exactly the case this queue
 * exists for.
 */
export default function AdminReviewsPage() {
  const { productSubmissions, decideSubmission } = useApp();
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const pending = productSubmissions.filter((s) => s.status === "pending");
  const decided = productSubmissions.filter((s) => s.status !== "pending");

  const TYPE_TONE: Record<string, string> = {
    digital: "bg-navy text-white",
    physical: "bg-teal-light text-teal-dark",
    bundle: "bg-indigo-100 text-indigo-700",
  };

  return (
    <div>
      <SectionTitle>Product Review Queue</SectionTitle>

      <h2 className="font-bold text-navy mb-2">Awaiting review ({pending.length})</h2>
      <div className="space-y-3 mb-8">
        {pending.length === 0 && <div className="t-card p-6 text-center text-muted text-sm">Queue empty.</div>}
        {pending.map((s) => {
          const flagged = !s.ipDeclared || !s.filesOk;
          return (
            <div key={s.id} className={`t-card p-4 ${flagged ? "border-amber-300" : ""}`}>
              <div className="flex items-start gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-navy">{s.productTitle}</h3>
                    <span className={`t-tag ${TYPE_TONE[s.productType]}`}>{s.productType}</span>
                  </div>
                  <p className="text-sm text-muted mt-1">by {s.sellerName} · submitted {s.submittedAt}</p>
                  <div className="flex gap-1 mt-2 flex-wrap">
                    <span className={`t-tag ${s.ipDeclared ? "bg-panel text-slate" : "bg-red-100 text-red-700"}`}>
                      {s.ipDeclared ? "✓ IP declaration accepted" : "✕ IP declaration NOT accepted"}
                    </span>
                    <span className={`t-tag ${s.filesOk ? "bg-panel text-slate" : "bg-amber-100 text-amber-800"}`}>
                      {s.filesOk ? "✓ files / listing data complete" : "⚠ files failed to parse"}
                    </span>
                  </div>
                  {!s.ipDeclared && (
                    <p className="text-xs text-red-700 mt-2">
                      The seller declined the originality declaration on a listing titled with a third-party mark. This
                      is the pattern the queue exists to catch — reject with the counter-notice process linked, do not
                      approve pending &ldquo;clarification&rdquo;.
                    </p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    className="t-btn-primary disabled:opacity-40"
                    disabled={!s.ipDeclared}
                    title={!s.ipDeclared ? "Cannot approve without the IP declaration" : ""}
                    onClick={() => decideSubmission(s.id, "approved")}
                  >
                    Approve &amp; publish
                  </button>
                  <button className="t-btn-ghost" onClick={() => setRejecting(rejecting === s.id ? null : s.id)}>
                    Reject…
                  </button>
                </div>
              </div>

              {rejecting === s.id && (
                <div className="mt-3 pt-3 border-t border-line flex gap-2">
                  <input
                    className="t-input flex-1"
                    placeholder='e.g. "KiCad archive is missing the footprint library — re-export with File → Archive Project and resubmit."'
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                  <button
                    className="t-btn-cta disabled:opacity-40"
                    disabled={!reason.trim()}
                    onClick={() => {
                      decideSubmission(s.id, "rejected", reason.trim());
                      setRejecting(null);
                      setReason("");
                    }}
                  >
                    Reject with reason
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <h2 className="font-bold text-navy mb-2">History</h2>
      <div className="t-card overflow-hidden">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-line">
            {decided.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-2 font-semibold text-navy">{s.productTitle}</td>
                <td className="px-4 py-2 text-muted hidden sm:table-cell">{s.sellerName}</td>
                <td className="px-4 py-2 text-xs text-muted hidden md:table-cell">{s.decisionReason ?? ""}</td>
                <td className="px-4 py-2 text-right">
                  <span className={`t-tag ${s.status === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{s.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
