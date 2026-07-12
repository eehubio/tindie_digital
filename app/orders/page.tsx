"use client";

import { useApp } from "@/lib/store";
import { MfgStatus } from "@/lib/types";
import { Money } from "@/components/ui";

const STEPS: { key: MfgStatus; label: string }[] = [
  { key: "awaiting_files", label: "Files" },
  { key: "in_review", label: "DFM review" },
  { key: "in_production", label: "Production" },
  { key: "quality_check", label: "QC" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
];

export default function OrdersPage() {
  const { orders, advanceOrder } = useApp();

  return (
    <div>
      <h1 className="text-xl font-bold text-navy mb-4">Manufacturing Orders</h1>
      {orders.length === 0 ? (
        <div className="t-card p-10 text-center text-muted">No manufacturing orders yet.</div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => {
            const activeIdx = STEPS.findIndex((s) => s.key === o.status);
            return (
              <div key={o.id} className="t-card p-4 bg-white">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h3 className="font-semibold text-navy">{o.productTitle}</h3>
                    <p className="text-sm text-muted mt-1">
                      {o.quantity} units · {o.partnerName} · placed {o.placedAt}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-navy"><Money v={o.total} /></div>
                    <span className="t-tag bg-teal-light text-teal-dark mt-1 capitalize">
                      {o.status.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>

                {/* Progress tracker */}
                <div className="flex items-center mt-5">
                  {STEPS.map((s, i) => (
                    <div key={s.key} className="flex-1 flex items-center">
                      <div className="flex flex-col items-center flex-1">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                            i <= activeIdx ? "bg-teal text-white" : "bg-panel text-muted border border-line"
                          }`}
                        >
                          {i < activeIdx ? "✓" : i + 1}
                        </div>
                        <span className="text-[10px] text-muted mt-1 text-center">{s.label}</span>
                      </div>
                      {i < STEPS.length - 1 && (
                        <div className={`h-0.5 flex-1 -mt-4 ${i < activeIdx ? "bg-teal" : "bg-line"}`} />
                      )}
                    </div>
                  ))}
                </div>

                <details className="mt-4">
                  <summary className="text-xs font-semibold text-link cursor-pointer">Timeline</summary>
                  <ul className="mt-2 space-y-1.5">
                    {o.timeline.map((t, i) => (
                      <li key={i} className="text-xs text-muted flex gap-2">
                        <span className="font-mono text-slate">{t.at}</span>
                        <span className="capitalize font-medium text-slate">{t.status.replace(/_/g, " ")}:</span>
                        <span>{t.note}</span>
                      </li>
                    ))}
                  </ul>
                </details>

                {o.status !== "delivered" && (
                  <button className="t-btn-ghost mt-3 text-sm" onClick={() => advanceOrder(o.id)}>
                    Simulate next status →
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
