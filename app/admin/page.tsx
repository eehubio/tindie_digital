"use client";

import Link from "next/link";
import { useApp } from "@/lib/store";
import { partners, products, paymentConfig, seedIpComplaints } from "@/lib/mock";
import { SectionTitle } from "@/components/ui";
import { computePayment } from "@/lib/engine";

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="t-card p-4">
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${tone ?? "text-navy"}`}>{value}</div>
      {sub && <div className="text-xs text-muted mt-1">{sub}</div>}
    </div>
  );
}

export default function AdminPage() {
  const { quotes, orders, disputes } = useApp();

  const activePartners = partners.filter((p) => p.status === "active").length;
  const openDisputes = disputes.filter((d) => !d.status.startsWith("resolved")).length;
  const gmv = orders.reduce((s, o) => s + o.total, 0);

  // Illustrative: what a lone $5 asset costs the platform vs. a bundled cart.
  const lone = computePayment(
    [
      {
        key: "x",
        productId: "p",
        productTitle: "Single $5 asset",
        productType: "digital",
        fulfillmentType: "download",
        sellerName: "-",
        unitPrice: 5,
        qty: 1,
      },
    ],
    paymentConfig
  );
  const bundled = computePayment(
    [
      {
        key: "a",
        productId: "p",
        productTitle: "Bundle",
        productType: "digital",
        fulfillmentType: "download",
        sellerName: "-",
        unitPrice: 5,
        qty: 4,
      },
    ],
    paymentConfig
  );

  return (
    <div>
      <SectionTitle>Marketplace Overview</SectionTitle>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Published designs" value={String(products.length)} sub="digital assets & services" />
        <Stat label="Active partners" value={String(activePartners)} sub={`${partners.length} total in network`} />
        <Stat label="Quote requests" value={String(quotes.length)} sub="across all partners" />
        <Stat
          label="Open disputes"
          value={String(openDisputes)}
          sub={`${disputes.length} lifetime`}
          tone={openDisputes ? "text-danger" : "text-navy"}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mt-6">
        <div className="lg:col-span-2 t-card p-5">
          <h3 className="font-bold text-navy mb-1">Small-order payment economics</h3>
          <p className="text-sm text-muted mb-4">
            The structural problem with digital assets: Stripe&apos;s fixed{" "}
            ${paymentConfig.stripeFixedFee.toFixed(2)} fee dominates a $5 sale. Two levers are configured
            here — a fee-free threshold and consolidated cart checkout (one charge per cart, not per item).
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="border border-line rounded-lg p-4">
              <div className="text-xs font-semibold text-danger uppercase tracking-wide">
                Single $5 asset, alone
              </div>
              <dl className="mt-2 text-sm space-y-1">
                <div className="flex justify-between">
                  <dt className="text-muted">Buyer pays</dt>
                  <dd>${lone.buyerTotal.toFixed(2)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Small-order fee</dt>
                  <dd>${lone.smallOrderFee.toFixed(2)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Stripe fee</dt>
                  <dd className="text-danger">${lone.stripeFee.toFixed(2)}</dd>
                </div>
                <div className="flex justify-between font-semibold border-t border-line pt-1 mt-1">
                  <dt>Stripe as % of goods</dt>
                  <dd className="text-danger">{lone.stripeFeePctOfGross.toFixed(1)}%</dd>
                </div>
              </dl>
            </div>
            <div className="border border-teal/40 bg-teal-light/40 rounded-lg p-4">
              <div className="text-xs font-semibold text-teal-dark uppercase tracking-wide">
                Four $5 assets, one cart
              </div>
              <dl className="mt-2 text-sm space-y-1">
                <div className="flex justify-between">
                  <dt className="text-muted">Buyer pays</dt>
                  <dd>${bundled.buyerTotal.toFixed(2)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Small-order fee</dt>
                  <dd>${bundled.smallOrderFee.toFixed(2)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Stripe fee</dt>
                  <dd>${bundled.stripeFee.toFixed(2)}</dd>
                </div>
                <div className="flex justify-between font-semibold border-t border-teal/30 pt-1 mt-1">
                  <dt>Stripe as % of goods</dt>
                  <dd className="text-teal-dark">{bundled.stripeFeePctOfGross.toFixed(1)}%</dd>
                </div>
              </dl>
            </div>
          </div>
          <Link href="/admin/payments" className="inline-block mt-4 text-link text-sm hover:underline">
            Tune payment configuration →
          </Link>
        </div>

        <div className="t-card p-5">
          <h3 className="font-bold text-navy mb-3">Needs attention</h3>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2">
              <span className="w-2 h-2 rounded-full bg-danger mt-1.5 shrink-0" />
              <span>
                <Link href="/admin/disputes" className="text-link hover:underline">
                  {openDisputes} open dispute{openDisputes === 1 ? "" : "s"}
                </Link>{" "}
                awaiting mediation.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-2 h-2 rounded-full bg-tag mt-1.5 shrink-0" />
              <span>
                <Link href="/admin/ip" className="text-link hover:underline">
                  {seedIpComplaints.filter((c) => c.status !== "dismissed" && c.status !== "removed").length} IP
                  complaint(s)
                </Link>{" "}
                in review.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-2 h-2 rounded-full bg-muted mt-1.5 shrink-0" />
              <span>
                <Link href="/admin/partners" className="text-link hover:underline">
                  {partners.filter((p) => p.status === "draft").length} partners in draft
                </Link>{" "}
                — not yet visible in routing.
              </span>
            </li>
          </ul>

          <h3 className="font-bold text-navy mt-6 mb-2">Manufacturing GMV</h3>
          <div className="text-2xl font-bold text-navy">${gmv.toFixed(2)}</div>
          <p className="text-xs text-muted mt-1">
            Routed through partners; commission is set per partner, not globally.
          </p>
        </div>
      </div>
    </div>
  );
}
