"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SellersPage from "@/components/admin/Sellers";
import ReviewsPage from "@/components/admin/Reviews";
import DisputesPage from "@/components/admin/Disputes";
import ProjectsPage from "@/components/admin/Projects";

/**
 * Admin Review hub — Sellers, Product Review and Disputes merged. These are
 * the three queues where an admin JUDGES: applications in, products in,
 * disputes in; a decision with a reason out. One page, one work rhythm.
 * Project Review sits here too — it is the one
 * tab with the OPPOSITE posture (post-publication, flags only), which is why
 * it carries an explicit posture banner instead of relying on memory.
 */
const TABS = [
  { key: "sellers", label: "Sellers", hint: "applications" },
  { key: "products", label: "Product Review", hint: "IP gate" },
  { key: "projects", label: "Project Review", hint: "flags only" },
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
      {tab === "projects" && (
        <div>
          {/* Posture guard: the other tabs in this hub are PRE-approval
              queues (nothing goes live without a yes). This one is the
              opposite — content is live by default, and this tab only rules
              on flags. Sitting next to approval queues, that difference is
              easy to forget, so it's stated where the admin's eyes are. */}
          <div className="t-card p-3 mb-5 border-amber-300 bg-amber-50/60 text-sm text-slate">
            ⚖ <strong className="text-navy">Different posture than the tabs beside it:</strong> projects are already
            published — nothing here awaits approval. This queue rules on flags only (provable falsehoods, IP, spam,
            dangerous misinformation). &ldquo;Unfavorable to the seller&rdquo; is not a category it recognizes.
          </div>
          <ProjectsPage />
        </div>
      )}
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
