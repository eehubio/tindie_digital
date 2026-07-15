"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useApp } from "@/lib/store";
import { escrowTotal, declineStats } from "@/lib/projects";

const STATUS_TONE: Record<string, string> = {
  building: "bg-panel text-slate",
  submitted: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  forfeited: "bg-panel text-muted",
};
const STATUS_LABEL: Record<string, string> = {
  building: "Building",
  submitted: "Under review",
  approved: "Approved · deposit refunded",
  rejected: "Rejected (fix & resubmit)",
  forfeited: "Forfeited (missed deadline)",
};

export default function ChallengeDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { challenges, joinChallenge, projects } = useApp();
  const products = useApp((st) => st.allProducts)();
  const c = challenges.find((x) => x.slug === slug);

  if (!c) return <div className="t-card p-10 text-center text-muted">Challenge not found.</div>;

  const prod = products.find((x) => x.id === c.productId);
  const stats = declineStats(c);
  const approved = c.entries.filter((e) => e.status === "approved").length;
  const mine = c.entries.find((e) => e.buyerName === "you (demo)");
  const seatsLeft = c.seats - c.seatsTaken;

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="t-tag bg-tag text-white">Challenge</span>
          <span className={`t-tag ${c.status === "open" ? "bg-teal-light text-teal-dark" : "bg-panel text-slate"}`}>
            {c.status === "open" ? "Open for entries" : c.status === "judging" ? "Judging" : "Completed"}
          </span>
          {c.escalated && <span className="t-tag bg-red-600 text-white">⚠ Circuit breaker tripped — under platform review</span>}
        </div>
        <h1 className="text-2xl font-bold text-navy mt-2">{c.title}</h1>
        <p className="text-sm text-muted mt-1">
          Run by <strong className="text-teal-dark">{c.sellerName}</strong> · opened {c.opensAt} · deadline <strong className="text-navy">{c.deadline}</strong>
        </p>
      </div>

      {/* -------- The deal, stated as arithmetic -------- */}
      <div className="grid sm:grid-cols-4 gap-3">
        <div className="t-card p-4 text-center">
          <div className="text-2xl font-bold text-navy">${c.depositUsd}</div>
          <div className="text-xs text-muted mt-1">Deposit (= board price)<br />refunded in full on completion</div>
        </div>
        <div className="t-card p-4 text-center">
          <div className="text-2xl font-bold text-navy">{c.seatsTaken}<span className="text-muted text-base">/{c.seats}</span></div>
          <div className="text-xs text-muted mt-1">Seats</div>
        </div>
        <div className="t-card p-4 text-center">
          <div className="text-2xl font-bold text-ok">{approved}</div>
          <div className="text-xs text-muted mt-1">Approved · refunded</div>
        </div>
        <div className="t-card p-4 text-center">
          <div className="text-2xl font-bold text-navy">${escrowTotal(c)}</div>
          <div className="text-xs text-muted mt-1">In platform escrow<br />(deposits on pending entries)</div>
        </div>
      </div>

      {/* -------- Sponsors -------- */}
      {c.sponsors.length > 0 && (
        <div className="t-card p-4 flex items-center gap-4 flex-wrap">
          {c.sponsors.map((sp) => (
            <div key={sp.name} className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-md bg-red-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                {sp.logoToken}
              </span>
              <div>
                <div className="font-bold text-navy text-sm">Sponsored by {sp.name}</div>
                <div className="text-xs text-muted">{sp.contribution}</div>
              </div>
            </div>
          ))}
          <p className="text-xs text-muted basis-full">
            Sponsors fund seat deposits or perks in exchange for branding on this page and every entry — the traffic follows the open-source work.
          </p>
        </div>
      )}

      {/* -------- Task + rules -------- */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="t-card p-5">
          <h2 className="font-bold text-navy mb-2">The task</h2>
          <p className="text-sm text-slate leading-relaxed">{c.task}</p>
          {prod && (
            <Link href={`/product/${prod.slug}`} className="t-btn-ghost mt-3 inline-block">
              The hardware: {prod.title} →
            </Link>
          )}
        </div>
        <div className="t-card p-5">
          <h2 className="font-bold text-navy mb-2">Rules (review is judged against these — no moving goalposts)</h2>
          <ul className="space-y-2">
            {c.rules.map((r) => (
              <li key={r.id} className="flex items-start gap-2 text-sm">
                <span className={`t-tag shrink-0 ${r.required ? "bg-navy text-white" : "bg-panel text-slate"}`}>
                  {r.required ? "Required" : "Bonus"}
                </span>
                <span className="text-slate">{r.label}</span>
              </li>
            ))}
          </ul>
          <p className="t-hint mt-3">
            Rules are snapshot-frozen the moment you join — the seller cannot change the bar after entries arrive. Same principle as the license terms hash.
          </p>
        </div>
      </div>

      {/* -------- How the money moves -------- */}
      <div className="t-card p-4 bg-panel/60 text-sm text-slate leading-relaxed">
        <strong className="text-navy">How the money moves:</strong> pay the ${c.depositUsd} deposit to join →
        it goes into <strong className="text-navy">platform escrow</strong> (never to the seller) → submit before the deadline →
        the seller reviews against the rules above → <strong className="text-ok">approved: full refund to your original payment method</strong> (Stripe escrow refund, recoverable corridor);
        rejected: reason attached, fix and resubmit before the deadline; missed deadline: the deposit releases to the seller (you simply bought the board at list price).
        <span className="text-muted">Why escrow: during review the money sits with neither party, so neither side has an incentive to stall.</span>
      </div>

      {/* -------- Circuit breaker status -------- */}
      <div className={`t-card p-4 ${c.escalated ? "border-red-300 bg-red-50/50" : ""}`}>
        <div className="flex items-center gap-3 flex-wrap text-sm">
          <strong className="text-navy">Dispute circuit breaker</strong>
          <span className="text-muted">
            {stats.decisions} decisions · {stats.rejections} rejections · {(stats.rate * 100).toFixed(0)}% decline rate
          </span>
          <span className={`t-tag ml-auto ${stats.tripped ? "bg-red-600 text-white" : "bg-emerald-100 text-emerald-700"}`}>
            {stats.tripped ? "Tripped" : "Healthy"}
          </span>
        </div>
        <p className="text-xs text-muted mt-2">
          The rule (Projects PRD v1.0 §11): at ≥5 decisions with a decline rate above 40%, the seller's Reject action locks and the
          whole challenge escalates to platform review (Approve stays open). A challenge that rejects most entries is a scam
          with extra steps — the breaker makes it structurally impossible.
        </p>
      </div>

      {/* -------- Join / my entry -------- */}
      {mine ? (
        <div className="t-card p-4 border-teal/40 bg-teal-light/30">
          <div className="flex items-center gap-3 flex-wrap">
            <strong className="text-navy text-sm">My entry</strong>
            <span className={`t-tag ${STATUS_TONE[mine.status]}`}>{STATUS_LABEL[mine.status]}</span>
            {mine.status === "building" && (
              <Link href={`/projects/new?challenge=${c.id}&entry=${mine.id}&product=${c.productId}`} className="t-btn-cta ml-auto">
                Publish your project & submit →
              </Link>
            )}
          </div>
        </div>
      ) : c.status === "open" && seatsLeft > 0 ? (
        <button className="t-btn-cta w-full py-3" onClick={() => joinChallenge(c.id)}>
          Join for a ${c.depositUsd} deposit ({seatsLeft} seats left) — finish and it's free
        </button>
      ) : (
        <div className="t-card p-4 text-center text-muted text-sm">All seats taken, or entries have closed.</div>
      )}

      {/* -------- Entries board -------- */}
      <div>
        <h2 className="font-bold text-navy mb-2">Entries ({c.entries.length})</h2>
        <div className="t-card overflow-hidden">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-line">
              {c.entries.map((e) => {
                const pj = projects.find((p) => p.id === e.projectId);
                return (
                  <tr key={e.id}>
                    <td className="px-4 py-2.5 font-semibold text-navy">{e.buyerName}</td>
                    <td className="px-4 py-2.5">
                      {pj ? (
                        <Link href={`/projects/${pj.slug}`} className="text-link hover:underline">{pj.title}</Link>
                      ) : (
                        <span className="text-muted text-xs">Not submitted yet</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={`t-tag ${STATUS_TONE[e.status]}`}>{STATUS_LABEL[e.status]}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {c.entries.some((e) => e.status === "rejected") && (
          <p className="t-hint mt-2">
            Rejected entries see the exact reason and can fix and resubmit before the deadline — a rejection is a change request, not a final verdict.
          </p>
        )}
      </div>
    </div>
  );
}
