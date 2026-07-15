"use client";

import Link from "next/link";
import { useApp } from "@/lib/store";
import { VerifyBadge, Money } from "@/components/ui";

export default function SellerDashboard() {
  const { fulfillments, questions } = useApp();
  const products = useApp((st) => st.allProducts)().filter((p) => p.sellerName === "SuLab");

  // ---- Pending work, computed from real state — every card is a LINK. ----
  const toShip = fulfillments.filter((f) => f.status === "unfulfilled");
  const overdue = toShip.filter((f) => daysSince(f.placedAt) > 3); // past handling window
  const shippedNotMarked = fulfillments.filter((f) => f.status === "label_purchased");
  const unanswered = questions.filter((q) => !q.answer);

  const kpis: { label: string; value: string; href: string; hint: string; alert?: boolean }[] = [
    { label: "Available balance", value: "$1,284.50", href: "/seller/payouts", hint: "Withdraw via Stripe / Wise →" },
    { label: "Clearing", value: "$342.18", href: "/seller/payouts#clearing", hint: "Releases T+2 (Stripe corridor) →" },
    { label: "Orders to ship", value: String(toShip.length + shippedNotMarked.length), href: "/seller/orders-action", hint: "Buy labels & mark shipped →", alert: overdue.length > 0 },
    { label: "Unanswered messages", value: String(unanswered.length), href: "/seller/messages", hint: "Buyers are waiting →", alert: unanswered.length > 0 },
  ];

  // ---- "Needs your attention" — each row links to the page that fixes it. ----
  const attention: { text: string; href: string; cta: string; tone: "warn" | "info" }[] = [
    ...(overdue.length > 0
      ? [{ text: `${overdue.length} order(s) past your handling window — buy the label today or message the buyer about the delay.`, href: "/seller/orders-action", cta: "Ship now", tone: "warn" as const }]
      : []),
    ...(shippedNotMarked.length > 0
      ? [{ text: `${shippedNotMarked.length} label(s) purchased but not marked shipped — the buyer still sees "preparing". Mark shipped so tracking goes out.`, href: "/seller/orders-action", cta: "Mark shipped", tone: "warn" as const }]
      : []),
    ...(unanswered.length > 0
      ? [{ text: `${unanswered.length} buyer question(s) unanswered. Answers publish on the product page — good answers sell the next unit.`, href: "/seller/messages", cta: "Answer", tone: "info" as const }]
      : []),
    { text: "Pocket Logic Analyzer preorder is at 37/50 — one update post to backers historically converts 3–5 fence-sitters.", href: "/seller/build", cta: "Post update", tone: "info" },
    { text: "Your Wise-corridor reserve drops from 10% to 5% in 12 days if no dispute lands. One open dispute resets the clock.", href: "/seller/payouts", cta: "View", tone: "info" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-navy">Seller Dashboard</h1>
        <Link href="/seller/new" className="t-btn-primary">+ New listing</Link>
      </div>

      {/* KPI cards — every one is clickable and lands on the page that acts on it */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <Link key={k.label} href={k.href} className={`t-card p-4 block hover:shadow-card transition ${k.alert ? "border-cta/50" : ""}`}>
            <div className="text-xs text-muted uppercase">{k.label}</div>
            <div className={`text-2xl font-bold mt-1 ${k.alert ? "text-cta" : "text-navy"}`}>{k.value}</div>
            <div className="text-[11px] text-link mt-1">{k.hint}</div>
          </Link>
        ))}
      </div>

      {/* Needs your attention */}
      <div className="t-card p-4">
        <h2 className="font-bold text-navy mb-3">Needs your attention</h2>
        <div className="space-y-2">
          {attention.map((a, i) => (
            <div key={i} className={`flex items-center gap-3 rounded-lg border p-3 ${a.tone === "warn" ? "border-cta/40 bg-orange-50/50" : "border-line bg-panel/50"}`}>
              <span className={`w-2 h-2 rounded-full shrink-0 ${a.tone === "warn" ? "bg-cta" : "bg-teal"}`} />
              <p className="text-sm text-slate flex-1">{a.text}</p>
              <Link href={a.href} className={a.tone === "warn" ? "t-btn-cta" : "t-btn-ghost"}>{a.cta}</Link>
            </div>
          ))}
        </div>
      </div>

      {/* Listings — physical, bundle, preorder, digital all in one table */}
      <div>
        <h2 className="font-bold text-navy mb-3">Your listings</h2>
        <div className="t-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-panel text-xs uppercase text-muted">
              <tr>
                <th className="text-left px-4 py-2">Listing</th>
                <th className="text-left px-4 py-2 hidden sm:table-cell">Type</th>
                <th className="text-right px-4 py-2 hidden md:table-cell">Stock</th>
                <th className="text-right px-4 py-2">Price</th>
                <th className="text-right px-4 py-2">Status</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {products.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3">
                    <Link href={`/product/${p.slug}`} className="font-semibold text-navy hover:text-teal-dark">{p.title}</Link>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className={`t-tag ${p.preorderCampaignSlug ? "bg-tag text-white" : p.productType === "physical" ? "bg-teal-light text-teal-dark" : p.productType === "bundle" ? "bg-indigo-100 text-indigo-700" : "bg-panel text-slate"}`}>
                      {p.preorderCampaignSlug ? "preorder" : p.productType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right hidden md:table-cell text-muted">
                    {p.productType === "digital" ? "∞" : p.preorderCampaignSlug ? "37/50" : p.stock}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-teal-dark">
                    <Money v={p.price ?? (p.licenses.length ? Math.min(...p.licenses.map((l) => l.price)) : 0)} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {p.verifyLevel > 0 ? <VerifyBadge level={p.verifyLevel} version={p.verifiedVersion} /> : <span className="text-muted text-xs">Draft</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/seller/manage/${p.slug}`} className="t-btn-ghost">Manage</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="t-hint mt-2">
          Manage = the listing after publish: edit price/stock/description, post version notes, answer questions. A listing is alive, not archived.
        </p>
      </div>

      {/* Analytics — merged in, no separate tab */}
      <div className="t-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-navy">Sales analytics (30d)</h2>
          <div className="flex gap-4 text-xs text-muted">
            <span>Revenue <strong className="text-navy">$1,842</strong></span>
            <span>Downloads <strong className="text-navy">845</strong></span>
            <span>Refund rate <strong className="text-navy">1.1%</strong></span>
            <span>Design→Make <strong className="text-navy">18%</strong></span>
          </div>
        </div>
        <div className="flex items-end gap-3 h-40">
          {([["Feb", 40], ["Mar", 62], ["Apr", 55], ["May", 78], ["Jun", 92], ["Jul", 110]] as const).map(([m, v]) => (
            <div key={m} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full bg-teal rounded-t" style={{ height: `${(v / 120) * 100}%` }} />
              <span className="text-xs text-muted">{m}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}
