"use client";

import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { computePayment } from "@/lib/engine";
import { paymentConfig } from "@/lib/mock";
import { Money } from "@/components/ui";
import Link from "next/link";

export default function CartPage() {
  const router = useRouter();
  const { cart, removeFromCart, clearCart, addEntitlement, showToast } = useApp();
  const pay = computePayment(cart, paymentConfig);

  function checkout() {
    // Simulate: grant entitlements for each digital item
    cart
      .filter((c) => c.productType === "digital")
      .forEach((c) =>
        addEntitlement({
          id: "ent_" + Math.random().toString(36).slice(2, 7),
          productId: c.productId,
          productTitle: c.productTitle,
          licenseName: c.licenseName ?? "License",
          grantedAt: new Date().toISOString().slice(0, 10),
          downloadLimit: 10,
          downloadCount: 0,
          version: "1.0.0",
          status: "active",
        })
      );
    clearCart();
    showToast("Payment simulated — files unlocked in your library");
    router.push("/library");
  }

  if (cart.length === 0) {
    return (
      <div className="max-w-lg mx-auto t-card p-10 text-center">
        <h1 className="text-xl font-bold text-navy">Your cart is empty</h1>
        <p className="text-muted mt-2">Add a design license and it&apos;ll show up here.</p>
        <Link href="/search" className="t-btn-primary mt-4">Browse designs</Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
      <div>
        <h1 className="text-xl font-bold text-navy mb-4">Cart</h1>
        <div className="space-y-3">
          {cart.map((c) => (
            <div key={c.key} className="t-card p-4 flex items-center gap-4 bg-white">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`t-tag ${c.productType === "digital" ? "bg-navy text-white" : "bg-sky-100 text-sky-700"}`}>
                    {c.productType}
                  </span>
                  <h3 className="font-semibold text-navy truncate">{c.productTitle}</h3>
                </div>
                <p className="text-sm text-muted mt-1">
                  {c.licenseName} · sold by {c.sellerName} · {c.fulfillmentType.replace(/_/g, " ")}
                </p>
              </div>
              <div className="text-right">
                <div className="font-bold text-navy"><Money v={c.unitPrice * c.qty} /></div>
                <button className="text-xs text-danger hover:underline mt-1" onClick={() => removeFromCart(c.key)}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* The teaching moment: consolidate to beat the fixed fee */}
        {pay.smallOrderFee > 0 && (
          <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900">
            <strong>Small order fee applies.</strong> Your digital subtotal is under $
            {paymentConfig.digitalMinimumWithoutFee}. Add another design to cross the threshold and the $
            {paymentConfig.smallOrderFee.toFixed(2)} fee is waived — one Stripe charge covers the whole cart, so the
            fixed ${paymentConfig.stripeFixedFee.toFixed(2)} fee is paid only once.
          </div>
        )}
      </div>

      {/* Payment breakdown */}
      <aside className="lg:sticky lg:top-4 border border-line rounded-lg bg-white shadow-card p-5">
        <h2 className="font-bold text-navy mb-3">Order summary</h2>
        <dl className="space-y-2 text-sm">
          <Line k="Digital subtotal" v={pay.grossDigital} />
          {pay.smallOrderFee > 0 && <Line k="Small order fee" v={pay.smallOrderFee} muted />}
          <div className="border-t border-line pt-2 flex justify-between font-bold text-navy">
            <span>You pay</span>
            <span><Money v={pay.buyerTotal} /></span>
          </div>
        </dl>

        <button className="t-btn-cta w-full mt-4" onClick={checkout}>
          Pay <Money v={pay.buyerTotal} /> (simulated)
        </button>

        {/* Behind the scenes — the economics the seller cares about */}
        <details className="mt-4 group">
          <summary className="cursor-pointer text-xs font-semibold text-link">
            Show fee economics (seller view)
          </summary>
          <dl className="mt-2 space-y-1.5 text-xs text-muted">
            <Line k="Stripe fee (2.9% + $0.30)" v={pay.stripeFee} small />
            <Line k="Platform fee (10%)" v={pay.platformFee} small />
            <div className="border-t border-line pt-1.5 flex justify-between font-semibold text-slate">
              <span>Seller net</span>
              <span><Money v={pay.sellerNet} /></span>
            </div>
            <div className="flex justify-between pt-1">
              <span>Stripe fee as % of subtotal</span>
              <span className={pay.stripeFeePctOfGross > 12 ? "text-danger font-semibold" : "text-ok font-semibold"}>
                {pay.stripeFeePctOfGross}%
              </span>
            </div>
          </dl>
          <p className="text-[11px] text-muted mt-2 leading-relaxed">
            On a lone $5 asset the fixed $0.30 is ~9% of the sale. Bundling assets into one charge spreads that fixed
            cost, which is why the cart consolidates digital items and applies a small-order fee instead of raising
            every price.
          </p>
        </details>
      </aside>
    </div>
  );
}

function Line({ k, v, muted, small }: { k: string; v: number; muted?: boolean; small?: boolean }) {
  return (
    <div className={`flex justify-between ${muted ? "text-muted" : ""} ${small ? "" : ""}`}>
      <dt>{k}</dt>
      <dd><Money v={v} /></dd>
    </div>
  );
}
