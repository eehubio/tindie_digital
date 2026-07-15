"use client";

import Link from "next/link";
import { DigitalProduct } from "@/lib/types";
import { VerifyBadge, Stars } from "./ui";
import { useApp } from "@/lib/store";

const CATEGORY_LABEL: Record<string, string> = {
  kicad_full_project: "KiCad Project",
  symbol_library: "Symbol Library",
  reference_design: "Design Service",
};

const TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  digital: { label: "Digital files", cls: "bg-white/90 text-slate" },
  physical: { label: "Physical product", cls: "bg-teal text-white" },
  bundle: { label: "Kit + Files bundle", cls: "bg-indigo-600 text-white" },
};

export default function ProductCard({ p }: { p: DigitalProduct }) {
  // Open projects linked to this listing — a design walkthrough or a real
  // buyer's build log is credibility a browsing buyer should see BEFORE the
  // click, not discover behind a tab.
  const projectCount = useApp((st) => st.projects).filter((x) => x.productId === p.id).length;
  const from = p.price ?? (p.licenses.length ? Math.min(...p.licenses.map((l) => l.price)) : 0);
  const isPreorder = !!p.preorderCampaignSlug;
  const lowStock = p.productType !== "digital" && (p.stock ?? 0) > 0 && (p.stock ?? 0) <= 20;
  return (
    <Link
      href={`/product/${p.slug}`}
      className="group block bg-white border border-line rounded-lg overflow-hidden hover:shadow-card transition"
    >
      <div className={`h-36 bg-gradient-to-br ${p.heroThumb} relative`}>
        <span className={`absolute top-2 left-2 t-tag ${TYPE_BADGE[p.productType].cls}`}>
          {isPreorder ? "Preorder" : TYPE_BADGE[p.productType].label}
        </span>
        {p.verifyLevel > 0 && (
          <span className="absolute top-2 right-2">
            <VerifyBadge level={p.verifyLevel} />
          </span>
        )}
        <span className="absolute bottom-2 left-2 text-white/90 text-xs font-mono">{p.kicadVersion}</span>
        {projectCount > 0 && (
          <span className="absolute bottom-2 right-2 t-tag bg-black/50 text-white backdrop-blur-sm">
            ⌘ {projectCount} 个开源项目
          </span>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-navy leading-snug group-hover:text-teal-dark line-clamp-2">
          {p.title}
        </h3>
        <p className="text-xs text-muted mt-1 line-clamp-2">{p.tagline}</p>
        <div className="flex items-center justify-between mt-3">
          <Stars rating={p.rating} count={p.reviewCount} />
          <span className="text-sm">
            {p.productType === "digital" && <span className="text-muted">from </span>}
            <span className="font-bold text-teal-dark">${from}</span>
          </span>
        </div>
        {(p.timesManufactured > 0 || p.downloads > 0 || p.productType !== "digital") && (
          <div className="mt-2 pt-2 border-t border-line flex gap-3 text-[11px] text-muted">
            {p.downloads > 0 && <span>{p.downloads} downloads</span>}
            {p.timesManufactured > 0 && <span>Made {p.timesManufactured}×</span>}
            {isPreorder ? (
              <span className="text-tag font-semibold ml-auto">37/50 committed</span>
            ) : p.productType !== "digital" ? (
              <span className={`ml-auto ${lowStock ? "text-cta font-semibold" : ""}`}>
                {(p.stock ?? 0) > 0 ? `${p.stock} in stock` : "Out of stock"}
              </span>
            ) : null}
          </div>
        )}
      </div>
    </Link>
  );
}
