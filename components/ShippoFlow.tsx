"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";
import { Fulfillment } from "@/lib/shipping";
import Link from "next/link";

/**
 * The complete Shippo flow, exactly as their API works (docs.goshippo.com):
 *
 *   1. POST /shipments/     address_from + address_to + parcels → rates[]
 *   2. seller picks a rate  (CHEAPEST / BESTVALUE / FASTEST attributes shown)
 *   3. POST /transactions/  rate object_id → SUCCESS + label_url + tracking
 *
 * Every step shows the actual request/response JSON behind a toggle — the
 * point is to EXPERIENCE the integration, not just its result. Our API routes
 * proxy api.goshippo.com verbatim when SHIPPO_API_KEY is set; without it they
 * answer in the identical schema, so this component is already the production
 * component.
 */

interface ShippoRate {
  object_id: string;
  amount: string;
  currency: string;
  provider: string;
  servicelevel: { name: string; token: string };
  estimated_days: number | null;
  duration_terms?: string;
  attributes: string[];
}
interface ShipmentResp {
  object_id: string;
  rates: ShippoRate[];
  test?: boolean;
}
interface TxResp {
  status: string;
  tracking_number: string;
  tracking_url_provider: string;
  label_url: string;
  test?: boolean;
}

const SELLER_FROM = {
  name: "SuLab (Tindie)",
  street1: "2261 Market St",
  city: "San Francisco",
  state: "CA",
  zip: "94114",
  country: "US",
};

const ATTR_TONE: Record<string, string> = {
  CHEAPEST: "bg-emerald-100 text-emerald-700",
  BESTVALUE: "bg-teal-light text-teal-dark",
  FASTEST: "bg-amber-100 text-amber-800",
};

export default function ShippoFlow({ f }: { f: Fulfillment }) {
  const { updateFulfillment, showToast } = useApp();
  const products = useApp((st) => st.allProducts)();
  // Customs gate (integration doc §2.3): the REAL Shippo API requires a
  // customs_declaration on international shipments, and a declaration needs
  // an HS code + origin. If the product record lacks them, we block label
  // purchase HERE — at quote time — instead of letting the carrier bounce the
  // parcel at the border two weeks later.
  const intl = f.destination !== "US";
  const prod = products.find(
    (x) => x.title === f.productTitle || (f.sku && x.title.toLowerCase().includes((f.sku || "").split("-")[0].toLowerCase()))
  );
  const hsCode = prod?.hsCode;
  const originCountry = prod?.originCountry ?? "US";
  const customsBlocked = intl && !hsCode;
  const [shipment, setShipment] = useState<ShipmentResp | null>(null);
  const [tx, setTx] = useState<TxResp | null>(null);
  const [busy, setBusy] = useState<"shipment" | "tx" | null>(null);
  const [showJson, setShowJson] = useState(false);
  const [lastReq, setLastReq] = useState<object | null>(null);
  const [lastResp, setLastResp] = useState<object | null>(null);

  const addressTo = f.address
    ? {
        name: f.address[0],
        street1: f.address[1] ?? "",
        city: (f.address[2] ?? "").split(",")[0],
        zip: (f.address[2] ?? "").split(" ").pop() ?? "",
        country: f.destination,
      }
    : { name: f.buyerName, street1: "", city: "", zip: "", country: f.destination };

  async function createShipment() {
    setBusy("shipment");
    const body = {
      address_from: SELLER_FROM,
      address_to: addressTo,
      parcels: [
        {
          length: "15",
          width: "10",
          height: "4",
          distance_unit: "cm",
          weight: String(f.weightG / 1000),
          mass_unit: "kg",
        },
      ],
      // Real-API parity: international shipments carry a customs declaration.
      ...(intl
        ? {
            customs_declaration: {
              contents_type: "MERCHANDISE",
              incoterm: "DDU",
              non_delivery_option: "RETURN",
              certify: true,
              certify_signer: "SuLab",
              items: [
                {
                  description: f.productTitle.slice(0, 50),
                  quantity: f.qty ?? 1,
                  net_weight: String(f.weightG / 1000),
                  mass_unit: "kg",
                  value_amount: String((f.goodsValue / (f.qty ?? 1)).toFixed(2)),
                  value_currency: "USD",
                  tariff_number: hsCode,
                  origin_country: originCountry,
                },
              ],
            },
          }
        : {}),
      async: false,
    };
    setLastReq({ "POST /api/shippo/shipments": body });
    const res = await fetch("/api/shippo/shipments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as ShipmentResp;
    setLastResp(json);
    setShipment(json);
    setBusy(null);
  }

  async function buyRate(rate: ShippoRate) {
    setBusy("tx");
    const body = {
      rate: rate.object_id,
      label_file_type: "PDF_4x6",
      async: false,
      _meta: { provider: rate.provider, ref: f.orderRef },
    };
    setLastReq({ "POST /api/shippo/transactions": body });
    const res = await fetch("/api/shippo/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as TxResp;
    setLastResp(json);
    setBusy(null);
    if (json.status === "SUCCESS") {
      setTx(json);
      updateFulfillment(f.id, {
        status: "label_purchased",
        carrierId: rate.provider === "DHL Express" ? "dhl_express" : rate.provider.toLowerCase(),
        service: `${rate.provider} ${rate.servicelevel.name}`,
        tracking: json.tracking_number,
        labelCost: parseFloat(rate.amount),
      });
      showToast("Label purchased via Shippo — order moved to “label bought”, mark it shipped when it leaves");
    } else {
      showToast("Transaction did not succeed — see the response JSON");
    }
  }

  return (
    <div className="mt-3 rounded-lg border border-line bg-panel/40 p-4 space-y-4">
      {/* Step strip */}
      <div className="flex items-center gap-2 text-xs font-mono flex-wrap">
        <span className={`t-tag ${shipment ? "bg-emerald-100 text-emerald-700" : "bg-navy text-white"}`}>
          1 · POST /shipments
        </span>
        <span className="text-muted">→</span>
        <span className={`t-tag ${tx ? "bg-emerald-100 text-emerald-700" : shipment ? "bg-navy text-white" : "bg-panel text-muted"}`}>
          2 · pick a rate
        </span>
        <span className="text-muted">→</span>
        <span className={`t-tag ${tx ? "bg-emerald-100 text-emerald-700" : "bg-panel text-muted"}`}>
          3 · POST /transactions
        </span>
        <button className="ml-auto text-link hover:underline" onClick={() => setShowJson((v) => !v)}>
          {showJson ? "hide" : "show"} API JSON
        </button>
      </div>

      {/* Customs gate — before any API call */}
      {customsBlocked && (
        <div className="t-card p-3 bg-amber-50/60 border-amber-300 text-sm text-slate">
          🛃 <strong className="text-navy">International shipment blocked:</strong> this product has no HS code, and a
          customs declaration can&apos;t be built without one. Add it once on the listing and every future
          international label works.{" "}
          <Link href="/seller/operations?tab=new" className="text-link hover:underline">Edit listing →</Link>
          <div className="t-hint mt-1">
            Caught here at quote time — the alternative is the carrier bouncing the parcel at the border two weeks
            from now.
          </div>
        </div>
      )}

      {/* Step 1 */}
      {!shipment && (
        <button
          className="t-btn-primary disabled:opacity-40"
          disabled={busy === "shipment" || customsBlocked}
          onClick={createShipment}
        >
          {busy === "shipment" ? "Creating shipment — carriers rating…" : "Create shipment & get live rates (Shippo)"}
        </button>
      )}

      {/* Step 2 — rates */}
      {shipment && !tx && (
        <div className="space-y-2">
          <div className="text-xs text-muted">
            shipment <span className="font-mono">{shipment.object_id.slice(0, 12)}…</span> · {shipment.rates.length}{" "}
            rates {shipment.test && <span className="t-tag bg-amber-100 text-amber-800 ml-1">test mode</span>}
          </div>
          {shipment.rates.map((r) => (
            <div key={r.object_id} className="t-card p-3 bg-white flex items-center gap-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-navy text-sm">
                  {r.provider} · {r.servicelevel.name}
                </div>
                <div className="text-xs text-muted">
                  {r.estimated_days != null ? `~${r.estimated_days} days` : r.duration_terms}
                  <span className="font-mono ml-2 text-muted/70">{r.servicelevel.token}</span>
                </div>
              </div>
              {r.attributes.map((a) => (
                <span key={a} className={`t-tag ${ATTR_TONE[a] ?? "bg-panel text-slate"}`}>{a}</span>
              ))}
              <div className="font-bold text-navy">${r.amount}</div>
              <button className="t-btn-cta !py-1.5 !text-xs" disabled={busy === "tx"} onClick={() => buyRate(r)}>
                {busy === "tx" ? "Purchasing…" : "Buy label"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Step 3 — success */}
      {tx && (
        <div className="t-card p-4 bg-white border-emerald-300">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="t-tag bg-emerald-100 text-emerald-700">transaction SUCCESS</span>
            {tx.test && <span className="t-tag bg-amber-100 text-amber-800">test label — not valid for postage</span>}
          </div>
          <div className="mt-2 text-sm text-slate space-y-1">
            <div>
              Tracking: <span className="font-mono text-navy">{tx.tracking_number}</span>
            </div>
            <div className="flex gap-2 flex-wrap mt-2">
              <a href={tx.label_url} target="_blank" rel="noreferrer" className="t-btn-primary !text-xs">
                ⬇ Download label (PDF 4x6)
              </a>
              <a href={tx.tracking_url_provider} target="_blank" rel="noreferrer" className="t-btn-ghost !text-xs">
                Track on carrier site ↗
              </a>
            </div>
          </div>
          <p className="t-hint mt-2">
            The label is bought — the parcel is not shipped. This order now sits in the &ldquo;label bought&rdquo;
            queue until you mark it shipped, which is when the buyer gets the tracking email.
          </p>
        </div>
      )}

      {/* API transparency */}
      {showJson && (lastReq || lastResp) && (
        <div className="grid md:grid-cols-2 gap-2 text-xs">
          <pre className="rounded-md bg-navy text-teal-light/90 p-3 overflow-x-auto no-scrollbar max-h-64">
            {JSON.stringify(lastReq, null, 2)}
          </pre>
          <pre className="rounded-md bg-navy text-white/80 p-3 overflow-x-auto no-scrollbar max-h-64">
            {JSON.stringify(lastResp, null, 2)}
          </pre>
        </div>
      )}
      <p className="t-hint">
        These calls hit <span className="font-mono">/api/shippo/*</span>, which proxies{" "}
        <span className="font-mono">api.goshippo.com</span> verbatim when <span className="font-mono">SHIPPO_API_KEY</span>{" "}
        is set (ShippoToken auth) and answers in the identical schema when it isn&apos;t. Paste a{" "}
        <span className="font-mono">shippo_test_…</span> key in Vercel and this exact flow goes live — zero UI changes.
      </p>
    </div>
  );
}
