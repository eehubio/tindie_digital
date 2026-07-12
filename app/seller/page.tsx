"use client";

import Link from "next/link";
import { products } from "@/lib/mock";
import { useApp } from "@/lib/store";
import { VerifyBadge, Money } from "@/components/ui";

export default function SellerDashboard() {
  const { quotes } = useApp();
  const myProducts = products.filter((p) => p.sellerName === "SuLab" || p.category !== "reference_design");

  const stats = [
    ["Digital GMV (30d)", "$1,842"],
    ["Downloads", "845"],
    ["Design→Make rate", "18%"],
    ["Avg. rating", "4.8"],
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-navy">Seller Dashboard</h1>
        <Link href="/seller/new" className="t-btn-primary">+ New digital design</Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map(([k, v]) => (
          <div key={k} className="t-card p-4">
            <div className="text-xs text-muted uppercase">{k}</div>
            <div className="text-2xl font-bold text-navy mt-1">{v}</div>
          </div>
        ))}
      </div>

      <div>
        <h2 className="font-bold text-navy mb-3">Your designs</h2>
        <div className="t-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-panel text-xs uppercase text-muted">
              <tr>
                <th className="text-left px-4 py-2">Design</th>
                <th className="text-left px-4 py-2 hidden sm:table-cell">Status</th>
                <th className="text-right px-4 py-2">Downloads</th>
                <th className="text-right px-4 py-2">From</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {myProducts.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3">
                    <Link href={`/product/${p.slug}`} className="font-semibold text-navy hover:text-teal-dark">
                      {p.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {p.verifyLevel > 0 ? <VerifyBadge level={p.verifyLevel} version={p.verifiedVersion} /> : <span className="text-muted">Draft</span>}
                  </td>
                  <td className="px-4 py-3 text-right">{p.downloads}</td>
                  <td className="px-4 py-3 text-right font-semibold text-teal-dark">
                    <Money v={Math.min(...p.licenses.map((l) => l.price))} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="font-bold text-navy mb-3">Recent quote requests on your designs</h2>
        <div className="space-y-2">
          {quotes.map((q) => (
            <div key={q.id} className="t-card p-3 flex items-center justify-between text-sm bg-white">
              <div>
                <span className="font-semibold text-navy">{q.productTitle}</span>
                <span className="text-muted"> · {q.quantity} units → {q.partnerName}</span>
              </div>
              <span className="t-tag bg-panel text-slate capitalize">{q.status.replace(/_/g, " ")}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
