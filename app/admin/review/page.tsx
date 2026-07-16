"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SellersPage from "@/components/admin/Sellers";
import ReviewsPage from "@/components/admin/Reviews";
import DisputesPage from "@/components/admin/Disputes";

/**
 * Admin Review hub — Sellers, Product Review and Disputes merged. These are
 * the three queues where an admin JUDGES: applications in, products in,
 * disputes in; a decision with a reason out. One page, one work rhythm.
 * (Project moderation stays its own item — it's report-driven, not a daily
 * queue, and mixing its "sentiment is not a category" posture into approval
 * queues invites the wrong habits.)
 */
const TABS = [
  { key: "sellers", label: "Sellers", hint: "applications" },
  { key: "products", label: "Product Review", hint: "IP gate" },
  { key: "disputes", label: "Disputes", hint: "order issues" },
] as const;

function ReviewInner() {
  const router = useRouter();
  const tab = useSearchParams().get("tab") ?? "sellers";
  return (
    <div>
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-line mb-6 -mx-1 px-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => router.replace(`/admin/review?tab=${t.key}`, { scroll: false })}
            className={`px-4 py-2.5 text-sm whitespace-nowrap border-b-2 -mb-px transition ${
              tab === t.key ? "border-teal text-teal-dark font-semibold" : "border-transparent text-slate hover:text-navy"
            }`}
          >
            {t.label}
            <span className="hidden md:inline text-xs text-muted font-normal ml-1.5">· {t.hint}</span>
          </button>
        ))}
      </div>
      {tab === "sellers" && <SellersPage />}
      {tab === "products" && <ReviewsPage />}
      {tab === "disputes" && <DisputesPage />}
    </div>
  );
}

export default function AdminReviewPage() {
  return (
    <Suspense fallback={null}>
      <ReviewInner />
    </Suspense>
  );
}
