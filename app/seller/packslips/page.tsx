"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useApp } from "@/lib/store";
import { DEST_COUNTRIES } from "@/lib/shipping";

/**
 * Batch packing slips — built from a real Tindie seller request:
 *
 *   "Printing packslips is a one-by-one process of opening the order page,
 *    clicking print, confirming, closing, opening the next order… It would be
 *    really nice if the orders list had a button to generate a single document
 *    containing all packslips for all unshipped orders — one single print job."
 *
 * So that is exactly what this page is: every unshipped order (awaiting
 * shipment + label bought but not marked shipped), one slip per printed page,
 * one window.print() call. The app chrome carries print:hidden; @page and
 * break-after do the pagination. No per-order clicking, no preview loop.
 */
function PackslipsInner() {
  const { fulfillments } = useApp();
  const sp = useSearchParams();
  const only = sp.get("order");
  // Two entries, one renderer: the batch (all unshipped) and the single-order
  // reprint from Fulfillment (?order=<id>, any status — reprinting a slip for
  // a shipped order is a normal support task).
  const unshipped = only
    ? fulfillments.filter((f) => f.id === only)
    : fulfillments.filter((f) => f.status === "unfulfilled" || f.status === "label_purchased");

  return (
    <div>
      {/* Screen-only toolbar */}
      <div className="print:hidden mb-6 flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-navy">
            {only ? `Packing slip — ${unshipped[0]?.orderRef ?? "order"}` : "Packing slips — all unshipped orders"}
          </h1>
          <p className="text-sm text-muted mt-1">
            {unshipped.length} slip{unshipped.length === 1 ? "" : "s"} below, one per page. Hit print once —
            that&apos;s the whole point.
          </p>
        </div>
        <Link href={only ? "/seller/operations?tab=fulfillment" : "/seller/orders-action"} className="t-btn-ghost">
          ← Back
        </Link>
        <button className="t-btn-cta" onClick={() => window.print()} disabled={unshipped.length === 0}>
          🖨 Print all ({unshipped.length})
        </button>
      </div>

      {unshipped.length === 0 ? (
        <div className="t-card p-10 text-center text-muted print:hidden">
          Nothing unshipped — nothing to print. 🎉
        </div>
      ) : (
        <div className="space-y-6 print:space-y-0">
          {unshipped.map((f) => (
            <div
              key={f.id}
              className="t-card p-8 bg-white break-after-page print:border-0 print:shadow-none print:rounded-none print:p-0"
            >
              {/* Slip header */}
              <div className="flex items-start justify-between border-b-2 border-navy pb-4">
                <div>
                  <div className="text-lg font-bold text-navy">SuLab · via Tindie</div>
                  <div className="text-xs text-muted">tindie.com/stores/sulab</div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-navy">{f.orderRef}</div>
                  <div className="text-xs text-muted">Ordered {f.placedAt}</div>
                  <div className="text-xs text-muted">PACKING SLIP — not an invoice</div>
                </div>
              </div>

              {/* Ship to */}
              <div className="grid grid-cols-2 gap-6 mt-5">
                <div>
                  <div className="t-label">Ship to</div>
                  <div className="text-sm text-navy leading-relaxed mt-1">
                    {(f.address ?? [f.buyerName, DEST_COUNTRIES[f.destination]?.label ?? f.destination]).map(
                      (line, i) => (
                        <div key={i} className={i === 0 ? "font-semibold" : ""}>{line}</div>
                      )
                    )}
                  </div>
                </div>
                <div>
                  <div className="t-label">Shipment</div>
                  <div className="text-sm text-slate mt-1 space-y-0.5">
                    <div>Weight: {f.weightG} g</div>
                    {f.service && <div>Service: {f.service}</div>}
                    {f.tracking && <div className="font-mono text-xs">Tracking: {f.tracking}</div>}
                    {f.status === "unfulfilled" && <div className="text-muted">Label not purchased yet</div>}
                  </div>
                </div>
              </div>

              {/* Items */}
              <table className="w-full text-sm mt-6">
                <thead>
                  <tr className="border-b border-line text-left">
                    <th className="py-2 t-label">Item</th>
                    <th className="py-2 t-label">SKU</th>
                    <th className="py-2 t-label text-right">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-line">
                    <td className="py-3 text-navy font-medium">{f.productTitle}</td>
                    <td className="py-3 font-mono text-xs text-slate">{f.sku ?? "—"}</td>
                    <td className="py-3 text-right font-semibold text-navy">{f.qty ?? 1}</td>
                  </tr>
                </tbody>
              </table>

              {/* Footer */}
              <div className="mt-6 pt-4 border-t border-line flex items-end justify-between">
                <p className="text-xs text-muted max-w-sm">
                  Questions about your order? Reply through your Tindie order page — the seller answers there.
                </p>
                <div className="text-xs text-muted text-right">
                  ☐ Picked&nbsp;&nbsp;☐ Packed&nbsp;&nbsp;☐ Shipped
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


export default function PackslipsPage() {
  return (
    <Suspense fallback={null}>
      <PackslipsInner />
    </Suspense>
  );
}
