"use client";

import { useState } from "react";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { useApp } from "@/lib/store";
import { escrowTotal } from "@/lib/projects";

const CATEGORIES = [
  ["all", "All designs"],
  ["kicad_full_project", "KiCad projects"],
  ["symbol_library", "Libraries"],
  ["reference_design", "Design services"],
];

/**
 * Marketplace = home + browse, merged. One page: search, category filters,
 * the full catalog, and the community layer (challenge banner + latest
 * projects). Splitting "home" from "browse" made every visit start with a
 * redundant click; the search box IS the front page.
 */
export default function Marketplace() {
  const products = useApp((st) => st.allProducts)();
  const { projects, challenges } = useApp();
  const openChallenge = challenges.find((c) => c.status === "open");
  const latestProjects = projects.filter((p) => p.publication === "published").slice(0, 3);

  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");

  const filtered = products.filter((p) => {
    const matchesCat = cat === "all" || p.category === cat;
    const matchesQ =
      !q ||
      p.title.toLowerCase().includes(q.toLowerCase()) ||
      p.tagline.toLowerCase().includes(q.toLowerCase());
    return matchesCat && matchesQ;
  });

  const matchingProjects = (q
    ? projects.filter(
        (pj) =>
          pj.title.toLowerCase().includes(q.toLowerCase()) ||
          pj.summary.toLowerCase().includes(q.toLowerCase()) ||
          pj.tags.some((t) => t.toLowerCase().includes(q.toLowerCase()))
      )
    : []
  ).filter((pj) => pj.publication === "published");

  const browsing = q.length > 0 || cat !== "all";

  return (
    <div className="space-y-8">
      {/* Compact hero with the search box front and center */}
      <section className="rounded-xl bg-navy text-white overflow-hidden">
        <div className="px-6 py-8 md:px-10 md:py-10">
          <p className="text-teal font-mono text-sm mb-2">Design → Make → Sell</p>
          <h1 className="text-2xl md:text-3xl font-bold leading-tight max-w-2xl">
            Sell your KiCad designs. Let buyers manufacture them anywhere.
          </h1>
          <div className="mt-5 max-w-xl">
            <input
              className="t-input !bg-white !text-navy w-full !py-3"
              placeholder="Search designs, kits and projects…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {CATEGORIES.map(([k, l]) => (
              <button
                key={k}
                onClick={() => setCat(k)}
                className={`px-3 py-1.5 rounded-full text-sm border transition ${
                  cat === k
                    ? "bg-teal border-teal text-white font-semibold"
                    : "border-white/25 text-white/80 hover:border-teal/60"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Catalog — always visible; this IS the browse page now */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-navy">{browsing ? `Results (${filtered.length})` : "Catalog"}</h2>
          {!browsing && <span className="text-sm text-muted">{products.length} listings</span>}
        </div>
        {filtered.length === 0 ? (
          <div className="t-card p-10 text-center text-muted">Nothing matches — try a broader term or another category.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        )}

        {matchingProjects.length > 0 && (
          <div className="mt-6">
            <h3 className="font-bold text-navy mb-2">Matching community projects</h3>
            <div className="space-y-2">
              {matchingProjects.map((pj) => {
                const prod = products.find((x) => x.id === pj.productId);
                return (
                  <Link key={pj.id} href={`/projects/${pj.slug}`} className="t-card p-3 flex items-center gap-3 hover:shadow-card transition">
                    <div className={`w-16 h-11 rounded-md bg-gradient-to-br ${pj.coverGradient} shrink-0`} />
                    <div className="min-w-0">
                      <div className="font-semibold text-navy text-sm line-clamp-1">{pj.title}</div>
                      <div className="text-xs text-muted line-clamp-1">
                        {pj.authorRole === "seller" ? "Seller walkthrough" : "Buyer project"} · {pj.authorName}
                        {prod && <> · ↳ {prod.title}</>}
                      </div>
                    </div>
                    <span className="ml-auto text-xs text-muted shrink-0">♥ {pj.likes}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Community: open projects & challenges — content sells the next unit,
          so it belongs on the marketplace front page, not behind a nav item */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-navy">Community projects</h2>
          <Link href="/projects" className="text-link text-sm font-semibold hover:underline">
            View all →
          </Link>
        </div>

        {openChallenge && (
          <Link
            href={`/challenges/${openChallenge.slug}`}
            className="block t-card p-4 mb-4 border-tag/50 hover:shadow-card transition"
          >
            <div className="flex items-center gap-3 flex-wrap">
              <span className="t-tag bg-tag text-white shrink-0">Challenge</span>
              {openChallenge.sponsors.map((sp) => (
                <span key={sp.name} className="t-tag bg-red-600 text-white shrink-0">Sponsored by {sp.name}</span>
              ))}
              <span className="font-bold text-navy">{openChallenge.title}</span>
              <span className="text-xs text-muted ml-auto shrink-0">
                ${openChallenge.depositUsd} deposit, refunded on completion · {openChallenge.seats - openChallenge.seatsTaken} seats left ·
                deadline {openChallenge.deadline} · ${escrowTotal(openChallenge)} in escrow
              </span>
            </div>
          </Link>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {latestProjects.map((pj) => {
            const prod = products.find((x) => x.id === pj.productId);
            return (
              <Link key={pj.id} href={`/projects/${pj.slug}`} className="t-card overflow-hidden hover:shadow-card transition block">
                <div className={`h-24 bg-gradient-to-br ${pj.coverGradient} relative`}>
                  <span className={`absolute top-2 left-2 t-tag ${pj.authorRole === "seller" ? "bg-teal text-white" : "bg-white/90 text-slate"}`}>
                    {pj.authorRole === "seller" ? "Seller · walkthrough" : pj.kind === "challenge_entry" ? "Buyer · challenge entry" : "Buyer · build log"}
                  </span>
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-navy leading-snug line-clamp-2">{pj.title}</h3>
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted">
                    <span>{pj.authorName}</span>
                    <span className="ml-auto">♥ {pj.likes}</span>
                  </div>
                  {prod && <div className="mt-2 pt-2 border-t border-line text-xs text-link truncate">↳ {prod.title}</div>}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* The flow, for first-time visitors — below the fold on purpose */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ["1", "Publish files", "Upload a KiCad project. We render previews and extract the BOM."],
          ["2", "Sell licenses", "Personal, commercial, or unlimited — you set each price."],
          ["3", "Buyers make it", "Huaqiu, KiCad Design Services and regional partners quote the build."],
          ["4", "Ship & sell", "Turn a proven design into a physical Tindie listing."],
        ].map(([n, t, d]) => (
          <div key={n} className="t-card p-4">
            <div className="w-7 h-7 rounded-full bg-teal text-white font-bold flex items-center justify-center text-sm">{n}</div>
            <h3 className="font-semibold text-navy mt-3">{t}</h3>
            <p className="text-xs text-muted mt-1">{d}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
