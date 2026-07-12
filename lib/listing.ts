// ============================================================================
// The Tindie listing field schema.
//
// This is deliberately the SAME field set the existing Tindie product-create
// form already has — name, category, price, stock, markdown description,
// photos, shipping profile, tags, docs/links, OSHWA UID, weight, options.
// The AI composer does not invent a new listing model; it fills THIS one.
// That is what makes it an extension rather than a parallel product.
// ============================================================================

export type EvidenceSource =
  | "voice"
  | "text"
  | "photo"
  | "schematic"
  | "pcb"
  | "bom"
  | "readme"
  | "repo"
  | "benchmark";

export interface ExtractedField {
  key: string;
  label: string;
  value: string;
  /** Where the value came from — shown to the seller, never hidden. */
  sources: EvidenceSource[];
  confidence: number; // 0..1
  kind?: "text" | "textarea" | "number" | "select";
  options?: string[];
  hint?: string;
}

export const SOURCE_LABEL: Record<EvidenceSource, string> = {
  voice: "voice",
  text: "typed note",
  photo: "product photo",
  schematic: "schematic",
  pcb: "PCB",
  bom: "BOM",
  readme: "README",
  repo: "repo",
  benchmark: "price benchmark",
};

/**
 * Mock composer. In production this is one LLM call over the union of the
 * seller's inputs, constrained to emit exactly this field list with a
 * confidence and a source list per field. Nothing is auto-published: fields
 * below the review threshold are surfaced for confirmation.
 */
export const REVIEW_THRESHOLD = 0.8;

export function composeListing(inputs: {
  voice: boolean;
  text: boolean;
  photos: number;
  engineeringFiles: boolean;
  repo: boolean;
}): ExtractedField[] {
  const src: EvidenceSource[] = [];
  if (inputs.voice) src.push("voice");
  if (inputs.text) src.push("text");
  if (inputs.photos > 0) src.push("photo");
  if (inputs.engineeringFiles) src.push("schematic", "pcb", "bom");
  if (inputs.repo) src.push("readme", "repo");

  const has = (s: EvidenceSource) => src.includes(s);

  // Confidence rises when a claim is corroborated by more than one source.
  const conf = (base: number, ...needed: EvidenceSource[]) => {
    const hits = needed.filter(has).length;
    if (hits === 0) return Math.max(0.35, base - 0.35);
    return Math.min(0.99, base + (hits - 1) * 0.06);
  };

  const pick = (...s: EvidenceSource[]) => s.filter(has);

  return [
    {
      key: "title",
      label: "Product name",
      value: "Industrial RS485 ↔ TTL Module (MAX485E)",
      sources: pick("voice", "text", "schematic", "readme"),
      confidence: conf(0.88, "voice", "schematic", "readme"),
      kind: "text",
      hint: "Tindie titles perform best when the main IC and the function are both present.",
    },
    {
      key: "category",
      label: "Category",
      value: "Breakout Boards & Modules",
      sources: pick("voice", "schematic", "bom"),
      confidence: conf(0.91, "schematic", "voice"),
      kind: "select",
      options: [
        "Breakout Boards & Modules",
        "Development Boards",
        "Sensors",
        "Robotics & CNC",
        "Audio",
        "RF & Wireless",
        "Tools",
      ],
    },
    {
      key: "price",
      label: "Price (USD)",
      value: "19.99",
      sources: pick("voice", "benchmark"),
      confidence: conf(0.72, "voice", "benchmark"),
      kind: "number",
      hint: "Benchmarked against 14 comparable RS485 modules on Tindie ($12–$28). Verified against your cost stack in the next step.",
    },
    {
      key: "stock",
      label: "Quantity in stock",
      value: "25",
      sources: pick("text"),
      confidence: 0.5,
      kind: "number",
      hint: "Low confidence — nothing in your inputs states a stock level. Confirm this, or run a preorder instead of guessing.",
    },
    {
      key: "description",
      label: "Product description (Markdown)",
      value:
        "## Industrial RS485 ↔ TTL Module\n\n" +
        "A rugged RS485 transceiver built on the **MAX485E**, with ESD and TVS protection on the A/B lines. " +
        "Drops straight into Arduino, Raspberry Pi and ESP32 projects doing Modbus RTU.\n\n" +
        "### What it does\n" +
        "- Half-duplex RS485 ↔ UART, 5 V logic\n" +
        "- ESD + TVS protection on both differential lines\n" +
        "- 120 Ω termination, jumper-selectable\n" +
        "- 2-layer board, 42 × 22 mm — fits a DIN enclosure\n\n" +
        "### What's included\n" +
        "- 1 × assembled and tested board\n" +
        "- 1 × 3-pin screw terminal (unsoldered)\n\n" +
        "### Notes\n" +
        "Tested at 115200 baud over 300 m of shielded twisted pair.",
      sources: pick("voice", "text", "readme", "schematic", "bom"),
      confidence: conf(0.85, "voice", "readme", "schematic"),
      kind: "textarea",
      hint: "Structure follows the pattern of the highest-converting listings in this category: what it does → what's in the box → notes.",
    },
    {
      key: "tags",
      label: "Tags",
      value: "rs485, max485, modbus, arduino, raspberry-pi, esp32, industrial",
      sources: pick("voice", "schematic", "readme"),
      confidence: conf(0.87, "voice", "readme"),
      kind: "text",
      hint: "Drives both Tindie search and the Solution Finder — the single biggest discoverability lever on a new listing.",
    },
    {
      key: "weight",
      label: "Shipping weight (g)",
      value: "42",
      sources: pick("pcb", "bom"),
      confidence: conf(0.93, "pcb", "bom"),
      kind: "number",
      hint: "Estimated from board area, copper weight and BOM mass. Feeds the shipping profile directly.",
    },
    {
      key: "dimensions",
      label: "Dimensions (mm)",
      value: "42 × 22 × 12",
      sources: pick("pcb"),
      confidence: conf(0.96, "pcb"),
      kind: "text",
    },
    {
      key: "docs",
      label: "Documentation / source links",
      value: "https://github.com/aricore/rs485-max485e",
      sources: pick("repo", "readme"),
      confidence: conf(0.95, "repo"),
      kind: "text",
    },
    {
      key: "oshwa",
      label: "OSHWA UID (optional)",
      value: "",
      sources: [],
      confidence: 0.3,
      kind: "text",
      hint: "Not inferable from your inputs. Leave blank unless the design is OSHWA-certified.",
    },
  ];
}
