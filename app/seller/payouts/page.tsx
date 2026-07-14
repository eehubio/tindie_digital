"use client";

import { useState } from "react";
import { SectionTitle } from "@/components/ui";
import NetIncomeCalculator from "@/components/NetIncomeCalculator";
import { useApp } from "@/lib/store";
import { REGIONS, FEES } from "@/lib/payments";

const LEDGER = [
  { date: "2026-07-10", ref: "TD-88213", kind: "digital", gross: 24.0, platform: 2.4, pay: 1.0, net: 20.6, state: "pending" },
  { date: "2026-07-09", ref: "TD-88207", kind: "physical", gross: 73.4, platform: 3.2, pay: 2.43, net: 58.37, state: "pending" },
  { date: "2026-07-05", ref: "TD-88190", kind: "physical", gross: 48.5, platform: 0.6, pay: 1.71, net: 9.69, state: "paid" },
  { date: "2026-07-02", ref: "TD-88155", kind: "digital", gross: 12.0, platform: 1.2, pay: 0.65, net: 10.15, state: "paid" },
];

export default function PayoutsPage() {
  const { showToast } = useApp();
  const [region, setRegion] = useState("US");
  const channel = REGIONS[region].channel;

  const pending = LEDGER.filter((l) => l.state === "pending").reduce((s, l) => s + l.net, 0);
  const paid = LEDGER.filter((l) => l.state === "paid").reduce((s, l) => s + l.net, 0);

  return (
    <div>
      <SectionTitle>Payouts &amp; Fee Transparency</SectionTitle>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <div className="t-card p-4">
          <div className="text-xs uppercase tracking-wide text-muted">Pending balance</div>
          <div className="text-2xl font-bold text-navy mt-1">${pending.toFixed(2)}</div>
          <p className="text-xs text-muted mt-1">Released after the delivery window closes.</p>
        </div>
        <div className="t-card p-4">
          <div className="text-xs uppercase tracking-wide text-muted">Paid out (30d)</div>
          <div className="text-2xl font-bold text-ok mt-1">${paid.toFixed(2)}</div>
        </div>
        <div className="t-card p-4">
          <div className="text-xs uppercase tracking-wide text-muted">Payout corridor</div>
          <select className="t-input mt-1" value={region} onChange={(e) => setRegion(e.target.value)}>
            {Object.entries(REGIONS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Corridor explanation — the structural point */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div
          className={`t-card p-5 ${
            channel === "stripe" ? "border-teal ring-1 ring-teal/30" : "opacity-60"
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="t-tag bg-indigo-100 text-indigo-700">⬢ Stripe Connect</span>
            {channel === "stripe" && <span className="t-tag bg-teal text-white">your corridor</span>}
          </div>
          <h3 className="font-bold text-navy">Destination charges</h3>
          <ul className="mt-2 text-sm text-slate space-y-1.5">
            <li>· The seller is the merchant of record — funds route to their Stripe account directly.</li>
            <li>
              · Cost: {(FEES.stripe.pct * 100).toFixed(1)}% + ${FEES.stripe.fixed.toFixed(2)}, plus{" "}
              {(FEES.stripe.crossBorderPct * 100).toFixed(1)}% cross-border and {(FEES.stripe.fxPct * 100).toFixed(1)}%
              FX where applicable.
            </li>
            <li>· Refunds and chargebacks debit the seller&apos;s balance — the platform carries no negative-balance risk.</li>
            <li>· Payouts are automatic on a rolling schedule.</li>
          </ul>
        </div>

        <div
          className={`t-card p-5 ${channel === "wise" ? "border-teal ring-1 ring-teal/30" : "opacity-60"}`}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="t-tag bg-emerald-100 text-emerald-700">⬢ Wise payout</span>
            {channel === "wise" && <span className="t-tag bg-teal text-white">your corridor</span>}
          </div>
          <h3 className="font-bold text-navy">Non-Stripe corridors</h3>
          <ul className="mt-2 text-sm text-slate space-y-1.5">
            <li>· For sellers Stripe does not cover — China, India and elsewhere.</li>
            <li>
              · Cost: {(FEES.wise.payoutPct * 100).toFixed(2)}% + ${FEES.wise.payoutFixed.toFixed(2)} payout, plus{" "}
              {(FEES.wise.fxPct * 100).toFixed(2)}% FX loss.
            </li>
            <li className="text-danger font-medium">
              · Funds are irrecoverable once disbursed, so a higher reserve ratio and a longer hold apply. This is a
              risk difference, not a penalty.
            </li>
            <li>· Payout is batched rather than continuous.</li>
          </ul>
        </div>
      </div>

      <div className="rounded-lg bg-panel border border-line p-4 mb-6 text-sm text-slate leading-relaxed">
        <strong className="text-navy">Why the seller is shown all of this.</strong> A 5% headline commission is not the
        seller&apos;s real cost — payment fees, FX and shipping are, and on a small order they can exceed the
        commission several times over. Showing the full stack before publish is the difference between a seller who
        prices correctly and one who discovers the problem after their first payout. It is also the honest version of
        the fee conversation.
      </div>

      <h3 className="font-bold text-navy mb-2">Model a listing before you publish</h3>
      <NetIncomeCalculator initialPrice={19.99} />

      <h3 className="font-bold text-navy mt-8 mb-2">Ledger</h3>
      <div className="t-card overflow-x-auto no-scrollbar">
        <table className="w-full text-sm">
          <thead className="bg-panel text-xs uppercase text-muted">
            <tr>
              <th className="text-left px-4 py-2">Date</th>
              <th className="text-left px-4 py-2">Order</th>
              <th className="text-left px-4 py-2">Type</th>
              <th className="text-right px-4 py-2">Buyer paid</th>
              <th className="text-right px-4 py-2">Platform</th>
              <th className="text-right px-4 py-2">Payment</th>
              <th className="text-right px-4 py-2">Net</th>
              <th className="text-right px-4 py-2">State</th>
            </tr>
          </thead>
          <tbody>
            {LEDGER.map((l) => (
              <tr key={l.ref} className="border-t border-line">
                <td className="px-4 py-2 text-muted">{l.date}</td>
                <td className="px-4 py-2 font-mono text-xs">{l.ref}</td>
                <td className="px-4 py-2">
                  <span className="t-tag bg-panel text-slate">{l.kind}</span>
                </td>
                <td className="px-4 py-2 text-right">${l.gross.toFixed(2)}</td>
                <td className="px-4 py-2 text-right text-muted">-${l.platform.toFixed(2)}</td>
                <td className="px-4 py-2 text-right text-muted">-${l.pay.toFixed(2)}</td>
                <td className="px-4 py-2 text-right font-semibold text-navy">${l.net.toFixed(2)}</td>
                <td className="px-4 py-2 text-right">
                  <span
                    className={`t-tag ${
                      l.state === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {l.state}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button className="t-btn-primary mt-4" onClick={() => showToast("Payout requested — settles via " + channel)}>
        Request payout (${pending.toFixed(2)})
      </button>
    </div>
  );
}
