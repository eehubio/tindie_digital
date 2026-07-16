"use client";

import { useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store";
import ShippoFlow from "@/components/ShippoFlow";
import { SectionTitle } from "@/components/ui";
import {
  CARRIERS,
  DEST_COUNTRIES,
  SHIP_ZONES,
  quoteShipping,
  mockShippoLabel,
  FulfillStatus,
} from "@/lib/shipping";

const STATUS: Record<FulfillStatus, { label: string; tone: string }> = {
  unfulfilled: { label: "Needs label", tone: "bg-amber-100 text-amber-800" },
  label_purchased: { label: "Label purchased", tone: "bg-blue-100 text-blue-700" },
  shipped: { label: "Shipped", tone: "bg-teal-light text-teal-dark" },
  delivered: { label: "Delivered", tone: "bg-emerald-100 text-emerald-700" },
};

export default function FulfillmentPage() {
  const { fulfillments, updateFulfillment, shipProfile, showToast } = useApp();
  const [open, setOpen] = useState<string | null>(fulfillments.find((f) => f.status === "unfulfilled")?.id ?? null);
  const [buying, setBuying] = useState<string | null>(null);

  return (
    <div>
      <SectionTitle
        right={
          <span className="t-tag bg-indigo-100 text-indigo-700">
            ⬢ Shippo connected · rates live
          </span>
        }
      >
        Fulfillment
      </SectionTitle>

      <p className="text-sm text-muted mb-5 max-w-3xl">
        Rate-shop across carriers, buy the label, and the tracking number is <strong>written back to the order
        automatically</strong> — the buyer is notified without the seller touching a tracking field. Manual entry stays
        available for carriers outside the aggregator (China Post, Yanwen), which is why the field is still editable.
      </p>

      <div className="space-y-3">
        {fulfillments.map((f) => {
          const d = DEST_COUNTRIES[f.destination];
          const zone = SHIP_ZONES[d.zone];
          const isOpen = open === f.id;
          const st = STATUS[f.status];

          return (
            <div key={f.id} className="t-card">
              <button
                className="w-full text-left p-4 flex flex-wrap items-center gap-3"
                onClick={() => setOpen(isOpen ? null : f.id)}
              >
                <span className="font-mono text-xs text-muted">{f.orderRef}</span>
                <span className={`t-tag ${st.tone}`}>{st.label}</span>
                <span className="font-semibold text-navy">{f.productTitle}</span>
                <span className="text-sm text-muted">
                  {f.buyerName} · {d.flag} {d.label} · {f.weightG} g
                </span>
                {f.tracking && (
                  <span className="text-xs font-mono text-teal-dark bg-teal-light px-2 py-0.5 rounded">
                    {f.tracking}
                  </span>
                )}
                <span className="ml-auto text-link text-sm">{isOpen ? "Close" : "Open"}</span>
              </button>

              {isOpen && (
                <div className="border-t border-line p-4 grid lg:grid-cols-[1fr_320px] gap-5">
                  {/* Rate shopping */}
                  <div>
                    <h4 className="font-semibold text-navy text-sm mb-2">
                      Shipping to {d.flag} {d.label} · {f.weightG} g
                    </h4>
                    {f.status === "unfulfilled" ? (
                      /* The real integration: shipment → rates → transaction,
                         via /api/shippo/* in Shippo's exact schema. */
                      <ShippoFlow f={f} />
                    ) : (
                      <div className="t-card p-3 bg-white text-sm text-slate">
                        Label purchased{f.service ? ` — ${f.service}` : ""}
                        {f.tracking && (
                          <span className="font-mono text-teal-dark ml-2">{f.tracking}</span>
                        )}
                        {typeof f.labelCost === "number" && (
                          <span className="text-muted ml-2">(${f.labelCost.toFixed(2)})</span>
                        )}
                      </div>
                    )}

                    {/* Manual override */}
                    <div className="mt-4 pt-4 border-t border-line grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="t-label">Carrier (manual)</label>
                        <select
                          className="t-input"
                          value={f.carrierId ?? ""}
                          onChange={(e) => updateFulfillment(f.id, { carrierId: e.target.value })}
                        >
                          <option value="">Select…</option>
                          {CARRIERS.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                              {c.shippo ? " (Shippo)" : " (manual)"}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="t-label">Tracking number</label>
                        <input
                          className="t-input"
                          value={f.tracking ?? ""}
                          placeholder="Paste tracking number"
                          onChange={(e) => updateFulfillment(f.id, { tracking: e.target.value })}
                        />
                      </div>
                    </div>
                    <p className="t-hint mt-2">
                      Auto-filled after a Shippo label purchase. Editable, because not every corridor is served by the
                      aggregator.
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        className="t-btn-cta disabled:opacity-40"
                        disabled={!f.tracking || f.status === "shipped" || f.status === "delivered"}
                        onClick={() => {
                          updateFulfillment(f.id, { status: "shipped" });
                          showToast("Marked as shipped — buyer notified with tracking");
                        }}
                      >
                        Mark as shipped &amp; notify buyer
                      </button>
                      <Link href={`/seller/packslips?order=${f.id}`} className="t-btn-ghost">
                        Print packing slip
                      </Link>
                      {f.destination !== "US" && (
                        <a
                          href={`/api/shippo/invoice?ref=${encodeURIComponent(f.orderRef)}&buyer=${encodeURIComponent(
                            f.buyerName
                          )}&addr=${encodeURIComponent((f.address ?? []).slice(1).join("|"))}&item=${encodeURIComponent(
                            f.productTitle
                          )}&qty=${f.qty ?? 1}&value=${(f.goodsValue / (f.qty ?? 1)).toFixed(2)}&tn=${encodeURIComponent(
                            f.tracking ?? ""
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="t-btn-ghost"
                        >
                          Download commercial invoice (PDF)
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Order economics */}
                  <aside className="border border-line rounded-lg bg-panel/60 p-4">
                    <h4 className="font-semibold text-navy text-sm mb-2">This order&apos;s economics</h4>
                    <dl className="text-sm space-y-1">
                      <Ln k="Goods" v={f.goodsValue} />
                      <Ln k="Label cost" v={-(f.labelCost ?? 0)} />
                      <Ln k="Platform fee (5%)" v={-f.goodsValue * 0.05} />
                      <Ln k="Payment cost" v={-(f.goodsValue * 0.029 + 0.3)} />
                      <div className="flex justify-between border-t border-line pt-1.5 mt-1.5 font-bold text-navy">
                        <dt>Net</dt>
                        <dd>
                          $
                          {(
                            f.goodsValue -
                            (f.labelCost ?? 0) -
                            f.goodsValue * 0.05 -
                            (f.goodsValue * 0.029 + 0.3)
                          ).toFixed(2)}
                        </dd>
                      </div>
                    </dl>
                    <p className="text-[11px] text-muted mt-3 leading-relaxed">
                      Shipping is charged to the buyer at the rate quoted from this same profile, so a label bought here
                      matches what was collected at checkout. Divergence between the two is the classic way a small
                      hardware seller quietly loses money.
                    </p>
                    {shipProfile.iossRegistered && DEST_COUNTRIES[f.destination].ioss && (
                      <p className="text-[11px] text-teal-dark mt-2">
                        ✓ IOSS: VAT was collected at checkout — the commercial invoice carries the IOSS number, so the
                        buyer pays nothing on delivery.
                      </p>
                    )}
                  </aside>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Ln({ k, v }: { k: string; v: number }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted">{k}</dt>
      <dd className={v < 0 ? "text-slate" : ""}>
        {v < 0 ? "-" : ""}${Math.abs(v).toFixed(2)}
      </dd>
    </div>
  );
}
