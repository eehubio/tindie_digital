import { Campaign } from "./build";

// Demo dataset carried over from ezplm_prebuild: Pocket Logic Analyzer,
// 37 of 50 units reserved at $79, partner DFM score 92, three quote tiers.
export const seedCampaigns: Campaign[] = [
  {
    id: "bc_pla001",
    slug: "pocket-logic-analyzer",
    ezplmProjectId: "pla-001",
    tindieProductId: undefined,
    title: "Pocket Logic Analyzer",
    subtitle: "8-channel, 100 MSa/s, USB-C, fits in a pencil case",
    description:
      "A pocket-sized 8-channel logic analyzer built around an RP2350 and a fast level-shifter front end. " +
      "Sigrok/PulseView compatible out of the box. Designed to be the analyzer you actually carry, not the one " +
      "that lives in a drawer.",
    ownerName: "Aricore",
    status: "preorder_active",
    campaignType: "batch_build",
    maturityLevel: "engineering_sample",
    minimumUnits: 50,
    maximumUnits: 200,
    reservedUnits: 37,
    paidUnits: 37,
    unitPrice: 79,
    earlyBirdPrice: 69,
    earlyBirdQuantity: 25,
    estimatedShipDate: "2026-10-15",
    campaignStart: "2026-06-20",
    campaignEnd: "2026-08-20",
    publicRiskSummary:
      "This is an engineering sample, not a finished product. The enclosure tooling is not yet complete and the " +
      "ship date may move by up to four weeks. Nothing is charged unless the 50-unit goal is met.",
    refundPolicy:
      "If the goal is not reached by the deadline, no card is ever charged. After the goal is reached, a preorder " +
      "can be cancelled for a full refund at any point before production starts.",
    readiness: {
      gerber: "ready",
      bom: "ready",
      pickAndPlace: "ready",
      testProcedure: "needs_update",
      packaging: "missing",
    },
    specs: [
      { label: "Channels", value: "8 (5 V tolerant)" },
      { label: "Sample rate", value: "100 MSa/s" },
      { label: "MCU", value: "RP2350" },
      { label: "Interface", value: "USB-C" },
      { label: "Software", value: "sigrok / PulseView" },
      { label: "Size", value: "58 × 30 × 11 mm" },
    ],
    variants: [
      { id: "v1", name: "Board only", sku: "PLA-B", unitPrice: 79, reservedQuantity: 22 },
      { id: "v2", name: "Board + enclosure + probes", sku: "PLA-K", unitPrice: 99, reservedQuantity: 15 },
    ],
    milestones: [
      { id: "m1", title: "Working Prototype", status: "completed", visibility: "public", targetDate: "2026-05-10", progress: 100 },
      { id: "m2", title: "Design Freeze", status: "completed", visibility: "public", targetDate: "2026-06-05", progress: 100 },
      { id: "m3", title: "DFM Review", status: "completed", visibility: "public", targetDate: "2026-06-18", progress: 100 },
      { id: "m4", title: "Preorder Launch", status: "completed", visibility: "public", targetDate: "2026-06-20", progress: 100 },
      { id: "m5", title: "Preorder Goal Reached", status: "in_progress", visibility: "public", targetDate: "2026-08-20", progress: 74 },
      { id: "m6", title: "Material Purchase", status: "pending", visibility: "internal", targetDate: "2026-08-25", progress: 0 },
      { id: "m7", title: "PCB Production", status: "pending", visibility: "internal", targetDate: "2026-09-05", progress: 0 },
      { id: "m8", title: "SMT Assembly", status: "pending", visibility: "internal", targetDate: "2026-09-18", progress: 0 },
      { id: "m9", title: "Functional Test", status: "pending", visibility: "internal", targetDate: "2026-09-28", progress: 0 },
      { id: "m10", title: "Shipping", status: "pending", visibility: "public", targetDate: "2026-10-15", progress: 0 },
    ],
    review: {
      id: "mr_001",
      partnerId: "pt_huaqiu",
      partnerName: "Huaqiu (华秋)",
      status: "dfm_passed",
      dfmScore: 92,
      bomRisk: "low",
      assemblyFeasibility: "high",
      testability: "good",
      quoteTiers: [
        { quantity: 50, unitCost: 41.2, leadTimeDays: 25 },
        { quantity: 100, unitCost: 34.8, leadTimeDays: 22 },
        { quantity: 200, unitCost: 29.4, leadTimeDays: 20 },
      ],
      recommendations: [
        "Increase clearance around U3 to 0.25 mm — current 0.15 mm risks solder bridging at reflow.",
        "R14 (0402) is at end-of-life at the preferred distributor; a drop-in 0603 alternative is available.",
        "Add two fiducials to the top layer for reliable pick-and-place alignment.",
        "Test points on the USB D+/D- pair would make functional test meaningfully faster.",
      ],
      handledRecommendations: [
        "Add two fiducials to the top layer for reliable pick-and-place alignment.",
      ],
      publicSummary:
        "Reviewed by Huaqiu. DFM score 92/100, BOM risk low, assembly feasibility high. Two minor layout changes were " +
        "requested and one has been applied.",
      quoteValidUntil: "2026-08-05",
    },
    orders: [
      { id: "o1", date: "2026-06-21", country: "US", variantName: "Board only", units: 3, amount: 207, status: "reserved" },
      { id: "o2", date: "2026-06-23", country: "DE", variantName: "Board + enclosure + probes", units: 2, amount: 138, status: "reserved" },
      { id: "o3", date: "2026-06-27", country: "US", variantName: "Board only", units: 5, amount: 345, status: "reserved" },
      { id: "o4", date: "2026-07-01", country: "GB", variantName: "Board + enclosure + probes", units: 4, amount: 276, status: "reserved" },
      { id: "o5", date: "2026-07-03", country: "US", variantName: "Board only", units: 6, amount: 474, status: "reserved" },
      { id: "o6", date: "2026-07-05", country: "JP", variantName: "Board + enclosure + probes", units: 3, amount: 297, status: "reserved" },
      { id: "o7", date: "2026-07-07", country: "DE", variantName: "Board only", units: 4, amount: 316, status: "reserved" },
      { id: "o8", date: "2026-07-09", country: "CA", variantName: "Board + enclosure + probes", units: 4, amount: 396, status: "reserved" },
      { id: "o9", date: "2026-07-10", country: "US", variantName: "Board only", units: 4, amount: 316, status: "reserved" },
      { id: "o10", date: "2026-07-11", country: "AU", variantName: "Board + enclosure + probes", units: 2, amount: 198, status: "reserved" },
    ],
    activity: [
      { at: "2026-07-11", text: "2 units reserved from Australia." },
      { at: "2026-07-09", text: "Huaqiu quote refreshed — 200-unit tier improved to $29.40/unit." },
      { at: "2026-07-05", text: "Fiducial recommendation applied and re-uploaded." },
      { at: "2026-06-20", text: "Preorder campaign published. Goal: 50 units by 20 Aug." },
    ],
  },
];

export function getCampaign(slug: string) {
  return seedCampaigns.find((c) => c.slug === slug || c.id === slug);
}
