// ============================================================================
// Open Projects & Challenges (FunPack model)
//
// Two things live here, and the second is built on the first:
//
// 1. OPEN PROJECTS — hackaday.io-style project pages, publishable by SELLERS
//    (to introduce a product before/during/without a preorder: schematics
//    walkthrough, design decisions, firmware notes — the technical depth that
//    makes a listing credible) and by BUYERS (build logs on hardware they
//    bought, initiated directly from their library).
//
// 2. CHALLENGES — the FunPack mechanism (eetree.cn): the seller (or a sponsor)
//    puts up N units at a deposit price and sets a task. Buy a seat, complete
//    the task before the deadline, publish an open project on Tindie that
//    meets the rules (completeness, format, video) — and the deposit comes
//    back. The buyer effectively gets the hardware free for shipping a real
//    project; the seller gets N public builds; the platform gets content that
//    sells the next batch.
//
// The money mechanics matter: deposits are held in ESCROW on the platform
// balance (never paid out to the seller while entries are pending), so the
// refund is always recoverable — this is a Stripe-corridor product by design.
//
// Governance: a challenge where the seller rejects most submissions is a scam
// with extra steps. The DISPUTE CIRCUIT BREAKER (from Projects PRD v1.0 §11):
// once a seller has made ≥5 decisions and their decline rate exceeds 40%,
// further rejections are blocked and the whole challenge escalates to
// platform review. The seller can still APPROVE while escalated.
// ============================================================================

export type ProjectKind = "product_intro" | "build_log" | "challenge_entry";

export interface ProjectSection {
  heading: string;
  body: string;
}

/** Hackster's "Things used in this project" — the commerce link. Every entry
 *  with a productId points at a Tindie listing; the rest are external parts.
 *  This is the flywheel interface: project → components → listings → sales. */
export interface ProjectComponent {
  name: string;
  qty: number;
  productId?: string; // Tindie listing when it exists
  note?: string;
}

/** Hackaday's project logs — chronological build updates. A project with logs
 *  is alive; "last updated 2 months ago" is a trust signal hackaday buyers
 *  actually read. */
export interface ProjectLog {
  date: string;
  title: string;
  body: string;
}

export interface OpenProject {
  id: string;
  slug: string;
  title: string;
  authorName: string;
  authorRole: "seller" | "buyer";
  kind: ProjectKind;
  /** The listing this project is attached to — the credibility link. */
  productId?: string;
  challengeId?: string;
  summary: string;
  sections: ProjectSection[];
  components: ProjectComponent[];
  logs: ProjectLog[];
  difficulty?: "beginner" | "intermediate" | "advanced";
  hoursSpent?: number;
  tags: string[];
  githubUrl?: string;
  youtubeUrl?: string;
  coverGradient: string;
  likes: number;
  createdAt: string;
  updatedAt: string;

  // ---- Governance ------------------------------------------------------
  /** Publication is NEVER seller-gated. "removed" only via platform ruling
   *  (illegal / IP / spam / dangerous misinformation) — sentiment is not a
   *  moderation criterion. */
  publication: "published" | "removed";
  /** Author held an entitlement/order for the linked product at publish time.
   *  The anti-hit-piece signal: unverified projects can exist, but carry the
   *  missing badge and are never reward-eligible. */
  verifiedPurchase: boolean;
  /** The seller's right of REPLY — not a right of removal. Rendered as an
   *  official block on the project page, like a review response. */
  sellerResponse?: { text: string; date: string };
  /** Platform editorial: featured by Tindie — aligns with the existing
   *  Tindarian recognition culture. An editorial lever, never an entitlement:
   *  no auto-rule, so it can't be farmed. */
  featured?: boolean;
  /** Factual-dispute flag: seller (or anyone) escalates to platform review.
   *  Grounds are provable falsehoods or policy violations, not "unfavorable".
   *  Burden of proof sits with the flagger. */
  flag?: {
    by: string;
    reason: string;
    at: string;
    status: "open" | "dismissed" | "upheld";
    resolution?: string;
  };
}

export type EntryStatus =
  | "building" // seat claimed, work in progress
  | "submitted" // project published, awaiting seller review
  | "approved" // rules met → deposit refund issued
  | "rejected" // rules not met, reason attached, may resubmit before deadline
  | "forfeited"; // deadline passed without submission — deposit released to seller

export interface ChallengeEntry {
  id: string;
  challengeId: string;
  buyerName: string;
  projectId?: string;
  status: EntryStatus;
  decidedAt?: string;
  reason?: string;
}

export interface ChallengeSponsor {
  name: string;
  logoToken: string;
  contribution: string; // "funds deposits for 10 seats" / "provides a parts bundle"
}

export interface ChallengeRule {
  id: string;
  label: string;
  required: boolean;
}

export interface Challenge {
  id: string;
  slug: string;
  title: string;
  sellerName: string;
  productId: string;
  productTitle: string;
  /** Deposit per seat — refunded on an approved submission. */
  depositUsd: number;
  seats: number;
  seatsTaken: number;
  task: string;
  rules: ChallengeRule[];
  opensAt: string;
  deadline: string;
  status: "open" | "judging" | "completed";
  sponsors: ChallengeSponsor[];
  entries: ChallengeEntry[];
  /** Circuit breaker (PRD v1.0 §11): set true when decline rate > 40% over ≥5 decisions. */
  escalated: boolean;
}

// ---------------------------------------------------------------------------
// Seeds
// ---------------------------------------------------------------------------

export const seedProjects: OpenProject[] = [
  {
    id: "pj_pocket_intro",
    slug: "pocket-instrument-design-walkthrough",
    title: "Pocket Instrument: a full design walkthrough, from requirements to a 4-layer board",
    authorName: "SuLab",
    authorRole: "seller",
    kind: "product_intro",
    productId: "dp_pocket_assembled",
    summary:
      "Why RP2350 over an STM32H7, how the analog front end reaches a ±20V input range, the 4-layer stackup and impedance control — and what each of the three board spins got wrong. Laying the design process open is the shortest path to a buyer trusting this board.",
    sections: [
      {
        heading: "Architecture trade-off: the RP2350 PIO is the soul of this instrument",
        body: "Squeezing a scope + logic analyzer + signal generator into a pocket, the bottleneck is never core clock — it's the acquisition path. The RP2350's 12 PIO state machines orchestrate 100 MS/s capture without touching the CPU, which no Cortex-M7 at this price can do. The cost: analog performance rests entirely on an external AFE — hence the next section.",
      },
      {
        heading: "Analog front end: three iterations to a ±20V input range",
        body: "v0.1 used relay-switched attenuation — expensive, with lifetime concerns. v0.2 moved to analog switches — channel crosstalk out of spec. v1.0 settled on a fixed 20:1 divider + PGA: $3.20 off the BOM and −68 dB crosstalk. All three schematic revisions live in /hw/afe-history in the repo.",
      },
      {
        heading: "Failed board spins (this section is more useful than the successes)",
        body: "Spin 1: the USB-C CC resistors were drawn as pull-ups, so active cables identified the board as a DFP and it never enumerated. Spin 2: the crystal sat too close to the PIO sampling clock trace — 0.3% sampling jitter at 100 MS/s. Spin 3 passed. The failed Gerbers stay in the repo: anyone buying this board should know which holes it already fell into.",
      },
    ],
    components: [
      { name: "RP2350 Pocket Instrument — assembled", qty: 1, productId: "dp_pocket_assembled" },
      { name: "USB-C PD charger, 30 W+ (any brand)", qty: 1, note: "PPS support recommended" },
    ],
    logs: [
      {
        date: "2026-06-18",
        title: "v1.0 boards back from fab — third spin passes",
        body: "All 12 functional-test points green on 5/5 units. The crystal move (8 mm away from the PIO clock trace) killed the sampling jitter completely: 0.02% at 100 MS/s, down from 0.3%.",
      },
      {
        date: "2026-07-10",
        title: "Firmware 1.2: calibration persists across power cycles",
        body: "AFE offset calibration now stores to flash with a CRC. Also published the failed spin-1 and spin-2 Gerbers to /hw/failed-spins — several buyers asked to see them after reading the walkthrough.",
      },
    ],
    difficulty: "advanced",
    hoursSpent: 120,
    tags: ["RP2350", "test-instruments", "4-layer", "KiCad 8"],
    githubUrl: "https://github.com/sulab/pocket-instrument",
    youtubeUrl: "https://youtube.com/watch?v=demo_pocket_intro",
    coverGradient: "from-teal-600 to-emerald-800",
    likes: 214,
    publication: "published",
    verifiedPurchase: true,
    createdAt: "2026-06-18",
    updatedAt: "2026-07-10",
  },
  {
    id: "pj_can_sniffer",
    slug: "can-bus-decoder-on-pocket-logic-analyzer",
    title: "A real-time CAN bus decoder built on the Pocket Logic Analyzer",
    authorName: "hw_elena",
    authorRole: "buyer",
    kind: "challenge_entry",
    productId: "dp_logic_preorder",
    challengeId: "ch_pla_batch2",
    summary:
      "The challenge task: implement a protocol decoder on the PLA. I picked CAN 2.0B — PIO capture, host-side Python decoding, and a small GUI mapping frames to DBC signals. The video shows live capture on a real car's OBD port.",
    sections: [
      {
        heading: "Why not just use candump",
        body: "candump needs a CAN transceiver and SocketCAN; the point of the challenge is to prove the PLA's raw sampling ability. I sample the CAN_H/CAN_L differential pair directly and recover bit timing in software — at 100 MS/s, a 500 kbps bus gets a luxurious 200× oversampling.",
      },
      {
        heading: "The trap: bit stuffing",
        body: "The first decoder version reliably broke on long frames. Two evenings of debugging later: I hadn't handled CAN's 5-bit stuffing rule. Exactly the kind of protocol detail these challenges exist for — one line in the datasheet, one full evening to implement.",
      },
    ],
    components: [
      { name: "Pocket Logic Analyzer — Batch 2", qty: 1, productId: "dp_logic_preorder" },
      { name: "OBD-II breakout cable", qty: 1, note: "any generic one" },
      { name: "120 Ω termination resistor", qty: 2 },
    ],
    logs: [
      {
        date: "2026-07-09",
        title: "Bit stuffing finally handled — long frames decode clean",
        body: "Rewrote the deframer as a state machine that strips stuff bits before CRC. 10k frames from the OBD port, zero CRC failures.",
      },
    ],
    difficulty: "intermediate",
    hoursSpent: 30,
    tags: ["CAN", "logic-analyzer", "Python", "challenge-entry"],
    githubUrl: "https://github.com/elena-hw/pla-can-decoder",
    youtubeUrl: "https://youtube.com/watch?v=demo_can_decoder",
    coverGradient: "from-amber-500 to-orange-800",
    likes: 87,
    publication: "published",
    verifiedPurchase: true,
    createdAt: "2026-07-09",
    updatedAt: "2026-07-12",
  },
  {
    id: "pj_kit_buildlog",
    slug: "pocket-instrument-kit-build-log",
    title: "Pocket Instrument kit build log: two hours, one hot-air station, zero rework",
    authorName: "mkr_jensen",
    authorRole: "buyer",
    kind: "build_log",
    productId: "dp_pocket_bundle",
    summary:
      "I bought the kit + source files bundle. This log covers soldering order, hot-air parameters for the QFN-60, and the calibration routine at first firmware boot — a reproducible checklist for whoever builds one next.",
    sections: [
      {
        heading: "Hand-placing the QFN-60: parameters that worked",
        body: "SAC305 paste, hot air at 320°C / 40% airflow, 90 s preheat. The trick: tack two diagonal corners before reflowing the whole package — the official docs skip this step, but it took my success rate from 50% to 100% (sample size 2, honestly declared).",
      },
    ],
    components: [
      { name: "Pocket Instrument kit + source bundle", qty: 1, productId: "dp_pocket_bundle" },
      { name: "SAC305 solder paste", qty: 1 },
      { name: "Hot-air station", qty: 1, note: "320°C / 40% airflow" },
    ],
    logs: [],
    difficulty: "beginner",
    hoursSpent: 2,
    tags: ["build-log", "QFN", "hot-air-rework"],
    githubUrl: "",
    youtubeUrl: "https://youtube.com/watch?v=demo_buildlog",
    coverGradient: "from-indigo-600 to-violet-900",
    likes: 41,
    publication: "published",
    verifiedPurchase: true,
    createdAt: "2026-07-11",
    updatedAt: "2026-07-11",
  },
  {
    id: "pj_thermal_critique",
    slug: "pocket-instrument-usb-thermal-issue",
    title: "Pocket Instrument teardown: the USB-C thermal issue nobody mentions",
    authorName: "probe_master",
    authorRole: "buyer",
    kind: "build_log",
    productId: "dp_pocket_assembled",
    summary:
      "I like this instrument — but after 40 minutes of continuous 100 MS/s capture, the USB-C PD input stage hits 71°C and the unit throttles sampling. Thermal camera shots, measurements, and a workaround inside. Posting this so the next buyer knows what to expect.",
    sections: [
      {
        heading: "The measurement",
        body: "Ambient 24°C, continuous capture at 100 MS/s, USB-C PD at 9V. The buck converter area reaches 71°C at the 40-minute mark (thermal cam frames in the repo). Firmware then drops the sample rate to 50 MS/s — undocumented behavior; I initially thought my unit was faulty.",
      },
      {
        heading: "Workaround that works",
        body: "Feeding 5V instead of 9V keeps the converter at 54°C with no throttling — the efficiency curve clearly favors the lower input at this load. A firmware toggle to prefer 5V negotiation would fix this in software.",
      },
    ],
    components: [{ name: "RP2350 Pocket Instrument — assembled", qty: 1, productId: "dp_pocket_assembled" }],
    logs: [],
    difficulty: "intermediate",
    hoursSpent: 6,
    tags: ["teardown", "thermal", "USB-PD"],
    githubUrl: "https://github.com/probe-master/pocket-thermal-notes",
    youtubeUrl: "",
    coverGradient: "from-rose-600 to-slate-800",
    likes: 156,
    publication: "published",
    verifiedPurchase: true,
    featured: true,
    sellerResponse: {
      text: "This is accurate and we should have documented it. The 71°C reading matches our own bench data; the throttle at 50 MS/s is a deliberate protection we failed to put in the manual. Firmware 1.3 (in version notes now) adds a 'prefer 5V' option exactly as suggested, and the manual gains a thermal section. Thank you for the thorough write-up — the $5 project reward is yours, obviously.",
      date: "2026-07-14",
    },
    createdAt: "2026-07-13",
    updatedAt: "2026-07-13",
  },
];

export const seedChallenges: Challenge[] = [
  {
    id: "ch_pla_batch2",
    slug: "pla-protocol-decoder-challenge",
    title: "Pocket Logic Analyzer Protocol Decoder Challenge · Round 1",
    sellerName: "SuLab",
    productId: "dp_logic_preorder",
    productTitle: "Pocket Logic Analyzer — Batch 2",
    depositUsd: 79,
    seats: 20,
    seatsTaken: 14,
    task:
      "Build a decoder for any serial protocol on the Pocket Logic Analyzer — beyond UART/SPI/I²C: CAN, LIN, 1-Wire, DALI, SWD… the more obscure the better. Publish the complete project open-source on Tindie with a demo video. Finish on time and pass review, and the $79 deposit is refunded in full — the board is effectively free.",
    rules: [
      { id: "r_repo", label: "Open repo: full source + README with reproduction steps", required: true },
      { id: "r_project", label: "Tindie project page linked to this product (≥2 sections: approach + pitfalls)", required: true },
      { id: "r_video", label: "Demo video, YouTube or similar (≥2 min, showing live decoding)", required: true },
      { id: "r_license", label: "OSS license: MIT / Apache-2.0 / CERN-OHL — your pick", required: true },
      { id: "r_bonus", label: "Bonus: decoding logic runs on the PIO, not the host", required: false },
    ],
    opensAt: "2026-06-25",
    deadline: "2026-08-15",
    status: "open",
    sponsors: [
      {
        name: "DigiKey",
        logoToken: "DK",
        contribution: "Funding deposits for 10 seats, plus a $25 components voucher for every finisher",
      },
    ],
    entries: [
      { id: "en_1", challengeId: "ch_pla_batch2", buyerName: "hw_elena", projectId: "pj_can_sniffer", status: "approved", decidedAt: "2026-07-13" },
      { id: "en_2", challengeId: "ch_pla_batch2", buyerName: "probe_master", status: "building" },
      { id: "en_3", challengeId: "ch_pla_batch2", buyerName: "mkr_jensen", status: "building" },
      { id: "en_4", challengeId: "ch_pla_batch2", buyerName: "fpga_wanderer", status: "submitted" },
      { id: "en_5", challengeId: "ch_pla_batch2", buyerName: "uart_hermit", status: "rejected", decidedAt: "2026-07-12", reason: "Video missing — rule 3 is a hard requirement. Fix and resubmit before the deadline." },
    ],
    escalated: false,
  },
];

// ---------------------------------------------------------------------------
// Circuit breaker (Projects PRD v1.0 §11)
// ---------------------------------------------------------------------------
export const CIRCUIT_BREAKER = { minDecisions: 5, maxDeclineRate: 0.4 };

export function declineStats(c: Challenge) {
  const decided = c.entries.filter((e) => e.status === "approved" || e.status === "rejected");
  const rejected = decided.filter((e) => e.status === "rejected");
  const rate = decided.length > 0 ? rejected.length / decided.length : 0;
  return {
    decisions: decided.length,
    rejections: rejected.length,
    rate,
    tripped: decided.length >= CIRCUIT_BREAKER.minDecisions && rate > CIRCUIT_BREAKER.maxDeclineRate,
  };
}

export function escrowTotal(c: Challenge) {
  // Deposits held until each entry resolves. Approved → refunded to buyer.
  // Forfeited → released to seller. Nothing pays out while pending.
  const pending = c.entries.filter((e) => e.status === "building" || e.status === "submitted").length;
  return pending * c.depositUsd;
}
