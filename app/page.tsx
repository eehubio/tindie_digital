"use client";


import ProductCard from "@/components/ProductCard";
import { useApp } from "@/lib/store";
import Link from "next/link";
import { escrowTotal } from "@/lib/projects";

export default function Home() {
  const products = useApp((st) => st.allProducts)();
  const { projects, challenges } = useApp();
  const openChallenge = challenges.find((c) => c.status === "open");
  const latestProjects = projects.slice(0, 3);
  return (
    <div className="space-y-8">
      {/* Hero — states the thesis: design → make → sell */}
      <section className="rounded-xl bg-navy text-white overflow-hidden">
        <div className="px-6 py-10 md:px-10 md:py-14 max-w-3xl">
          <p className="text-teal font-mono text-sm mb-3">Design → Make → Sell</p>
          <h1 className="text-3xl md:text-4xl font-bold leading-tight">
            Sell your KiCad designs. Let buyers manufacture them anywhere.
          </h1>
          <p className="mt-4 text-white/70 text-lg">
            Publish a hardware design as a digital asset. Buyers download the files, choose a license, and — when
            they want a physical board — get it made by a regional manufacturing partner without ever leaving Tindie.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/search" className="t-btn-cta">Browse designs</Link>
            <Link href="/seller/new" className="t-btn-ghost bg-white/10 border-white/20 text-white hover:bg-white/20">
              Publish a design
            </Link>
          </div>
        </div>
      </section>

      {/* The flow, encoded as a real sequence */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ["1", "Publish files", "Upload a KiCad project. We render previews and extract the BOM."],
          ["2", "Sell licenses", "Personal, commercial, or unlimited — you set each price."],
          ["3", "Buyers make it", "Huaqiu, KiCad Design Services and regional partners quote the build."],
          ["4", "Ship & sell", "Turn a proven design into a physical Tindie listing."],
        ].map(([n, t, d]) => (
          <div key={n} className="t-card p-4">
            <div className="w-7 h-7 rounded-full bg-teal text-white font-bold flex items-center justify-center text-sm">
              {n}
            </div>
            <h3 className="font-semibold text-navy mt-3">{t}</h3>
            <p className="text-xs text-muted mt-1">{d}</p>
          </div>
        ))}
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

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-navy">Featured designs</h2>
          <Link href="/search" className="text-link text-sm font-semibold hover:underline">
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
