"use client";

import { useState } from "react";
import {
  SHIP_ZONES,
  DEST_COUNTRIES,
  ALL_METHOD_NAMES,
  quoteShipping,
  customsHint,
  ShipProfile,
} from "@/lib/shipping";

export default function ShippingProfileEditor({
  profile,
  onChange,
  goodsValue = 19.99,
}: {
  profile: ShipProfile;
  onChange: (p: ShipProfile) => void;
  goodsValue?: number;
}) {
  const [dest, setDest] = useState("DE");
  const p = profile;
  const set = (patch: Partial<ShipProfile>) => onChange({ ...p, ...patch });

  const d = DEST_COUNTRIES[dest];
  const blocked = p.blockedZones.includes(d.zone);
  const hint = customsHint(dest, goodsValue, p);
  const zone = SHIP_ZONES[d.zone];

  return (
    <div className="grid lg:grid-cols-[1fr_340px] gap-5 items-start">
      {/* Seller config */}
      <div className="space-y-4">
        <Card title="📦 Parcel & customs declaration">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="t-label">Ships from</label>
              <select className="t-input" value={p.originLabel} onChange={(e) => set({ originLabel: e.target.value })}>
                {["United States", "Germany", "United Kingdom", "China", "Canada", "Australia"].map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="t-label">Parcel weight (g)</label>
              <input
                className="t-input"
                type="number"
                value={p.weightG}
                onChange={(e) => set({ weightG: Number(e.target.value) })}
              />
              <p className="t-hint">Pre-filled from the parsed PCB + BOM; drives every weight-based rate.</p>
            </div>
            <div>
              <label className="t-label">
                HS Code <span className="t-tag bg-teal-light text-teal-dark ml-1">AI suggested</span>
              </label>
              <input className="t-input" value={p.hsCode} onChange={(e) => set({ hsCode: e.target.value })} />
              <p className="t-hint">Proposed from the design&apos;s function. The seller confirms — never auto-filed.</p>
            </div>
            <div>
              <label className="t-label">Handling time</label>
              <input
                className="t-input"
                value={p.handlingDays}
                onChange={(e) => set({ handlingDays: e.target.value })}
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="t-label">Customs description</label>
            <input className="t-input" value={p.customsDesc} onChange={(e) => set({ customsDesc: e.target.value })} />
          </div>
        </Card>

        <Card title="💵 Rating mode">
          <div className="flex rounded-md overflow-hidden border border-line text-sm w-fit">
            {(["weight", "flat"] as const).map((m) => (
              <button
                key={m}
                onClick={() => set({ mode: m })}
                className={`px-4 py-1.5 transition ${
                  p.mode === m ? "bg-teal text-white" : "bg-white text-slate hover:bg-panel"
                }`}
              >
                {m === "weight" ? "By weight & destination" : "Flat rate"}
              </button>
            ))}
          </div>
          {p.mode === "flat" ? (
            <div className="mt-3 max-w-[200px]">
              <label className="t-label">Flat rate (USD)</label>
              <input
                className="t-input"
                type="number"
                value={p.flatRate}
                onChange={(e) => set({ flatRate: Number(e.target.value) })}
              />
            </div>
          ) : (
            <p className="t-hint mt-2">
              zone base + per-gram rate × parcel weight. In production these cells are filled by live carrier quotes
              from a rate-aggregation API (Shippo / EasyPost) rather than a static table.
            </p>
          )}

          <div className="overflow-x-auto mt-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted border-b border-line">
                  <th className="py-2">Zone</th>
                  {ALL_METHOD_NAMES.map((m) => (
                    <th key={m} className="py-2">
                      {m.replace(" Intl", "")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(SHIP_ZONES).map(([zk, z]) => {
                  const zBlocked = p.blockedZones.includes(zk);
                  return (
                    <tr key={zk} className="border-b border-line">
                      <td className="py-2 font-semibold text-navy">{z.label}</td>
                      {ALL_METHOD_NAMES.map((mn) => {
                        const m = z.methods.find((x) => x.name === mn);
                        if (zBlocked)
                          return (
                            <td key={mn} className="py-2 text-danger text-xs font-semibold">
                              not shipped
                            </td>
                          );
                        if (!m)
                          return (
                            <td key={mn} className="py-2 text-line">
                              —
                            </td>
                          );
                        return (
                          <td key={mn} className="py-2">
                            ${quoteShipping(zk, m, p.weightG, p).toFixed(2)}{" "}
                            <span className="text-[10px] text-muted block">{m.eta}</span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="🌍 Destinations">
          <p className="text-sm text-muted mb-2">
            Tick a zone to stop shipping there. Buyers in a blocked zone are told before they add to cart, not at
            checkout.
          </p>
          <div className="grid sm:grid-cols-2 gap-2">
            {Object.entries(SHIP_ZONES).map(([zk, z]) => {
              const b = p.blockedZones.includes(zk);
              return (
                <label
                  key={zk}
                  className={`flex items-center gap-2 border rounded-md px-3 py-2 text-sm cursor-pointer ${
                    b ? "border-danger/40 bg-red-50 text-danger" : "border-line"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={b}
                    onChange={() =>
                      set({
                        blockedZones: b ? p.blockedZones.filter((x) => x !== zk) : [...p.blockedZones, zk],
                      })
                    }
                  />
                  Do not ship · {z.label}
                </label>
              );
            })}
          </div>
        </Card>

        <Card title="🧾 Tax & combined shipping">
          <Toggle
            on={p.iossRegistered}
            onClick={() => set({ iossRegistered: !p.iossRegistered })}
            title="EU IOSS registered"
            sub="VAT collected at checkout for orders under €150. Faster clearance and — critically — no surprise customs bill at the buyer's door."
          />
          <Toggle
            on={p.combined}
            onClick={() => set({ combined: !p.combined })}
            title="Combined shipping"
            sub="Multiple items to the same buyer ship as one parcel and are rated once."
          />
          <div className="mt-3 rounded-lg bg-panel border border-line p-3 text-xs text-slate leading-relaxed">
            <strong className="text-navy">Customs paperwork is generated, not typed.</strong> Destinations such as
            Brazil require a commercial invoice and a buyer tax ID. The order layer produces that PDF automatically from
            the HS code and declared value once the order is confirmed, and hands it to the carrier with the label. This
            page only owns the HS code and the declaration text.
            <div className="mt-2 font-mono text-[11px] text-muted">
              order confirmed → commercial invoice generated → tax-ID fields attached for restricted destinations →
              submitted with the label
            </div>
          </div>
        </Card>
      </div>

      {/* Buyer preview */}
      <aside className="lg:sticky lg:top-4 border border-line rounded-lg bg-white overflow-hidden">
        <div className="px-4 py-2.5 bg-navy text-white text-sm font-semibold">🛒 Buyer&apos;s view — live</div>
        <div className="p-4">
          <label className="t-label">Shipping to</label>
          <select className="t-input" value={dest} onChange={(e) => setDest(e.target.value)}>
            {Object.entries(DEST_COUNTRIES).map(([k, v]) => (
              <option key={k} value={k}>
                {v.flag} {v.label}
              </option>
            ))}
          </select>

          <p className="text-xs text-muted mt-2">
            Goods ${goodsValue.toFixed(2)} · parcel {p.weightG} g · handling {p.handlingDays}
          </p>

          <div className="mt-3 space-y-1.5">
            {blocked ? (
              <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                This seller does not ship to {d.label}.
              </div>
            ) : (
              zone.methods.map((m) => (
                <div key={m.id} className="flex justify-between text-sm border-b border-line pb-1.5">
                  <span>
                    {m.name.replace(" Intl", "")}
                    <span className="text-xs text-muted block">
                      {m.eta}
                      {m.track ? " · tracked" : " · no tracking"}
                    </span>
                  </span>
                  <span className="font-semibold text-navy">${quoteShipping(d.zone, m, p.weightG, p).toFixed(2)}</span>
                </div>
              ))
            )}
          </div>

          {hint.text && !blocked && (
            <div
              className={`mt-3 rounded-md px-3 py-2 text-xs ${
                hint.tone === "ok"
                  ? "bg-teal-light text-teal-dark border border-teal/30"
                  : "bg-amber-50 text-amber-900 border border-amber-200"
              }`}
            >
              {hint.text}
            </div>
          )}

          {!blocked && p.combined && (
            <p className="text-xs text-ok mt-2">✓ Combined shipping — buying several items costs less to ship.</p>
          )}

          <p className="text-[10px] text-muted mt-3 leading-relaxed">
            HS {p.hsCode} · {p.customsDesc}
          </p>
        </div>
      </aside>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-line rounded-lg bg-white overflow-hidden">
      <div className="px-4 py-2.5 bg-panel border-b border-line font-semibold text-navy text-sm">{title}</div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Toggle({ on, onClick, title, sub }: { on: boolean; onClick: () => void; title: string; sub: string }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-line last:border-0">
      <div className="flex-1">
        <div className="text-sm font-semibold text-navy">{title}</div>
        <p className="text-xs text-muted mt-0.5">{sub}</p>
      </div>
      <button
        onClick={onClick}
        className={`w-10 h-5.5 rounded-full shrink-0 relative transition ${on ? "bg-teal" : "bg-line"}`}
        style={{ height: 22 }}
        aria-pressed={on}
      >
        <span
          className={`absolute top-0.5 w-[18px] h-[18px] rounded-full bg-white shadow transition-all ${
            on ? "left-[20px]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}
