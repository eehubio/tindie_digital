"use client";

import { useApp } from "@/lib/store";
import { SectionTitle, Money } from "@/components/ui";
import { MfgStatus } from "@/lib/types";

const FLOW: MfgStatus[] = [
  "awaiting_files",
  "in_review",
  "in_production",
  "quality_check",
  "shipped",
  "delivered",
];

const LABEL: Record<MfgStatus, string> = {
  awaiting_files: "Awaiting files",
  in_review: "DFM review",
  in_production: "In production",
  quality_check: "Quality check",
  shipped: "Shipped",
  delivered: "Delivered",
};

const TONE: Record<MfgStatus, string> = {
  awaiting_files: "bg-panel text-slate",
  in_review: "bg-amber-100 text-amber-800",
  in_production: "bg-blue-100 text-blue-700",
  quality_check: "bg-violet-100 text-violet-700",
  shipped: "bg-teal-light text-teal-dark",
  delivered: "bg-emerald-100 text-emerald-700",
};

export default function PartnerOrdersPage() {
  const { orders, advanceOrder } = useApp();

  return (
    <div>
      <SectionTitle
        right={<span className="text-sm text-muted">{orders.length} active jobs</span>}
      >
        Production Queue
      </SectionTitle>

      <p className="text-sm text-muted mb-5 max-w-3xl">
        Partners only receive the file scope the seller authorised for manufacturing (Gerber / drill /
        pick-and-place). Full editable sources are released only when the seller has explicitly enabled
        it on the design.
      </p>

      <div className="space-y-4">
        {orders.map((o) => {
          const idx = FLOW.indexOf(o.status);
          const next = FLOW[Math.min(idx + 1, FLOW.length - 1)];
          const done = o.status === "delivered";
          return (
            <div key={o.id} className="t-card p-5">
              <div className="flex flex-wrap items-start gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-muted">{o.id}</span>
                    <span className={`t-tag ${TONE[o.status]}`}>{LABEL[o.status]}</span>
                  </div>
                  <h3 className="font-bold text-navy mt-1">{o.productTitle}</h3>
                  <p className="text-sm text-muted">
                    Buyer {o.buyerName} · Qty {o.quantity} · Placed {o.placedAt}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-navy">
                    <Money v={o.total} />
                  </div>
                  <div className="text-xs text-muted">order value</div>
                </div>
              </div>

              {/* Progress rail */}
              <div className="mt-4 flex items-center">
                {FLOW.map((s, i) => (
                  <div key={s} className="flex-1 flex items-center last:flex-none">
                    <div
                      className={`w-3 h-3 rounded-full shrink-0 ${
                        i <= idx ? "bg-teal" : "bg-line"
                      }`}
                      title={LABEL[s]}
                    />
                    {i < FLOW.length - 1 && (
                      <div className={`h-0.5 flex-1 ${i < idx ? "bg-teal" : "bg-line"}`} />
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-muted">
                <span>Files</span>
                <span>Review</span>
                <span>Production</span>
                <span>QC</span>
                <span>Shipped</span>
                <span>Delivered</span>
              </div>

              <div className="mt-4 pt-4 border-t border-line flex flex-wrap items-center gap-2">
                <button
                  className="t-btn-primary disabled:opacity-40"
                  disabled={done}
                  onClick={() => advanceOrder(o.id)}
                >
                  {done ? "Completed" : `Mark as ${LABEL[next]}`}
                </button>
                <button className="t-btn-ghost">Download manufacturing package</button>
                <button className="t-btn-ghost">Message buyer</button>
                <span className="ml-auto text-xs text-muted">
                  Last update: {o.timeline[o.timeline.length - 1]?.at}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
