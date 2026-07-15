"use client";

import { useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { escrowTotal } from "@/lib/projects";

const KIND_LABEL: Record<string, { label: string; cls: string }> = {
  product_intro: { label: "Design walkthrough", cls: "bg-teal text-white" },
  build_log: { label: "Build log", cls: "bg-indigo-100 text-indigo-700" },
  challenge_entry: { label: "Challenge entry", cls: "bg-tag text-white" },
};

export default function ProjectsPage() {
  const { projects, challenges } = useApp();
  const products = useApp((st) => st.allProducts)();
  const [filter, setFilter] = useState<string>("all");

  const shown = projects.filter((p) => filter === "all" || p.kind === filter);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-navy">Projects</h1>
        <p className="text-sm text-muted mt-1 max-w-3xl">
          Sellers lay their design process open — architecture trade-offs, failed board spins, firmware notes. That builds
          more credibility than any marketing copy. Buyers publish build logs and challenge entries on hardware they
          bought. Every project links back to a listing; the content sells the next unit.
        </p>
      </div>

      {/* -------- Active challenges banner -------- */}
      {challenges.filter((c) => c.status === "open").map((c) => {
        const done = c.entries.filter((e) => e.status === "approved").length;
        return (
          <Link key={c.id} href={`/challenges/${c.slug}`} className="block t-card p-5 border-tag/50 hover:shadow-card transition">
            <div className="flex items-start gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="t-tag bg-tag text-white">Challenge · live</span>
                  {c.sponsors.map((sp) => (
                    <span key={sp.name} className="t-tag bg-red-600 text-white">Sponsored by {sp.name}</span>
                  ))}
                </div>
                <h2 className="font-bold text-navy text-lg mt-2">{c.title}</h2>
                <p className="text-sm text-slate mt-1 line-clamp-2">{c.task}</p>
                <div className="flex gap-4 mt-3 text-xs text-muted flex-wrap">
                  <span>Deposit <strong className="text-navy">${c.depositUsd}</strong> — refunded on completion</span>
                  <span>Seats <strong className="text-navy">{c.seatsTaken}/{c.seats}</strong></span>
                  <span>Approved <strong className="text-ok">{done}</strong></span>
                  <span>Deadline <strong className="text-navy">{c.deadline}</strong></span>
                  <span>In escrow <strong className="text-navy">${escrowTotal(c)}</strong></span>
                </div>
              </div>
              <span className="t-btn-cta shrink-0">View challenge →</span>
            </div>
          </Link>
        );
      })}

      {/* -------- Filter + grid -------- */}
      <div>
        <div className="flex gap-2 mb-4 flex-wrap">
          {[["all", "All"], ["product_intro", "Design walkthroughs"], ["build_log", "Build logs"], ["challenge_entry", "Challenge entries"]].map(([k, l]) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`px-3 py-1.5 rounded-lg border text-sm transition ${
                filter === k ? "border-teal bg-teal-light/50 text-teal-dark font-semibold" : "border-line text-slate hover:border-teal/50"
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {shown.map((p) => {
            const prod = products.find((x) => x.id === p.productId);
            return (
              <Link key={p.id} href={`/projects/${p.slug}`} className="t-card overflow-hidden hover:shadow-card transition block">
                <div className={`h-28 bg-gradient-to-br ${p.coverGradient} relative`}>
                  <span className={`absolute top-2 left-2 t-tag ${KIND_LABEL[p.kind].cls}`}>{KIND_LABEL[p.kind].label}</span>
                  {p.youtubeUrl && <span className="absolute top-2 right-2 t-tag bg-white/90 text-slate">▶ Video</span>}
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-navy leading-snug line-clamp-2">{p.title}</h3>
                  <p className="text-xs text-muted mt-1.5 line-clamp-2">{p.summary}</p>
                  <div className="flex items-center gap-2 mt-3 text-xs text-muted">
                    <span className={`font-semibold ${p.authorRole === "seller" ? "text-teal-dark" : "text-slate"}`}>
                      {p.authorName}
                    </span>
                    <span className="t-tag bg-panel text-slate">{p.authorRole === "seller" ? "Seller" : "Buyer"}</span>
                    <span className="ml-auto">♥ {p.likes}</span>
                  </div>
                  {prod && (
                    <div className="mt-2 pt-2 border-t border-line text-xs text-link truncate">↳ Linked listing: {prod.title}</div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
