"use client";

import { useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { declineStats, escrowTotal, ChallengeRule } from "@/lib/projects";

/**
 * Seller console for Projects & Challenges.
 *   1. Publish a product-intro project (before / during / without a preorder).
 *   2. Launch a FunPack-style challenge: N seats × deposit, a task, rules.
 *   3. Review submitted entries: approve → escrowed deposit refunds to the
 *      buyer; reject → reason required, buyer may fix and resubmit.
 * The circuit breaker is enforced in the store; this page makes it VISIBLE
 * to the seller before they hit it.
 */
export default function SellerProjectsPage() {
  const { projects, challenges, reviewEntry, showToast, rewardPrograms, rewardGrants, decideGrant, upsertRewardProgram } = useApp();
  const products = useApp((st) => st.allProducts)().filter((p) => p.sellerName === "SuLab");
  const myProjects = projects.filter((p) => p.authorName === "SuLab");
  // Community projects ON YOUR LISTINGS — buyers' builds that reference a
  // SuLab product either as the main link or in the components list. This is
  // the seller-side mirror of the buyer Library section: your catalog, seen
  // through what the community actually did with it.
  const myProductIds = new Set(products.map((x) => x.id));
  const communityProjects = projects.filter(
    (pj) =>
      pj.authorRole === "buyer" &&
      ((pj.productId && myProductIds.has(pj.productId)) ||
        pj.components.some((c) => c.productId && myProductIds.has(c.productId)))
  );

  const [showLaunch, setShowLaunch] = useState(false);
  const [rejectDrafts, setRejectDrafts] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    productId: products[0]?.id ?? "",
    seats: 20,
    deposit: 79,
    deadline: "2026-09-30",
    task: "",
    ruleRepo: true,
    ruleProject: true,
    ruleVideo: true,
    ruleLicense: true,
  });

  function launch() {
    showToast("Challenge created (prototype demo) — the real version freezes the rule snapshot and opens deposit escrow here");
    setShowLaunch(false);
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-navy">Projects & Challenges</h1>
          <p className="text-sm text-muted mt-1">
            Before a preorder, during one, or with no preorder at all — introduce your product as a design walkthrough. The more of the process you lay open, the more credible the listing.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/projects/new?as=seller&product=${products[0]?.id ?? ""}`} className="t-btn-primary">
            + Publish design walkthrough
          </Link>
          <button className="t-btn-cta" onClick={() => setShowLaunch((v) => !v)}>+ Launch a challenge</button>
        </div>
      </div>

      {/* -------- Launch challenge form -------- */}
      {showLaunch && (
        <div className="t-card p-5 border-tag/40">
          <h2 className="font-bold text-navy mb-1">Launch a challenge (FunPack model)</h2>
          <p className="text-xs text-muted mb-4">
            Put up N seats × a deposit equal to the board price, and set a task. Buyers who finish on time, publish open-source
            on Tindie, and pass review get the deposit back — the board is effectively free. You get N public, real builds,
            and they sell the next batch.
          </p>
          <div className="grid sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="t-label">Product for the challenge</label>
              <select className="t-input" value={form.productId} onChange={(e) => setForm((f) => ({ ...f, productId: e.target.value }))}>
                {products.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>
            <div>
              <label className="t-label">Seats</label>
              <input className="t-input" type="number" min={5} value={form.seats} onChange={(e) => setForm((f) => ({ ...f, seats: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="t-label">Deposit (= board price, USD)</label>
              <input className="t-input" type="number" value={form.deposit} onChange={(e) => setForm((f) => ({ ...f, deposit: Number(e.target.value) }))} />
            </div>
            <div className="sm:col-span-3">
              <label className="t-label">Task</label>
              <textarea className="t-input min-h-[70px]" value={form.task} onChange={(e) => setForm((f) => ({ ...f, task: e.target.value }))}
                placeholder="e.g. Implement any serial protocol decoder on this board — the more obscure the better." />
            </div>
            <div>
              <label className="t-label">Deadline</label>
              <input className="t-input" type="date" value={form.deadline} onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))} />
            </div>
          </div>
          <div className="mt-4">
            <label className="t-label">Rules (snapshot-frozen at join time — no raising the bar later)</label>
            <div className="grid sm:grid-cols-2 gap-2 text-sm">
              {[
                ["ruleRepo", "Open repo: full source + README"],
                ["ruleProject", "Tindie project page linked to the product (≥2 sections)"],
                ["ruleVideo", "Demo video (≥2 min)"],
                ["ruleLicense", "OSS license (MIT / Apache-2.0 / CERN-OHL)"],
              ].map(([k, label]) => (
                <label key={k} className="flex items-center gap-2">
                  <input type="checkbox" className="accent-teal" checked={form[k as keyof typeof form] as boolean}
                    onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.checked }))} />
                  <span className="text-slate">{label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="mt-4 rounded-md bg-panel border border-line p-3 text-xs text-slate leading-relaxed">
            <strong className="text-navy">Three things you are signing up for:</strong>
            ① Deposits sit in platform escrow — you don't touch them during review. ② Rules are snapshot-frozen — you can't
            change the bar after entries arrive. ③ At ≥5 decisions with a decline rate &gt;40% the circuit breaker trips —
            rejections lock and the whole challenge escalates to platform review.
            <strong className="text-navy">A challenge that rejects most entries is a scam with extra steps — we make it structurally impossible.</strong>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button className="t-btn-ghost" onClick={() => setShowLaunch(false)}>Cancel</button>
            <button className="t-btn-cta disabled:opacity-40" disabled={!form.task.trim()} onClick={launch}>Create challenge</button>
          </div>
        </div>
      )}

      {/* -------- Entry review queue -------- */}
      {challenges.map((c) => {
        const stats = declineStats(c);
        const submitted = c.entries.filter((e) => e.status === "submitted");
        return (
          <div key={c.id}>
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h2 className="font-bold text-navy">{c.title}</h2>
              <span className="text-xs text-muted">${escrowTotal(c)} in escrow · {(stats.rate * 100).toFixed(0)}% decline rate</span>
              {c.escalated && <span className="t-tag bg-red-600 text-white">Breaker tripped — rejections locked</span>}
              <Link href={`/challenges/${c.slug}`} className="text-xs text-link hover:underline ml-auto">Buyer view →</Link>
            </div>

            {submitted.length === 0 ? (
              <div className="t-card p-5 text-center text-muted text-sm">No entries awaiting review.</div>
            ) : (
              <div className="space-y-3">
                {submitted.map((e) => {
                  const pj = projects.find((p) => p.id === e.projectId);
                  return (
                    <div key={e.id} className="t-card p-4">
                      <div className="flex items-start gap-3 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-navy">{e.buyerName}</div>
                          {pj ? (
                            <Link href={`/projects/${pj.slug}`} className="text-sm text-link hover:underline">{pj.title}</Link>
                          ) : (
                            <span className="text-sm text-muted">Project link missing</span>
                          )}
                          <div className="flex gap-1.5 mt-2 text-xs flex-wrap">
                            {c.rules.filter((r) => r.required).map((r: ChallengeRule) => (
                              <span key={r.id} className="t-tag bg-panel text-slate">☐ {r.label}</span>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 items-end shrink-0">
                          <button className="t-btn-primary" onClick={() => reviewEntry(c.id, e.id, true)}>
                            ✓ Approve — refund ${c.depositUsd}
                          </button>
                          <div className="flex gap-1">
                            <input
                              className="t-input !w-56 !text-xs"
                              placeholder="Rejection reason (the buyer reads this verbatim)"
                              value={rejectDrafts[e.id] ?? ""}
                              onChange={(ev) => setRejectDrafts((m) => ({ ...m, [e.id]: ev.target.value }))}
                              disabled={c.escalated}
                            />
                            <button
                              className="t-btn-ghost disabled:opacity-40"
                              disabled={c.escalated || !(rejectDrafts[e.id] ?? "").trim()}
                              title={c.escalated ? "Breaker tripped — rejections locked pending platform review" : ""}
                              onClick={() => reviewEntry(c.id, e.id, false, rejectDrafts[e.id].trim())}
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* -------- Community projects on your listings -------- */}
      <div>
        <h2 className="font-bold text-navy mb-1">Community projects on your listings ({communityProjects.length})</h2>
        <p className="t-hint mb-3">
          Buyers&apos; builds that reference your products — every one of these is selling the next unit for you.
        </p>
        {communityProjects.length === 0 ? (
          <div className="t-card p-4 text-center text-muted text-sm">
            None yet — a reward program on a listing is the fastest way to change that.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {communityProjects.map((pj) => (
              <Link key={pj.id} href={`/projects/${pj.slug}`} className="t-card p-4 hover:shadow-card transition block">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="t-tag bg-panel text-slate">
                    {pj.kind === "challenge_entry" ? "Challenge entry" : "Build log"}
                  </span>
                  <span className="text-xs text-muted ml-auto">♥ {pj.likes}</span>
                </div>
                <div className="font-semibold text-navy mt-1.5 line-clamp-2">{pj.title}</div>
                <div className="text-xs text-muted mt-1">{pj.authorName}</div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* -------- Reward programs + claims queue -------- */}
      <div>
        <div className="flex items-center gap-3 flex-wrap mb-2">
          <h2 className="font-bold text-navy">Project rewards</h2>
          <span className="text-xs text-muted">
            Pay for what a Hackster feature gives you — public proof your product works — at a price you set, from a budget you cap.
          </span>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 mb-4">
          {rewardPrograms.map((rp) => (
            <div key={rp.id} className="t-card p-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-navy text-sm line-clamp-1 flex-1">{rp.productTitle}</span>
                <span className={`t-tag ${rp.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-panel text-slate"}`}>
                  {rp.status}
                </span>
              </div>
              <div className="text-sm text-slate mt-1">
                🎁 {rp.type === "credit" ? `$${rp.creditUsd} Tindie credit` : `${rp.couponPct}% coupon`} per approved project
              </div>
              <div className="mt-2">
                <div className="flex justify-between text-xs text-muted">
                  <span>Budget</span>
                  <span>${rp.spentUsd} / ${rp.budgetUsd}</span>
                </div>
                <div className="h-1.5 bg-panel rounded-full mt-1 overflow-hidden">
                  <div className="h-full bg-teal" style={{ width: `${Math.min(100, (rp.spentUsd / rp.budgetUsd) * 100)}%` }} />
                </div>
                <p className="t-hint mt-1">Auto-pauses at the cap — never an unbounded liability.</p>
              </div>
              <button
                className="t-btn-ghost !text-xs mt-2"
                onClick={() => upsertRewardProgram({ ...rp, status: rp.status === "active" ? "paused" : "active" })}
              >
                {rp.status === "active" ? "Pause" : "Resume"}
              </button>
            </div>
          ))}
        </div>

        {rewardGrants.filter((g) => g.status === "pending").length === 0 ? (
          <div className="t-card p-4 text-center text-muted text-sm">No reward claims awaiting review.</div>
        ) : (
          <div className="space-y-2">
            {rewardGrants.filter((g) => g.status === "pending").map((g) => {
              const pj = projects.find((x) => x.id === g.projectId);
              const rp = rewardPrograms.find((x) => x.id === g.programId);
              return (
                <div key={g.id} className="t-card p-4 flex items-center gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-navy text-sm">{g.buyerName} · claims {g.type === "credit" ? `$${g.valueUsd} credit` : `${g.couponPct}% coupon`}</div>
                    <div className="text-xs text-muted">
                      {pj ? <Link href={`/projects/${pj.slug}`} className="text-link hover:underline">{pj.title}</Link> : "project missing"}
                      {rp && <> · on {rp.productTitle}</>}
                    </div>
                    <div className="text-xs text-muted mt-0.5">Purchase verified ✓ · quality bar passed ✓ (machine-checked before this claim was created)</div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button className="t-btn-primary !text-xs" onClick={() => decideGrant(g.id, true)}>✓ Approve</button>
                    <button
                      className="t-btn-ghost !text-xs"
                      onClick={() => {
                        const r = prompt("Denial reason (the buyer reads this verbatim):");
                        if (r?.trim()) decideGrant(g.id, false, r.trim());
                      }}
                    >
                      Deny
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* -------- My projects -------- */}
      <div>
        <h2 className="font-bold text-navy mb-2">My projects ({myProjects.length})</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {myProjects.map((p) => (
            <Link key={p.id} href={`/projects/${p.slug}`} className="t-card p-4 hover:shadow-card transition block">
              <div className="font-semibold text-navy line-clamp-1">{p.title}</div>
              <div className="text-xs text-muted mt-1">♥ {p.likes} · updated {p.updatedAt}</div>
            </Link>
          ))}
        </div>
        <p className="t-hint mt-2">
          Walkthroughs appear under the product's Projects tab automatically. Published before a preorder they build credibility; published during one they answer the hesitant buyer's questions.
        </p>
      </div>
    </div>
  );
}
