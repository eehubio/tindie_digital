"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import OrdersActionPage from "@/components/ops/OrdersAction";
import NewListingPage from "@/components/ops/NewListing";
import PreorderPage from "@/components/ops/Preorder";
import ShippingPage from "@/components/ops/Shipping";
import FulfillmentPage from "@/components/ops/Fulfillment";

/**
 * Seller Operations — New Listing, Orders, Preorder, Shipping and Fulfillment
 * merged into one hub. Five nav items collapsed into one page with a stable
 * tab strip: the seller's daily loop (orders → labels → ship) lives two clicks
 * from anywhere, and the occasional jobs (new listing, preorder, shipping
 * profiles) sit beside it instead of scattered across the nav.
 *
 * The old routes still work — each one redirects here with its tab selected —
 * so every existing deep link (dashboard KPIs, packslips back-links, docs)
 * keeps functioning.
 */
const TABS = [
  { key: "orders", label: "Orders", hint: "ship queue" },
  { key: "fulfillment", label: "Fulfillment", hint: "labels via Shippo" },
  { key: "shipping", label: "Shipping", hint: "profiles & rates" },
  { key: "preorder", label: "Preorder", hint: "campaigns" },
  { key: "new", label: "New Listing", hint: "publish" },
] as const;

function OperationsInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const tab = sp.get("tab") ?? "orders";

  return (
    <div>
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-line mb-6 -mx-1 px-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => router.replace(`/seller/operations?tab=${t.key}`, { scroll: false })}
            className={`px-4 py-2.5 text-sm whitespace-nowrap border-b-2 -mb-px transition ${
              tab === t.key
                ? "border-teal text-teal-dark font-semibold"
                : "border-transparent text-slate hover:text-navy"
            }`}
          >
            {t.label}
            <span className="hidden md:inline text-xs text-muted font-normal ml-1.5">· {t.hint}</span>
          </button>
        ))}
      </div>

      {tab === "orders" && <OrdersActionPage />}
      {tab === "fulfillment" && <FulfillmentPage />}
      {tab === "shipping" && <ShippingPage />}
      {tab === "preorder" && <PreorderPage />}
      {tab === "new" && <NewListingPage />}
    </div>
  );
}

export default function OperationsPage() {
  return (
    <Suspense fallback={null}>
      <OperationsInner />
    </Suspense>
  );
}
