"use client";

import Link from "next/link";
import { useApp } from "@/lib/store";

/**
 * Platform moderation for open projects — POST-publication, report-driven.
 *
 * What this queue is:  rulings on factual-dispute flags and policy violations
 * (illegal content, IP, spam, dangerous misinformation).
 * What this queue is NOT:  a pre-approval gate, and never a sentiment filter.
 * "Unfavorable to the seller" is not a category this page recognizes.
 *
 * A pre-moderation gate on every project would add latency, kill the
 * publish-flywheel, and put the platform's fingerprints on every piece of
 * content it DIDN'T remove. Post-moderation with an audit trail scales and
 * keeps the speech the community's, not ours.
 */
export default function AdminProjectsPage() {
  const { projects, resolveProjectFlag, toggleFeatured } = useApp();
  const published = projects.filter((p) => p.publication === "published");
  const openFlags = projects.filter((p) => p.flag?.status === "open");
  const ruled = projects.filter((p) => p.flag && p.flag.status !== "open");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-navy">Projects — platform review</h1>
        <p className="text-sm text-muted mt-1 max-w-3xl">
          Rulings on factual disputes and policy violations. Sentiment is not a category here: a critical project
          with correct measurements stays up, and the seller&apos;s remedy is a public response — which they can post
          without asking anyone.
        </p>
      </div>

      <section>
        <h2 className="font-bold text-navy mb-2">Open flags ({openFlags.length})</h2>
        {openFlags.length === 0 ? (
          <div className="t-card p-6 text-center text-muted text-sm">No open flags. The community is talking; let it.</div>
        ) : (
          <div className="space-y-3">
            {openFlags.map((p) => (
              <div key={p.id} className="t-card p-4">
                <div className="flex items-start gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <Link href={`/projects/${p.slug}`} className="font-semibold text-navy hover:text-teal-dark">
                      {p.title}
                    </Link>
                    <div className="text-xs text-muted mt-0.5">
                      by {p.authorName} · {p.verifiedPurchase ? "verified purchase ✓" : "UNVERIFIED"} · ♥ {p.likes}
                    </div>
                    <div className="mt-2 rounded-md bg-amber-50 border border-amber-200 p-2.5 text-xs text-slate">
                      <strong className="text-navy">Flagged by {p.flag!.by} ({p.flag!.at}):</strong> {p.flag!.reason}
                    </div>
                    <p className="t-hint mt-2">
                      Standard: is the flagged claim PROVABLY false, or a policy violation? The burden of proof is the
                      flagger&apos;s. &ldquo;Bad for sales&rdquo; upholds nothing.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      className="t-btn-primary !text-xs"
                      onClick={() => {
                        const r = prompt("Dismissal note (recorded on the flag):", "Claims are supported by the author's evidence; no policy violation.");
                        if (r?.trim()) resolveProjectFlag(p.id, false, r.trim());
                      }}
                    >
                      Dismiss — project stays up
                    </button>
                    <button
                      className="t-btn-ghost !text-xs text-cta"
                      onClick={() => {
                        const r = prompt("Ruling for removal (the author reads this verbatim; it also shows on the tombstone):");
                        if (r?.trim()) resolveProjectFlag(p.id, true, r.trim());
                      }}
                    >
                      Uphold — unpublish
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-bold text-navy mb-2">Editorial — featured projects</h2>
        <p className="t-hint mb-3">
          Featuring is an editorial lever aligned with the Tindarian culture: platform recognition for outstanding
          work, including critical work. No auto-rule — an entitlement would be farmed.
        </p>
        <div className="t-card overflow-hidden">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-line">
              {published.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-2.5">
                    <Link href={`/projects/${p.slug}`} className="text-link hover:underline">{p.title}</Link>
                    <span className="text-xs text-muted ml-2">♥ {p.likes}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      className={`t-tag ${p.featured ? "bg-tag text-white" : "bg-panel text-slate hover:bg-teal-light"}`}
                      onClick={() => toggleFeatured(p.id)}
                    >
                      {p.featured ? "★ Featured" : "☆ Feature"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {ruled.length > 0 && (
        <section>
          <h2 className="font-bold text-navy mb-2">Ruled ({ruled.length})</h2>
          <div className="t-card overflow-hidden">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-line">
                {ruled.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-2.5">
                      <Link href={`/projects/${p.slug}`} className="text-link hover:underline">{p.title}</Link>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted">{p.flag!.resolution}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={`t-tag ${p.flag!.status === "upheld" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                        {p.flag!.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
