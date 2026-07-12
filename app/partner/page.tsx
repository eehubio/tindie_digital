"use client";

import Link from "next/link";
import { useApp } from "@/lib/store";

export default function PartnerDashboard() {
  const { quotes } = useApp();
  const open = quotes.filter((q) => q.status === "submitted" || q.status === "partner_review");
  const stats = [
    ["New requests", String(open.length)],
    ["Awaiting quote", String(open.length)],
    ["In production", "1"],
    ["On-time rate", "96%"],
  ];
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-navy">Partner Dashboard — Huaqiu (HQ)</h1>
        <span className="t-tag bg-teal-light text-teal-dark">Active · Strategic partner</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map(([k, v]) => (
          <div key={k} className="t-card p-4"><div className="text-xs text-muted uppercase">{k}</div><div className="text-2xl font-bold text-navy mt-1">{v}</div></div>
        ))}
      </div>
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-navy">New quote requests</h2>
          <Link href="/partner/requests" className="text-link text-sm font-semibold hover:underline">View all →</Link>
        </div>
        <div className="space-y-2">
          {open.length === 0 && <div className="t-card p-6 text-center text-muted">No open requests.</div>}
          {open.map((q) => (
            <Link key={q.id} href="/partner/requests" className="t-card p-3 flex items-center justify-between text-sm bg-white hover:shadow-card transition">
              <div>
                <span className="font-semibold text-navy">{q.productTitle}</span>
                <span className="text-muted"> · {q.quantity} units · {q.requestedServices.join(", ")} · to {q.destinationCountry}</span>
              </div>
              <span className="t-btn-primary py-1 text-xs">Quote</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
