// ============================================================================
// Project Rewards — the incentive layer on top of Open Projects.
//
// The funnel already exists in the wild: makers publish on hackaday.io /
// hackster.io and drop a "you can get the board on Tindie" link. This module
// internalizes that loop and pays for it:
//
//   SELLER-FUNDED: a seller attaches a RewardProgram to a listing — publish an
//   approved project that USES this product and earn store credit or a coupon.
//   The seller is buying exactly what a Hackster feature gives them (public
//   proof the product works, searchable content, buyer confidence) at a price
//   they set, from a budget they cap.
//
//   PLATFORM-FUNDED: Tindie can feature outstanding projects and top up with
//   platform credit — an editorial lever, not an entitlement.
//
// Anti-abuse rules (each one exists because the naive version gets farmed):
//   1. VERIFIED PURCHASE — the publisher must hold an entitlement / order for
//      the component product. No purchase, no reward; a project written from
//      photos of someone else's board earns nothing.
//   2. QUALITY BAR — machine-checkable minimum before a grant is even created:
//      ≥2 substantive sections OR ≥1 build log, and a summary. The seller
//      review is the human bar on top, not instead.
//   3. ONE GRANT per buyer per product. Ten thin projects on the same board
//      pay once.
//   4. BUDGET CAP — programs carry a budget; spent ≥ budget auto-pauses the
//      program. A seller can never wake up to an unbounded liability.
//   5. SELLER DECIDES, WITH REASONS — grants are approved/denied by the seller
//      like challenge entries; a denial requires a reason the buyer reads.
//      (Same governance posture as the challenge circuit breaker — if a
//      seller's program denies most claims, that's a platform-review flag.)
//
// Credits note: credit balances are gated by OUR ledger at spend time, not by
// the payment processor — Stripe metered billing aggregates at period end and
// cannot do real-time balance enforcement. The wallet is a first-class balance
// with the same audit discipline as payouts.
// ============================================================================

import { OpenProject } from "./projects";

export type RewardType = "credit" | "coupon";

export interface RewardProgram {
  id: string;
  productId: string;
  productTitle: string;
  sellerName: string;
  type: RewardType;
  /** For credit: USD added to the buyer's Tindie wallet. */
  creditUsd?: number;
  /** For coupon: percent off the buyer's next order from this seller. */
  couponPct?: number;
  budgetUsd: number;
  spentUsd: number;
  status: "active" | "paused" | "exhausted";
  blurb: string; // shown on the product page + publish form
}

export type GrantStatus = "pending" | "approved" | "denied";

export interface RewardGrant {
  id: string;
  programId: string;
  projectId: string;
  buyerName: string;
  type: RewardType;
  valueUsd: number; // credit amount, or estimated coupon value for budget math
  couponPct?: number;
  status: GrantStatus;
  reason?: string; // required on deny
  createdAt: string;
  decidedAt?: string;
}

// ---------------------------------------------------------------------------
// Eligibility — pure, testable. The store calls this when a project publishes.
// ---------------------------------------------------------------------------
export interface EligibilityInput {
  program: RewardProgram;
  project: Pick<OpenProject, "sections" | "summary"> & { logsCount?: number };
  buyerHasPurchase: boolean;
  alreadyGrantedForProduct: boolean;
}

export function checkRewardEligibility(inp: EligibilityInput): { ok: boolean; fail?: string } {
  const { program, project, buyerHasPurchase, alreadyGrantedForProduct } = inp;
  if (program.status !== "active") return { ok: false, fail: "program_not_active" };
  if (program.spentUsd >= program.budgetUsd) return { ok: false, fail: "budget_exhausted" };
  if (!buyerHasPurchase) return { ok: false, fail: "no_verified_purchase" };
  if (alreadyGrantedForProduct) return { ok: false, fail: "already_rewarded_for_product" };
  const substantive = project.sections.filter((s) => s.body.trim().length >= 80).length;
  const qualityOk = substantive >= 2 || (project.logsCount ?? 0) >= 1;
  if (!qualityOk || !project.summary.trim()) return { ok: false, fail: "below_quality_bar" };
  return { ok: true };
}

/** Budget math on approval; flips the program to exhausted at the cap. */
export function applyGrantToProgram(p: RewardProgram, g: RewardGrant): RewardProgram {
  const spent = p.spentUsd + g.valueUsd;
  return { ...p, spentUsd: spent, status: spent >= p.budgetUsd ? "exhausted" : p.status };
}

// ---------------------------------------------------------------------------
// Seeds
// ---------------------------------------------------------------------------
export const seedRewardPrograms: RewardProgram[] = [
  {
    id: "rp_pocket",
    productId: "dp_pocket_assembled",
    productTitle: "RP2350 Pocket Instrument — assembled",
    sellerName: "SuLab",
    type: "credit",
    creditUsd: 5,
    budgetUsd: 250,
    spentUsd: 35,
    status: "active",
    blurb: "Publish a project using this instrument — measurements, mods, teardowns — and earn $5 Tindie credit once it's approved.",
  },
  {
    id: "rp_pla",
    productId: "dp_logic_preorder",
    productTitle: "Pocket Logic Analyzer — Batch 2",
    sellerName: "SuLab",
    type: "coupon",
    couponPct: 15,
    budgetUsd: 300,
    spentUsd: 0,
    status: "active",
    blurb: "Ship a decoder or capture write-up with the PLA and get 15% off your next SuLab order.",
  },
];

export const seedRewardGrants: RewardGrant[] = [
  {
    id: "rg_1",
    programId: "rp_pocket",
    projectId: "pj_kit_buildlog",
    buyerName: "mkr_jensen",
    type: "credit",
    valueUsd: 5,
    status: "approved",
    createdAt: "2026-07-11",
    decidedAt: "2026-07-12",
  },
];
