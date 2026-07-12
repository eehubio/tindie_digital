"use client";

import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { computePayment } from "@/lib/engine";
import { paymentConfig } from "@/lib/mock";
import { Money } from "@/components/ui";
import { DEST_COUNTRIES, SHIP_ZONES, quoteShipping, customsHint } from "@/lib/shipping";
import { useState } from "react";
import Link from "next/link";

export default function CartPage() {
  const router = useRouter();
  const {
    cart,
    addToCart,
    removeFromCart,
    clearCart,
    addEntitlement,
    showToast,
    shipProfile,
    destination,
    setDestination,
  } = useApp();

  const digitalPay = computePayment(cart, paymentConfig);
  const physical = cart.filter((c) => c.productType === "physical");
  const hasPhysical = physical.length > 0;

  const dest = DEST_COUNTRIES[destination];
  const zone = SHIP_ZONES[dest.zone];
  const blocked = shipProfile.blockedZones.includes(dest.zone);

  const [methodId, setMethodId] = useState(zone.methods[0].id);
  const method = zone.methods.find((m) => m.id === methodId) ?? zone.methods[0];

  // Combined shipping: one parcel, rated once on the total weight.
  const shipWeight = physical.reduce((s, c) => s + (c.weightG ?? shipProfile.weightG) * c.qty, 0);
  const shipCost = hasPhysical && !blocked ? quoteShipping(dest.zone, method, shipWeight, shipProfile) : 0;

  const physicalGoods = physical.reduce((s, c) => s + c.unitPrice * c.qty, 0);
  const goodsValue = digitalPay.grossDigital + physicalGoods;
  const hint = customsHint(destination, goodsValue, shipProfile);
  const vat = hasPhysical ? hint.vatCollected : 0;

  const buyerTotal = goodsValue + digitalPay.smallOrderFee + shipCost + vat;

  function checkout() {
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
    showToast(
      hasPhysical
        ? "Payment simulated — files unlocked, board queued for fulfillment"
        : "Payment simulated — files unlocked in your library"
    );
    router.push("/library");
  }

  if (cart.length === 0) {
    return (
      <div className="max-w-lg mx-auto t-card p-10 text-center">
        <h1 className="text-xl font-bold text-navy">Your cart is empty</h1>
        <p className="text-muted mt-2">Add a design license and it&apos;ll show up here.</p>
        <Link href="/search" className="t-btn-primary mt-4">
          Browse designs
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
      <div>
        <h1 className="text-xl font-bold text-navy mb-4">Cart</h1>
        <div className="space-y-3">
          {cart.map((c) => (
            <div key={c.key} className="t-card p-4 flex items-center gap-4 bg-white">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`t-tag ${
                      c.productType === "digital" ? "bg-navy text-white" : "bg-sky-100 text-sky-700"
                    }`}
                  >
                    {c.productType}
                  </span>
                  <h3 className="font-semibold text-navy truncate">{c.productTitle}</h3>
                </div>
                <p className="text-sm text-muted mt-1">
                  {c.licenseName ? `${c.licenseName} · ` : ""}sold by {c.sellerName} ·{" "}
                  {c.fulfillmentType.replace(/_/g, " ")}
                  {c.weightG ? ` · ${c.weightG} g` : ""}
                </p>
              </div>
              <div className="text-right">
                <div className="font-bold text-navy">
                  <Money v={c.unitPrice * c.qty} />
                </div>
                <button className="text-xs text-danger hover:underline mt-1" onClick={() => removeFromCart(c.key)}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Upsell that also demonstrates a mixed digital + physical cart */}
        {!hasPhysical && (
          <button
            className="mt-3 w-full text-left t-card p-4 border-dashed hover:border-teal transition"
            onClick={() =>
              addToCart({
                key: "phys_rs485",
                productId: "dp_rs485",
                productTitle: "RS485 ↔ TTL Module — assembled board",
                productType: "physical",
                fulfillmentType: "shipping",
                sellerName: "Aricore",
                unitPrice: 19.99,
                qty: 1,
                weightG: 42,
              })
            }
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔌</span>
              <div className="flex-1">
                <div className="font-semibold text-navy text-sm">
                  Don&apos;t want to build it? Add the assembled board — $19.99
                </div>
                <p className="text-xs text-muted">
                  Puts a physical item in this cart, so shipping, customs and VAT enter the same single charge.
                </p>
              </div>
              <span className="t-btn-ghost text-sm">Add</span>
            </div>
          </button>
        )}

        {digitalPay.smallOrderFee > 0 && (
          <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900">
            <strong>Small order fee applies.</strong> Your digital subtotal is under $
            {paymentConfig.digitalMinimumWithoutFee}. Add another design and the $
            {paymentConfig.smallOrderFee.toFixed(2)} fee is waived — one Stripe charge covers the whole cart, so the
            fixed ${paymentConfig.stripeFixedFee.toFixed(2)} is paid only once.
          </div>
        )}
      </div>

      <aside className="lg:sticky lg:top-4 border border-line rounded-lg bg-white shadow-card p-5">
        <h2 className="font-bold text-navy mb-3">Order summary</h2>

        {hasPhysical && (
          <div className="mb-4 pb-4 border-b border-line">
            <label className="t-label">Shipping to</label>
            <select
              className="t-input"
              value={destination}
              onChange={(e) => {
                setDestination(e.target.value);
                setMethodId(SHIP_ZONES[DEST_COUNTRIES[e.target.value].zone].methods[0].id);
              }}
            >
              {Object.entries(DEST_COUNTRIES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.flag} {v.label}
                </option>
              ))}
            </select>

            {blocked ? (
              <div className="mt-3 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                This seller does not ship to {dest.label}. Remove the physical item, or buy the design files alone —
                those deliver instantly, anywhere.
              </div>
            ) : (
              <>
                <div className="mt-3 space-y-1.5">
                  {zone.methods.map((m) => {
                    const c = quoteShipping(dest.zone, m, shipWeight, shipProfile);
                    const sel = m.id === method.id;
                    return (
                      <label
                        key={m.id}
                        className={`flex items-center gap-2 border rounded-md px-2.5 py-2 text-sm cursor-pointer ${
                          sel ? "border-teal bg-teal-light/50" : "border-line"
                        }`}
                      >
                        <input type="radio" name="ship" checked={sel} onChange={() => setMethodId(m.id)} />
                        <span className="flex-1">
                          <span className="text-navy">{m.name.replace(" Intl", "")}</span>
                          <span className="block text-xs text-muted">
                            {m.eta}
                            {m.track ? " · tracked" : ""}
                          </span>
                        </span>
                        <span className="font-semibold text-navy">${c.toFixed(2)}</span>
                      </label>
                    );
                  })}
                </div>
                {shipProfile.combined && physical.length > 1 && (
                  <p className="text-xs text-ok mt-2">✓ Combined shipping — {shipWeight} g rated as one parcel.</p>
                )}
                {hint.text && (
                  <div
                    className={`mt-2 rounded-md px-2.5 py-2 text-xs ${
                      hint.tone === "ok"
                        ? "bg-teal-light text-teal-dark border border-teal/30"
                        : "bg-amber-50 text-amber-900 border border-amber-200"
                    }`}
                  >
                    {hint.text}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <dl className="space-y-2 text-sm">
          {digitalPay.grossDigital > 0 && <Line k="Digital assets" v={digitalPay.grossDigital} />}
          {physicalGoods > 0 && <Line k="Physical goods" v={physicalGoods} />}
          {digitalPay.smallOrderFee > 0 && <Line k="Small order fee" v={digitalPay.smallOrderFee} muted />}
          {hasPhysical && !blocked && (
            <Line k={`Shipping (${method.name.replace(" Intl", "")})`} v={shipCost} muted />
          )}
          {vat > 0 && <Line k={`VAT collected (IOSS · ${(dest.vat * 100).toFixed(0)}%)`} v={vat} muted />}
          <div className="border-t border-line pt-2 flex justify-between font-bold text-navy">
            <span>You pay</span>
            <span>
              <Money v={buyerTotal} />
            </span>
          </div>
        </dl>

        {vat > 0 && (
          <p className="text-xs text-ok mt-2">
            ✓ Nothing more to pay on delivery — VAT is settled here under the seller&apos;s IOSS registration.
          </p>
        )}

        <button className="t-btn-cta w-full mt-4 disabled:opacity-40" onClick={checkout} disabled={blocked}>
          Pay <Money v={buyerTotal} /> (simulated)
        </button>

        <details className="mt-4">
          <summary className="cursor-pointer text-xs font-semibold text-link">Show fee economics (seller view)</summary>
          <dl className="mt-2 space-y-1.5 text-xs text-muted">
            <Line k="Stripe fee (2.9% + $0.30)" v={digitalPay.stripeFee} />
            <Line k="Platform fee on digital (10%)" v={digitalPay.platformFee} />
            {physicalGoods > 0 && <Line k="Platform fee on physical (5%)" v={physicalGoods * 0.05} />}
            {shipCost > 0 && <Line k="Label cost (seller pays)" v={shipCost} />}
            <div className="border-t border-line pt-1.5 flex justify-between font-semibold text-slate">
              <span>Stripe fee as % of digital subtotal</span>
              <span className={digitalPay.stripeFeePctOfGross > 12 ? "text-danger" : "text-ok"}>
                {digitalPay.stripeFeePctOfGross}%
              </span>
            </div>
          </dl>
          <p className="text-[11px] text-muted mt-2 leading-relaxed">
            One charge covers digital and physical together. Platform commission never touches shipping or VAT, and the
            label the seller buys at fulfillment is priced from the same profile that quoted this buyer — so the seller
            cannot be surprised by their own shipping cost.
          </p>
          <Link href="/seller/payouts" className="text-link text-xs hover:underline">
            Full corridor breakdown (Stripe vs Wise) →
          </Link>
        </details>
      </aside>
    </div>
  );
}

function Line({ k, v, muted }: { k: string; v: number; muted?: boolean }) {
  return (
    <div className={`flex justify-between ${muted ? "text-muted" : ""}`}>
      <dt>{k}</dt>
      <dd>
        <Money v={v} />
      </dd>
    </div>
  );
}
