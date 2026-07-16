"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useApp } from "@/lib/store";
import {
  DEST_COUNTRIES,
  METHOD_TO_CARRIER,
  mockShippoLabel,
  quoteMethodsForOrder,
} from "@/lib/shipping";

/**
 * Batch label buying — the natural sibling of batch packing slips. Select
 * unshipped orders on the queue, rate-shop each at ITS OWN weight, pay once,
 * get every label and tracking number in one pass.
 *
 * Two rules carried over from the single-label flow:
 *   - Default per row is the CHEAPEST eligible service, but the seller can
 *     upgrade any row (tracked / faster) before paying — a batch must never
 *     take away a choice the single flow offered.
 *   - One batch = ONE payment with idempotency_key = batch id. A retry storm
 *     must never buy the same label twice (§2 of the spec: same rule as every
 *     external call).
 */
function LabelsBatchInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const { fulfillments, updateFulfillment, showToast } = useApp();

  const ids = (sp.get("ids") ?? "").split(",").filter(Boolean);
  const orders = fulfillments.filter((f) => ids.includes(f.id) && f.status === "unfulfilled");

  // Per-row service choice, defaulting to cheapest.
  const [choice, setChoice] = useState<Record<string, string>>({});
  const [bought, setBought] = useState(false);

  const rows = useMemo(
    () =>
      orders.map((f) => {
        const methods = quoteMethodsForOrder(f.destination, f.weightG);
        const chosenId = choice[f.id] ?? methods[0]?.method.id;
        const chosen = methods.find((m) => m.method.id === chosenId) ?? methods[0];
        return { f, methods, chosen };
      }),
    [orders, choice]
  );

  const total = rows.reduce((s, r) => s + (r.chosen?.cost ?? 0), 0);

  function buyAll() {
    // Real version: POST /api/labels/batch { ids, choices }, server creates
    // ONE charge (idempotency_key = batch id) and buys labels transactionally.
    rows.forEach(({ f, chosen }) => {
      if (!chosen) return;
      const carrierId = METHOD_TO_CARRIER[chosen.method.id] ?? "other";
      const label = mockShippoLabel(carrierId);
      updateFulfillment(f.id, {
        status: "label_purchased",
        carrierId,
        service: chosen.method.name,
        tracking: label.tracking,
        labelCost: chosen.cost,
      });
    });
    setBought(true);
    showToast(`${rows.length} labels purchased in one charge — now mark them shipped as they leave`);
  }

  if (bought)
    return (
      <div className="max-w-2xl mx-auto t-card p-8 text-center space-y-4">
        <div className="text-4xl">🏷️</div>
        <h1 className="text-xl font-bold text-navy">{rows.length} labels bought — one charge, one pass</h1>
        <p className="text-sm text-slate">
          Every order now sits in <strong>“Label bought — not marked shipped”</strong>. The parcels aren&apos;t
          shipped until you say so: mark each one as it physically leaves, and the tracking number goes to the buyer.
        </p>
        <div className="flex gap-2 justify-center flex-wrap">
          <Link href="/seller/packslips" className="t-btn-primary">🖨 Print all packing slips</Link>
          <Link href="/seller/orders-action" className="t-btn-cta">Back to orders →</Link>
        </div>
        <p className="t-hint">
          Slips printed now include the service and tracking number for each parcel — print after buying, not before.
        </p>
      </div>
    );

  if (orders.length === 0)
    return (
      <div className="max-w-2xl mx-auto t-card p-8 text-center space-y-3">
        <p className="text-slate">No orders selected — or the selected orders already have labels.</p>
        <Link href="/seller/orders-action" className="t-btn-primary">Back to orders</Link>
      </div>
    );

  return (
    <div className="max-w-4xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-navy">Buy labels — {orders.length} orders, one payment</h1>
        <p className="text-sm text-muted mt-1">
          Each row is rate-shopped at its own weight and destination. Default is the cheapest eligible service —
          upgrade any row before paying.
        </p>
      </div>

      <div className="t-card overflow-x-auto no-scrollbar">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="border-b border-line text-left bg-panel/60">
              <th className="px-4 py-2.5 t-label">Order</th>
              <th className="px-4 py-2.5 t-label">Destination</th>
              <th className="px-4 py-2.5 t-label">Weight</th>
              <th className="px-4 py-2.5 t-label">Service</th>
              <th className="px-4 py-2.5 t-label text-right">Label</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map(({ f, methods, chosen }) => (
              <tr key={f.id}>
                <td className="px-4 py-3">
                  <div className="font-mono text-xs text-muted">{f.orderRef}</div>
                  <div className="font-medium text-navy line-clamp-1">{f.productTitle}</div>
                  <div className="text-xs text-muted">{f.buyerName}</div>
                </td>
                <td className="px-4 py-3 text-slate">{DEST_COUNTRIES[f.destination]?.label ?? f.destination}</td>
                <td className="px-4 py-3 text-slate">{f.weightG} g</td>
                <td className="px-4 py-3">
                  <select
                    className="t-input !py-1.5 !text-xs"
                    value={chosen?.method.id}
                    onChange={(e) => setChoice((c) => ({ ...c, [f.id]: e.target.value }))}
                  >
                    {methods.map((m) => (
                      <option key={m.method.id} value={m.method.id}>
                        {m.method.name} — ${m.cost.toFixed(2)} · {m.method.eta}
                        {m.method.track ? " · tracked" : " · no tracking"}
                      </option>
                    ))}
                  </select>
                  {!chosen?.method.track && (
                    <div className="text-xs text-tag mt-1">⚠ No tracking — “where is my order” risk</div>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-navy">${chosen?.cost.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-panel/60 border-t border-line">
              <td colSpan={4} className="px-4 py-3 font-semibold text-navy text-right">
                One charge · idempotency key = batch id
              </td>
              <td className="px-4 py-3 text-right font-bold text-navy text-lg">${total.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <Link href="/seller/orders-action" className="text-sm text-muted hover:text-slate">← Back to orders</Link>
        <button className="t-btn-cta py-2.5 px-6" onClick={buyAll}>
          Buy {rows.length} labels — ${total.toFixed(2)}
        </button>
      </div>

      <p className="t-hint">
        Buying a label does <strong>not</strong> mark the order shipped — the parcel hasn&apos;t left yet. Each order
        moves to the &ldquo;label bought&rdquo; queue and stays visible until you mark it shipped, which is when the
        buyer gets the tracking email.
      </p>
    </div>
  );
}

export default function LabelsBatchPage() {
  return (
    <Suspense fallback={null}>
      <LabelsBatchInner />
    </Suspense>
  );
}
