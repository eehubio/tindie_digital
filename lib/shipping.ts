// ============================================================================
// Shipping, customs and carrier layer.
// Ported from the Seller Console prototype. Rates are computed as
// (zone base + per-gram rate × parcel weight); in production these are replaced
// by live carrier quotes from a rate-aggregation API (Shippo / EasyPost) — the
// shape of the data below is deliberately the shape Shippo returns, so the swap
// is a provider change, not a redesign.
// ============================================================================

export interface ShipMethod {
  id: string;
  name: string;
  base: number;
  perG: number;
  eta: string;
  track: boolean;
}

export interface ShipZone {
  label: string;
  methods: ShipMethod[];
}

export const SHIP_ZONES: Record<string, ShipZone> = {
  zone2: {
    label: "North America",
    methods: [
      { id: "usps_first", name: "USPS First-Class Intl", base: 4.5, perG: 0.012, eta: "7–18 days", track: false },
      { id: "usps_pri", name: "USPS Priority Intl", base: 13.0, perG: 0.01, eta: "6–10 days", track: true },
      { id: "dhl", name: "DHL Express", base: 32.0, perG: 0.006, eta: "2–4 days", track: true },
    ],
  },
  zone3: {
    label: "Europe / UK",
    methods: [
      { id: "usps_first", name: "USPS First-Class Intl", base: 6.0, perG: 0.014, eta: "10–21 days", track: false },
      { id: "usps_pri", name: "USPS Priority Intl", base: 16.5, perG: 0.012, eta: "7–12 days", track: true },
      { id: "dhl", name: "DHL Express", base: 34.0, perG: 0.007, eta: "3–5 days", track: true },
    ],
  },
  zone4: {
    label: "Asia-Pacific",
    methods: [
      { id: "usps_first", name: "USPS First-Class Intl", base: 6.5, perG: 0.015, eta: "10–24 days", track: false },
      { id: "dhl", name: "DHL Express", base: 36.0, perG: 0.008, eta: "3–6 days", track: true },
    ],
  },
  zone5: {
    label: "Rest of World",
    methods: [
      { id: "usps_first", name: "USPS First-Class Intl", base: 8.0, perG: 0.018, eta: "14–40 days", track: false },
      { id: "dhl", name: "DHL Express", base: 42.0, perG: 0.01, eta: "4–8 days", track: true },
    ],
  },
};

export const ALL_METHOD_NAMES = ["USPS First-Class Intl", "USPS Priority Intl", "DHL Express"];

export interface DestCountry {
  label: string;
  flag: string;
  zone: string;
  vat: number;
  ioss?: boolean;
  deMinimis?: number;
  restricted?: boolean;
  note: string;
}

export const DEST_COUNTRIES: Record<string, DestCountry> = {
  US: { label: "United States", flag: "🇺🇸", zone: "zone2", vat: 0, deMinimis: 800, note: "US de minimis is $800 — below that, normally duty-free." },
  GB: { label: "United Kingdom", flag: "🇬🇧", zone: "zone3", vat: 0.2, ioss: false, note: "Under £135, 20% UK VAT must be collected at checkout." },
  DE: { label: "Germany (EU)", flag: "🇩🇪", zone: "zone3", vat: 0.19, ioss: true, note: "EU IOSS: 19% VAT collected at checkout under €150 — faster clearance, no surprise fee for the buyer." },
  FR: { label: "France (EU)", flag: "🇫🇷", zone: "zone3", vat: 0.2, ioss: true, note: "EU IOSS: 20% VAT collected at checkout under €150." },
  CA: { label: "Canada", flag: "🇨🇦", zone: "zone2", vat: 0.05, deMinimis: 20, note: "Above C$20 the carrier may collect GST/duty on delivery." },
  AU: { label: "Australia", flag: "🇦🇺", zone: "zone4", vat: 0.1, deMinimis: 1000, note: "Duty-free under A$1,000; GST may still apply." },
  JP: { label: "Japan", flag: "🇯🇵", zone: "zone4", vat: 0.1, deMinimis: 130, note: "Usually duty-free under ¥10,000." },
  BR: { label: "Brazil", flag: "🇧🇷", zone: "zone5", vat: 0.17, restricted: true, note: "Complex clearance and high taxes — many sellers block this destination." },
  IN: { label: "India", flag: "🇮🇳", zone: "zone5", vat: 0.18, note: "IGST due on import; clearance is slow." },
};

// ---------------------------------------------------------------------------
// Seller shipping profile — one config, reused by the listing wizard, the
// net-income calculator, the buyer checkout and the fulfillment screen.
// ---------------------------------------------------------------------------
export interface ShipProfile {
  /** Multiple profiles — a 42 g module and a 600 g kit cannot share one weight. */
  id: string;
  name: string;
  originLabel: string;
  weightG: number;
  hsCode: string;
  customsDesc: string;
  mode: "weight" | "flat";
  flatRate: number;
  combined: boolean;
  blockedZones: string[];
  iossRegistered: boolean;
  handlingDays: string;
}

export const defaultShipProfile: ShipProfile = {
  id: "sp_small",
  name: "Small module (padded envelope)",
  originLabel: "United States",
  weightG: 42,
  hsCode: "8517.62",
  customsDesc: "RS485 transceiver module (electronic development board)",
  mode: "weight",
  flatRate: 9.0,
  combined: true,
  blockedZones: ["zone5"],
  iossRegistered: true,
  handlingDays: "1–3 days",
};

export const kitShipProfile: ShipProfile = {
  id: "sp_kit",
  name: "Boxed kit (small parcel)",
  originLabel: "United States",
  weightG: 620,
  hsCode: "9023.00",
  customsDesc: "Electronics education kit (instrument, probes, case)",
  mode: "weight",
  flatRate: 14.0,
  combined: true,
  blockedZones: [],
  iossRegistered: true,
  handlingDays: "2–4 days",
};

export const seedShipProfiles: ShipProfile[] = [defaultShipProfile, kitShipProfile];

export function quoteShipping(zoneKey: string, method: ShipMethod, weightG: number, profile?: ShipProfile) {
  if (profile?.mode === "flat") return r2(profile.flatRate);
  return r2(method.base + method.perG * weightG);
}

export function cheapestQuote(dest: string, profile: ShipProfile) {
  const d = DEST_COUNTRIES[dest];
  if (!d) return null;
  if (profile.blockedZones.includes(d.zone)) return null;
  const zone = SHIP_ZONES[d.zone];
  const priced = zone.methods.map((m) => ({ method: m, cost: quoteShipping(d.zone, m, profile.weightG, profile) }));
  return priced.sort((a, b) => a.cost - b.cost)[0];
}

export interface CustomsHint {
  tone: "ok" | "warn" | "block";
  text: string;
  vatCollected: number;
}

export function customsHint(dest: string, goodsValue: number, profile: ShipProfile): CustomsHint {
  const d = DEST_COUNTRIES[dest];
  if (!d) return { tone: "ok", text: "", vatCollected: 0 };
  if (profile.blockedZones.includes(d.zone))
    return { tone: "block", text: `This seller does not ship to ${d.label}.`, vatCollected: 0 };

  // EU IOSS: seller is registered, so VAT is collected at checkout and the
  // buyer pays nothing on delivery. This is the single biggest conversion lever
  // for EU buyers — a surprise customs bill at the door kills repeat purchase.
  if (d.ioss && profile.iossRegistered) {
    const vat = r2(goodsValue * d.vat);
    return {
      tone: "ok",
      text: `IOSS registered — ${(d.vat * 100).toFixed(0)}% VAT ($${vat.toFixed(
        2
      )}) is collected here at checkout. No customs charge on delivery.`,
      vatCollected: vat,
    };
  }
  if (d.ioss && !profile.iossRegistered) {
    return {
      tone: "warn",
      text: `Seller is not IOSS-registered — the carrier will collect ${(d.vat * 100).toFixed(
        0
      )}% VAT plus a handling fee on delivery.`,
      vatCollected: 0,
    };
  }
  if (d.restricted) return { tone: "warn", text: d.note, vatCollected: 0 };
  if (d.deMinimis && goodsValue < d.deMinimis) return { tone: "ok", text: d.note, vatCollected: 0 };
  return { tone: "warn", text: d.note, vatCollected: 0 };
}

// ---------------------------------------------------------------------------
// Carrier / label layer — the Shippo integration surface.
// ---------------------------------------------------------------------------
export const CARRIERS = [
  { id: "usps", name: "USPS", shippo: true },
  { id: "ups", name: "UPS", shippo: true },
  { id: "fedex", name: "FedEx", shippo: true },
  { id: "dhl_express", name: "DHL Express", shippo: true },
  { id: "china_post", name: "China Post", shippo: false },
  { id: "yanwen", name: "Yanwen", shippo: false },
  { id: "other", name: "Other / manual", shippo: false },
];

export type FulfillStatus = "unfulfilled" | "label_purchased" | "shipped" | "delivered";

export interface Fulfillment {
  id: string;
  orderRef: string;
  productTitle: string;
  buyerName: string;
  destination: string; // DEST_COUNTRIES key
  weightG: number;
  goodsValue: number;
  status: FulfillStatus;
  carrierId?: string;
  service?: string;
  tracking?: string;
  labelCost?: number;
  placedAt: string;
}

// Deterministic-looking mock of what Shippo returns after buying a label.
export function mockShippoLabel(carrierId: string) {
  const c = CARRIERS.find((x) => x.id === carrierId);
  const seq = Math.floor(Math.random() * 9e9)
    .toString()
    .padStart(10, "0");
  const prefix: Record<string, string> = {
    usps: "9400 1000 0000 ",
    ups: "1Z999AA1",
    fedex: "7712 ",
    dhl_express: "JD01",
    china_post: "LZ",
    yanwen: "YW",
    other: "",
  };
  return {
    tracking: `${prefix[carrierId] ?? ""}${seq}`,
    carrierName: c?.name ?? "Manual",
    viaShippo: !!c?.shippo,
  };
}

function r2(n: number) {
  return Math.round(n * 100) / 100;
}
