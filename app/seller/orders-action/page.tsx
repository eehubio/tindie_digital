"use client";

import { useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { DEST_COUNTRIES } from "@/lib/shipping";

/**
 * The "需处理订单" queue. Three states matter to a seller:
 *   1. unfulfilled        → buy a label (or paste tracking for manual lanes)
 *   2. label_purchased    → the parcel left, but the buyer still sees "preparing"
 *                           until it is MARKED shipped — hence the reminder.
 *   3. shipped            → done here; disputes live elsewhere.
 *
 * Marking shipped immediately offers the notification template, pre-filled —
 * the message is the seller's to copy, edit and send, not an automatic blast.
 */
export default function OrdersActionPage() {
  const { fulfillments, updateFulfillment, showToast } = useApp();
  const [trackingDraft, setTrackingDraft] = useState<Record<string, string>>({});
  const [justShipped, setJustShipped] = useState<string | null>(null);

  const unfulfilled = fulfillments.filter((f) => f.status === "unfulfilled");
  const labelBought = fulfillments.filter((f) => f.status === "label_purchased");
  const done = fulfillments.filter((f) => f.status === "shipped" || f.status === "delivered");

  const overdueDays = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);

  function markShipped(id: string) {
    const f = fulfillments.find((x) => x.id === id);
    updateFulfillment(id, { status: "shipped", tracking: trackingDraft[id] ?? f?.tracking });
    setJustShipped(id);
    showToast("Marked shipped — tracking pushed to the buyer's order page");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-navy">Orders to handle</h1>
        <p className="text-sm text-muted mt-1">
          Everything here needs an action from you. Buy the label from <Link href="/seller/fulfillment" className="text-link hover:underline">Fulfillment</Link> (rate-shopped), or paste your own tracking for manual lanes like China Post / Yanwen.
        </p>
      </div>

      {/* -------- 1. Awaiting shipment -------- */}
      <section>
        <h2 className="font-bold text-navy mb-2">Awaiting shipment ({unfulfilled.length})</h2>
        {unfulfilled.length === 0 ? (
          <div className="t-card p-6 text-center text-muted text-sm">Nothing waiting. 🎉</div>
        ) : (
          <div className="space-y-2">
            {unfulfilled.map((f) => {
              const days = overdueDays(f.placedAt);
              const overdue = days > 3;
              return (
                <div key={f.id} className={`t-card p-4 ${overdue ? "border-cta/50" : ""}`}>
                  <div className="flex items-start gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-muted">{f.orderRef}</span>
                        <span className="font-semibold text-navy">{f.productTitle}</span>
                        {overdue && (
                          <span className="t-tag bg-cta text-white">
                            {days} days old — past handling window
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted mt-1">
                        {f.buyerName} · {DEST_COUNTRIES[f.destination]?.flag} {DEST_COUNTRIES[f.destination]?.label} · {f.weightG} g · ${f.goodsValue.toFixed(2)}
                      </div>
                      {overdue && (
                        <p className="text-xs text-cta mt-1">
                          Ship today, or send the buyer a delay note — silence is what turns a late parcel into a dispute.{" "}
                          <Link href="/seller/messages#templates" className="underline">Delay template →</Link>
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 items-end shrink-0">
                      <Link href="/seller/fulfillment" className="t-btn-primary">Buy label (rate-shop)</Link>
                      <div className="flex gap-1">
                        <input
                          className="t-input !w-44 !text-xs"
                          placeholder="or paste tracking #"
                          value={trackingDraft[f.id] ?? ""}
                          onChange={(e) => setTrackingDraft((m) => ({ ...m, [f.id]: e.target.value }))}
                        />
                        <button
                          className="t-btn-ghost disabled:opacity-40"
                          disabled={!trackingDraft[f.id]}
                          onClick={() => markShipped(f.id)}
                        >
                          Ship
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* -------- 2. Label bought, not marked shipped — the reminder -------- */}
      <section>
        <h2 className="font-bold text-navy mb-2">
          Label bought — not yet marked shipped ({labelBought.length})
        </h2>
        {labelBought.length > 0 && (
          <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900 mb-2">
            The parcel may already be with the carrier, but until you press <strong>Mark shipped</strong> the buyer&apos;s
            order page still says &ldquo;preparing&rdquo; and no tracking email goes out. This gap is one of the most
            common causes of &ldquo;where is my order?&rdquo; messages.
          </div>
        )}
        {labelBought.length === 0 ? (
          <div className="t-card p-6 text-center text-muted text-sm">None pending.</div>
        ) : (
          <div className="space-y-2">
            {labelBought.map((f) => (
              <div key={f.id} className="t-card p-4 flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-muted">{f.orderRef}</span>
                    <span className="font-semibold text-navy">{f.productTitle}</span>
                  </div>
                  <div className="text-xs text-muted mt-1">
                    {f.service} · <span className="font-mono">{f.tracking}</span>
                  </div>
                </div>
                <button className="t-btn-cta" onClick={() => markShipped(f.id)}>Mark shipped</button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* -------- Post-ship prompt: notify the buyer -------- */}
      {justShipped && (
        <div className="t-card p-4 border-teal/40 bg-teal-light/30">
          <h3 className="font-semibold text-navy text-sm">✓ Shipped. Tell the buyer?</h3>
          <p className="text-xs text-slate mt-1">
            The tracking number is already on their order page. A one-line personal note on top measurably reduces
            &ldquo;where is it&rdquo; messages — the shipping-notice template is pre-filled with this order.
          </p>
          <div className="flex gap-2 mt-3">
            <Link href="/seller/messages#templates" className="t-btn-primary">Open shipping-notice template</Link>
            <button className="t-btn-ghost" onClick={() => setJustShipped(null)}>Skip</button>
          </div>
        </div>
      )}

      {/* -------- 3. Done -------- */}
      <section>
        <h2 className="font-bold text-navy mb-2">Shipped / delivered ({done.length})</h2>
        <div className="t-card overflow-hidden">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-line">
              {done.map((f) => (
                <tr key={f.id}>
                  <td className="px-4 py-2 font-mono text-xs text-muted">{f.orderRef}</td>
                  <td className="px-4 py-2 text-slate">{f.productTitle}</td>
                  <td className="px-4 py-2 text-xs text-muted hidden sm:table-cell font-mono">{f.tracking}</td>
                  <td className="px-4 py-2 text-right">
                    <span className={`t-tag ${f.status === "delivered" ? "bg-emerald-100 text-emerald-700" : "bg-teal-light text-teal-dark"}`}>{f.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
