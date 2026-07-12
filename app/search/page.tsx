"use client";

import { useState } from "react";
import { products } from "@/lib/mock";
import ProductCard from "@/components/ProductCard";

const CATEGORIES = [
  ["all", "All designs"],
  ["kicad_full_project", "KiCad projects"],
  ["symbol_library", "Libraries"],
  ["reference_design", "Design services"],
];

export default function SearchPage() {
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
      <aside className="space-y-4">
        <div>
          <label className="t-label">Search</label>
          <input
            className="t-input"
            placeholder="RP2350, RF, review…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div>
          <div className="t-label">Category</div>
          <div className="space-y-1">
            {CATEGORIES.map(([val, label]) => (
              <button
                key={val}
                onClick={() => setCat(val)}
                className={`block w-full text-left px-3 py-1.5 rounded-md text-sm transition ${
                  cat === val ? "bg-teal-light text-teal-dark font-semibold" : "text-slate hover:bg-panel"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="t-card p-3 text-xs text-muted">
          Prices shown are the lowest license tier. Manufacturing is quoted separately by regional partners.
        </div>
      </aside>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-navy">Digital hardware designs</h1>
          <span className="text-sm text-muted">{filtered.length} results</span>
        </div>
        {filtered.length === 0 ? (
          <div className="t-card p-10 text-center text-muted">
            No designs match that search yet. Try a different term or category.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
