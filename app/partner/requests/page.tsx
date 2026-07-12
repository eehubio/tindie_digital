"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";

export default function PartnerRequests() {
  const { quotes, advanceQuote } = useApp();
  const [editing, setEditing] = useState<string | null>(null);
  const [costs, setCosts] = useState({ pcb: 120, assembly: 380, components: 90, shipping: 22 });
  const [lead, setLead] = useState(9);

  const total = costs.pcb + costs.assembly + costs.components + costs.shipping;

  function sendQuote(id: string) {
    advanceQuote(id, "quoted", { quotedTotal: total, leadTimeDays: lead });
    setEditing(null);
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-navy mb-4">Quote requests</h1>
      <div className="space-y-3">
        {quotes.map((q) => (
          <div key={q.id} className="t-card p-4 bg-white">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h3 className="font-semibold text-navy">{q.productTitle}</h3>
                <p className="text-sm text-muted mt-1">
                  {q.buyerName} · {q.quantity} units · {q.requestedServices.join(", ")} · ship to {q.destinationCountry}
                </p>
                {q.notes && <p className="text-xs text-slate mt-1 italic">&ldquo;{q.notes}&rdquo;</p>}
              </div>
              <div className="text-right">
                <span className="t-tag bg-panel text-slate capitalize">{q.status.replace(/_/g, " ")}</span>
                {q.quotedTotal && <div className="text-sm font-bold text-navy mt-1">${q.quotedTotal} · {q.leadTimeDays}d</div>}
              </div>
            </div>

            {(q.status === "submitted" || q.status === "partner_review") && (
              editing === q.id ? (
                <div className="mt-4 border-t border-line pt-4">
                  <h4 className="font-semibold text-navy text-sm mb-3">Build a quote</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {(["pcb", "assembly", "components", "shipping"] as const).map((k) => (
                      <div key={k}>
                        <label className="t-label capitalize">{k}</label>
                        <div className="flex items-center gap-1">
                          <span className="text-muted text-sm">$</span>
                          <input type="number" className="t-input py-1" value={costs[k]}
                            onChange={(e) => setCosts((c) => ({ ...c, [k]: Number(e.target.value) }))} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-end gap-3 mt-3">
                    <div className="w-32">
                      <label className="t-label">Lead time (days)</label>
                      <input type="number" className="t-input py-1" value={lead} onChange={(e) => setLead(Number(e.target.value))} />
                    </div>
                    <div className="ml-auto text-right">
                      <div className="text-xs text-muted">Total</div>
                      <div className="text-xl font-bold text-navy">${total}</div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button className="t-btn-primary" onClick={() => sendQuote(q.id)}>Send quote</button>
                    <button className="t-btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button className="t-btn-primary mt-3 text-sm" onClick={() => setEditing(q.id)}>Prepare quote</button>
              )
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
