"use client";


import ProductCard from "@/components/ProductCard";
import { useApp } from "@/lib/store";
import Link from "next/link";

export default function Home() {
  const products = useApp((st) => st.allProducts)();
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
