// ============================================================================
// Shippo integration — server side.
//
// The contract: our API routes speak EXACTLY Shippo's schema, in both
// directions. With SHIPPO_API_KEY set (a shippo_test_… or shippo_live_… token)
// the routes proxy https://api.goshippo.com verbatim; without it they return
// mock responses in the same shape, byte-field-compatible. The UI cannot tell
// the difference — which means the day we paste a real key in Vercel, the
// entire flow (shipment → rates → transaction → label_url → tracking) goes
// live with zero UI changes.
//
// Real flow, per Shippo docs (docs.goshippo.com):
//   1. POST /shipments/  { address_from, address_to, parcels[], async:false }
//      → { object_id, rates: [{ object_id, amount, currency, provider,
//           servicelevel:{name,token}, estimated_days, attributes[] }] }
//   2. POST /transactions/  { rate:<rate object_id>, label_file_type, async:false }
//      → { status:"SUCCESS", label_url, tracking_number, tracking_url_provider }
// Auth header: `Authorization: ShippoToken <token>`.
// ============================================================================

const SHIPPO_BASE = "https://api.goshippo.com";

export function shippoKey() {
  return process.env.SHIPPO_API_KEY ?? "";
}

export async function shippoProxy(path: string, body: unknown) {
  const res = await fetch(`${SHIPPO_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `ShippoToken ${shippoKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  return { status: res.status, json: await res.json() };
}

// ---------------------------------------------------------------------------
// Mock layer — same schema, deterministic-ish data
// ---------------------------------------------------------------------------
const oid = () => crypto.randomUUID().replace(/-/g, "");

interface ParcelIn {
  weight: string;
  mass_unit: string;
  length?: string;
  width?: string;
  height?: string;
  distance_unit?: string;
}

export function mockShipmentResponse(body: {
  address_from: Record<string, string>;
  address_to: Record<string, string>;
  parcels: ParcelIn[];
}) {
  const to = body.address_to ?? {};
  const parcel = body.parcels?.[0] ?? { weight: "0.2", mass_unit: "kg" };
  const kg =
    parcel.mass_unit === "lb" ? parseFloat(parcel.weight) * 0.4536 : parseFloat(parcel.weight || "0.2");
  const domestic = (to.country ?? "US") === "US";
  const shipmentId = oid();

  const r2 = (n: number) => (Math.round(n * 100) / 100).toFixed(2);
  // Cost model mirrors real-world spreads: USPS cheap/slow, UPS mid, DHL fast intl.
  const rates = domestic
    ? [
        {
          object_id: oid(),
          amount: r2(4.6 + kg * 6.2),
          currency: "USD",
          provider: "USPS",
          provider_image_75: "https://shippo-static.s3.amazonaws.com/providers/75/USPS.png",
          servicelevel: { name: "Ground Advantage", token: "usps_ground_advantage" },
          estimated_days: 4,
          duration_terms: "Delivery in 2 to 5 business days.",
          attributes: ["CHEAPEST", "BESTVALUE"],
        },
        {
          object_id: oid(),
          amount: r2(8.9 + kg * 7.4),
          currency: "USD",
          provider: "USPS",
          provider_image_75: "https://shippo-static.s3.amazonaws.com/providers/75/USPS.png",
          servicelevel: { name: "Priority Mail", token: "usps_priority" },
          estimated_days: 2,
          duration_terms: "Delivery in 1 to 3 business days.",
          attributes: [],
        },
        {
          object_id: oid(),
          amount: r2(11.2 + kg * 8.1),
          currency: "USD",
          provider: "UPS",
          provider_image_75: "https://shippo-static.s3.amazonaws.com/providers/75/UPS.png",
          servicelevel: { name: "Ground", token: "ups_ground" },
          estimated_days: 3,
          duration_terms: "Delivery times vary by distance.",
          attributes: [],
        },
        {
          object_id: oid(),
          amount: r2(28.4 + kg * 9.5),
          currency: "USD",
          provider: "USPS",
          provider_image_75: "https://shippo-static.s3.amazonaws.com/providers/75/USPS.png",
          servicelevel: { name: "Priority Mail Express", token: "usps_priority_express" },
          estimated_days: 1,
          duration_terms: "Overnight delivery to most U.S. locations.",
          attributes: ["FASTEST"],
        },
      ]
    : [
        {
          object_id: oid(),
          amount: r2(14.1 + kg * 12.5),
          currency: "USD",
          provider: "USPS",
          provider_image_75: "https://shippo-static.s3.amazonaws.com/providers/75/USPS.png",
          servicelevel: { name: "First-Class Package International", token: "usps_first_class_package_international_service" },
          estimated_days: 12,
          duration_terms: "Delivery in 7 to 21 business days.",
          attributes: ["CHEAPEST"],
        },
        {
          object_id: oid(),
          amount: r2(32.7 + kg * 14.0),
          currency: "USD",
          provider: "USPS",
          provider_image_75: "https://shippo-static.s3.amazonaws.com/providers/75/USPS.png",
          servicelevel: { name: "Priority Mail International", token: "usps_priority_mail_international" },
          estimated_days: 8,
          duration_terms: "Delivery in 6 to 10 business days.",
          attributes: ["BESTVALUE"],
        },
        {
          object_id: oid(),
          amount: r2(41.9 + kg * 16.8),
          currency: "USD",
          provider: "DHL Express",
          provider_image_75: "https://shippo-static.s3.amazonaws.com/providers/75/DHLExpress.png",
          servicelevel: { name: "Express Worldwide", token: "dhl_express_worldwide" },
          estimated_days: 3,
          duration_terms: "Delivery in 2 to 4 business days.",
          attributes: ["FASTEST"],
        },
      ];

  return {
    object_id: shipmentId,
    object_state: "VALID",
    status: "SUCCESS",
    object_created: new Date().toISOString(),
    test: true,
    address_from: body.address_from,
    address_to: body.address_to,
    parcels: body.parcels,
    rates,
    messages: [],
  };
}

export function mockTransactionResponse(rate: string, meta?: { provider?: string; ref?: string }) {
  const txId = oid();
  const provider = meta?.provider ?? "USPS";
  const tracking =
    provider === "DHL Express"
      ? String(Math.floor(1e9 + Math.random() * 9e9))
      : "9405" + String(Math.floor(1e15 + Math.random() * 9e15));
  const trackUrl =
    provider === "DHL Express"
      ? `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${tracking}`
      : `https://tools.usps.com/go/TrackConfirmAction?tLabels=${tracking}`;
  return {
    object_id: txId,
    object_state: "VALID",
    status: "SUCCESS",
    object_created: new Date().toISOString(),
    test: true,
    rate,
    tracking_number: tracking,
    tracking_status: "UNKNOWN",
    tracking_url_provider: trackUrl,
    eta: null,
    // In mock mode the label is generated locally as a real 4x6 PDF —
    // same field, same click, same print result.
    label_url: `/api/shippo/label?tn=${tracking}&provider=${encodeURIComponent(provider)}&ref=${encodeURIComponent(meta?.ref ?? "")}`,
    messages: [],
  };
}

// ---------------------------------------------------------------------------
// Minimal PDF label generator — no dependencies. A real 4x6in (288x432pt)
// one-page PDF with the shipment facts, so "download label → print" works
// end-to-end even in mock mode.
// ---------------------------------------------------------------------------
export function labelPdf(
  lines: string[],
  opts: { w?: number; h?: number; fontSize?: number } = {}
): Uint8Array {
  const { w = 288, h = 432, fontSize = 12 } = opts; // default: 4x6in label
  const esc = (t: string) => t.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  let text = `BT /F1 ${fontSize} Tf 24 ${h - 40} Td ${Math.round(fontSize * 1.35)} TL\n`;
  for (const l of lines) text += `(${esc(l)}) Tj T*\n`;
  text += "ET";
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>`,
    `<< /Length ${text.length} >>\nstream\n${text}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objs.forEach((o, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}
