"use client";

import Link from "next/link";
import { DigitalProduct } from "@/lib/types";
import { VerifyBadge, Stars } from "./ui";

const CATEGORY_LABEL: Record<string, string> = {
  kicad_full_project: "KiCad Project",
  symbol_library: "Symbol Library",
  reference_design: "Design Service",
};

export default function ProductCard({ p }: { p: DigitalProduct }) {
  const from = Math.min(...p.licenses.map((l) => l.price));
  return (
    <Link
      href={`/product/${p.slug}`}
      className="group block bg-white border border-line rounded-lg overflow-hidden hover:shadow-card transition"
    >
      <div className={`h-36 bg-gradient-to-br ${p.heroThumb} relative`}>
        <span className="absolute top-2 left-2 t-tag bg-white/90 text-slate">
          {CATEGORY_LABEL[p.category] ?? "Digital Design"}
        </span>
        {p.verifyLevel > 0 && (
          <span className="absolute top-2 right-2">
            <VerifyBadge level={p.verifyLevel} />
          </span>
        )}
        <span className="absolute bottom-2 left-2 text-white/90 text-xs font-mono">{p.kicadVersion}</span>
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-navy leading-snug group-hover:text-teal-dark line-clamp-2">
          {p.title}
        </h3>
        <p className="text-xs text-muted mt-1 line-clamp-2">{p.tagline}</p>
        <div className="flex items-center justify-between mt-3">
          <Stars rating={p.rating} count={p.reviewCount} />
          <span className="text-sm">
            <span className="text-muted">from </span>
            <span className="font-bold text-teal-dark">${from}</span>
          </span>
        </div>
        {(p.timesManufactured > 0 || p.downloads > 0) && (
          <div className="mt-2 pt-2 border-t border-line flex gap-3 text-[11px] text-muted">
            {p.downloads > 0 && <span>{p.downloads} downloads</span>}
            {p.timesManufactured > 0 && <span>Made {p.timesManufactured}×</span>}
          </div>
        )}
      </div>
    </Link>
  );
}
