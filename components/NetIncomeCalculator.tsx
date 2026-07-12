"use client";

import { useMemo, useState } from "react";
import { REGIONS, computeNet, GoodsKind } from "@/lib/payments";
import { SHIP_ZONES, DEST_COUNTRIES, quoteShipping, ShipProfile } from "@/lib/shipping";

export default function NetIncomeCalculator({
  kind: fixedKind,
  initialPrice = 19.99,
  profile,
  compact,
}: {
  kind?: GoodsKind;
  initialPrice?: number;
  profile?: ShipProfile;
  compact?: boolean;
}) {
  const [kind, setKind] = useState<GoodsKind>(fixedKind ?? "physical");
  const [region, setRegion] = useState("US");
  const [price, setPrice] = useState(initialPrice);
  const [dest, setDest] = useState("DE");
  const [methodId, setMethodId] = useState<string>("usps_first");
  const [bundle, setBundle] = useState(1);
  const [markup, setMarkup] = useState(0); // what the seller charges over cost

  const zoneKey = DEST_COUNTRIES[dest].zone;
  const methods = SHIP_ZONES[zoneKey].methods;
  const method = methods.find((m) => m.id === methodId) ?? methods[0];
  const shipCost = kind === "digital" ? 0 : quoteShipping(zoneKey, method, profile?.weightG ?? 42, profile);

  const r = useMemo(
    () =>
      computeNet({
        region,
        price,
        kind,
        shipCost,
        shipCharged: shipCost + markup,
        bundleItems: bundle,
      }),
    [region, price, kind, shipCost, markup, bundle]
  );

  const channel = REGIONS[region].channel;
  const stack = [
    { label: "Net", v: Math.max(0, r.sellerNet), c: "#1e7e4f" },
    { label: "Platform", v: r.platformFee, c: "#38B2AC" },
    { label: "Payment", v: r.payFee, c: "#EE7752" },
    ...(kind === "digital" ? [] : [{ label: "Shipping", v: r.shipCost, c: "#9a6a00" }]),
  ];
  const stackTotal = stack.reduce((s, x) => s + x.v, 0) || 1;

  return (
    <div className="border border-line rounded-lg bg-white overflow-hidden">
      <div className="px-4 py-2.5 bg-panel border-b border-line flex items-center gap-2 flex-wrap">
        <span>🧮</span>
        <b className="text-navy text-sm">Net income calculator</b>
        <span className="text-xs text-muted">platform fee · payment channel · shipping cost, itemised</span>
        <span
          className={`t-tag ml-auto ${
            channel === "stripe" ? "bg-indigo-100 text-indigo-700" : "bg-emerald-100 text-emerald-700"
          }`}
        >
          {channel === "stripe" ? "⬢ Stripe · destination charge" : "⬢ Wise · payout + FX"}
        </span>
      </div>

      <div className={`grid ${compact ? "" : "md:grid-cols-2"} divide-y md:divide-y-0 md:divide-x divide-line`}>
        {/* Inputs */}
        <div className="p-4 space-y-3">
          {!fixedKind && (
            <div>
              <label className="t-label">What is being sold</label>
              <div className="flex rounded-md overflow-hidden border border-line text-sm">
                {(["digital", "physical", "manufacturing"] as GoodsKind[]).map((k) => (
                  <button
                    key={k}
                    onClick={() => setKind(k)}
                    className={`flex-1 py-1.5 capitalize transition ${
                      kind === k ? "bg-teal text-white" : "bg-white text-slate hover:bg-panel"
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="t-label">Seller region (determines payment corridor)</label>
            <select className="t-input" value={region} onChange={(e) => setRegion(e.target.value)}>
              {Object.entries(REGIONS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label} · {v.channel === "stripe" ? "Stripe" : "Wise"}
                </option>
              ))}
            </select>
            <p className="t-hint">
              {channel === "stripe"
                ? "Funds route as a destination charge — the seller is the merchant of record and the platform never holds a negative balance."
                : "No Stripe coverage. Funds settle via a Wise payout, which is irrecoverable once disbursed — a higher reserve ratio applies."}
            </p>
          </div>

          <div>
            <label className="t-label">Price (USD)</label>
            <input
              className="t-input"
              type="number"
              step="0.5"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
            />
          </div>

          {kind === "digital" ? (
            <div>
              <label className="t-label">Items in the buyer&apos;s cart</label>
              <input
                className="t-input"
                type="range"
                min={1}
                max={8}
                value={bundle}
                onChange={(e) => setBundle(Number(e.target.value))}
              />
              <p className="t-hint">
                {bundle} item{bundle > 1 ? "s" : ""} — the fixed ${channel === "stripe" ? "0.30" : "0.60"} is paid once
                per charge, so it amortises to <strong>${r.fixedFeePerItem.toFixed(3)}</strong> per item.
              </p>
            </div>
          ) : (
            <>
              <div>
                <label className="t-label">Buyer destination</label>
                <select
                  className="t-input"
                  value={dest}
                  onChange={(e) => {
                    setDest(e.target.value);
                    setMethodId(SHIP_ZONES[DEST_COUNTRIES[e.target.value].zone].methods[0].id);
                  }}
                >
                  {Object.entries(DEST_COUNTRIES).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.flag} {v.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="t-label">Carrier service</label>
                <div className="space-y-1.5">
                  {methods.map((m) => {
                    const c = quoteShipping(zoneKey, m, profile?.weightG ?? 42, profile);
                    const sel = m.id === method.id;
                    return (
                      <label
                        key={m.id}
                        className={`flex items-center gap-2 border rounded-md px-3 py-2 text-sm cursor-pointer transition ${
                          sel ? "border-teal bg-teal-light/50" : "border-line hover:border-teal/50"
                        }`}
                      >
                        <input
                          type="radio"
                          checked={sel}
                          onChange={() => setMethodId(m.id)}
                          name="calcmethod"
                        />
                        <span className="flex-1">
                          <span className="font-medium text-navy">{m.name}</span>{" "}
                          <span className="text-muted text-xs">
                            · {m.eta}
                            {m.track ? " · tracked" : ""}
                          </span>
                        </span>
                        <span className="font-semibold text-navy">${c.toFixed(2)}</span>
                      </label>
                    );
                  })}
                </div>
                <p className="t-hint">
                  Live rates in production come from a rate-aggregation API (Shippo / EasyPost). These are the same
                  rates the buyer sees at checkout — one shipping profile, one source of truth.
                </p>
              </div>
              <div>
                <label className="t-label">Shipping markup charged to buyer (USD)</label>
                <input
                  className="t-input"
                  type="number"
                  step="0.5"
                  value={markup}
                  onChange={(e) => setMarkup(Number(e.target.value))}
                />
                <p className="t-hint">$0 = shipping at cost. Platform commission never applies to shipping.</p>
              </div>
            </>
          )}
        </div>

        {/* Output */}
        <div className="p-4">
          <Row k="Buyer pays" v={r.buyerPays} bold />
          <Row k={`− Platform fee (${(r.platformFeePct * 100).toFixed(0)}%)`} v={-r.platformFee} neg />
          <Row k="− Payment cost" v={-r.payFee} neg />
          {kind !== "digital" && <Row k={`− Shipping (${method.name})`} v={-r.shipCost} neg />}
          <div
            className={`flex justify-between items-center mt-2 pt-2 border-t-2 font-bold ${
              r.loss ? "border-danger text-danger" : "border-navy text-navy"
            }`}
          >
            <span>Seller net</span>
            <span className="text-lg">${r.sellerNet.toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-muted">Margin vs. price</span>
            <span
              className={`t-tag ${
                r.marginPct >= 35
                  ? "bg-emerald-100 text-emerald-700"
                  : r.marginPct >= 15
                  ? "bg-amber-100 text-amber-800"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {r.marginPct.toFixed(1)}%
            </span>
          </div>

          {/* Cost composition */}
          <div className="flex h-2.5 rounded-full overflow-hidden mt-3 bg-line">
            {stack.map((s) => (
              <i
                key={s.label}
                className="block h-full"
                style={{ width: `${(s.v / stackTotal) * 100}%`, background: s.c }}
                title={`${s.label}: $${s.v.toFixed(2)}`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[11px] text-muted">
            {stack.map((s) => (
              <span key={s.label} className="flex items-center gap-1">
                <i className="w-2 h-2 rounded-full inline-block" style={{ background: s.c }} />
                {s.label} ${s.v.toFixed(2)}
              </span>
            ))}
          </div>

          <p className="text-[11px] text-muted mt-3 leading-relaxed font-mono">{r.payLabel}</p>

          {r.payFeePctOfPrice > 10 && (
            <div className="mt-3 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900">
              Payment cost is <strong>{r.payFeePctOfPrice.toFixed(1)}%</strong> of the goods price — the fixed component
              is dominating.{" "}
              {kind === "digital"
                ? "Bundling more assets into one charge is the fix, not raising the price."
                : "This is the structural reason a $5 item cannot be sold profitably on its own."}
            </div>
          )}
          {r.loss && (
            <div className="mt-3 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 font-semibold">
              ⚠ At this price the seller loses money on every unit. The listing wizard blocks publish here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ k, v, neg, bold }: { k: string; v: number; neg?: boolean; bold?: boolean }) {
  return (
    <div className={`flex justify-between py-1 text-sm ${bold ? "font-semibold text-navy" : ""}`}>
      <span className={neg ? "text-muted" : ""}>{k}</span>
      <span className={neg ? "text-slate" : ""}>
        {v < 0 ? "-" : ""}${Math.abs(v).toFixed(2)}
      </span>
    </div>
  );
}
