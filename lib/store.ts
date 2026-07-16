"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { CartItem, Role, QuoteRequest, ManufacturingOrder, Entitlement, Dispute } from "./types";
import {
  seedQuotes, seedOrders, seedEntitlements, seedDisputes, seedFulfillments,
  seedQuestions, seedVersionNotes, seedSellerApplications, seedProductSubmissions,
  partners as seedPartners, products as seedProducts,
} from "./mock";
import { requestDownload } from "./entitlements";
import { ListingDraft, newDraft } from "./draft";
import { OpenProject, Challenge, seedProjects, seedChallenges, declineStats } from "./projects";
import {
  RewardProgram, RewardGrant, seedRewardPrograms, seedRewardGrants,
  checkRewardEligibility, applyGrantToProgram,
} from "./rewards";
import { DownloadGrant, DigitalProduct, ProductQuestion, VersionNote, ServicePartner, SellerApplication, ProductSubmission } from "./types";
import { ShipProfile, seedShipProfiles, Fulfillment } from "./shipping";

interface AppState {
  role: Role;
  setRole: (r: Role) => void;

  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (key: string) => void;
  clearCart: () => void;

  quotes: QuoteRequest[];
  addQuote: (q: QuoteRequest) => void;
  advanceQuote: (id: string, status: QuoteRequest["status"], patch?: Partial<QuoteRequest>) => void;

  orders: ManufacturingOrder[];
  advanceOrder: (id: string) => void;

  entitlements: Entitlement[];
  addEntitlement: (e: Entitlement) => void;
  /**
   * Ask for a download. May REFUSE. The button does not decide — this mirrors
   * the server-side atomic check so the two cannot drift apart.
   */
  requestDownload: (id: string, versionId: string) => DownloadGrant;
  /** Refund kills the licence — a refund is not a free download. */
  revokeEntitlement: (id: string) => void;

  disputes: Dispute[];
  addDispute: (d: Dispute) => void;

  // Shipping profile — one config shared by the wizard, the calculator,
  // buyer checkout and fulfillment. Changing it here changes all four.
  /** Multiple named profiles — a 42 g module and a 620 g kit cannot share one weight. */
  shipProfiles: ShipProfile[];
  updateShipProfile: (id: string, patch: Partial<ShipProfile>) => void;
  addShipProfile: (p: ShipProfile) => void;
  /** Back-compat: the first profile, used where a single default is expected. */
  shipProfile: ShipProfile;
  setShipProfile: (p: ShipProfile) => void;

  /** Products PUBLISHED by the seller in this session — merged into the buyer marketplace. */
  publishedProducts: DigitalProduct[];
  /** Edits to SEEDED listings — applied as overlays so seed data stays immutable. */
  productOverrides: Record<string, Partial<DigitalProduct>>;
  publishProduct: (p: DigitalProduct) => void;
  updateProduct: (id: string, patch: Partial<DigitalProduct>) => void;
  allProducts: () => DigitalProduct[];

  /** Q&A — a listing stays alive after publish. */
  questions: ProductQuestion[];
  askQuestion: (productId: string, q: string) => void;
  answerQuestion: (id: string, answer: string) => void;

  versionNotes: VersionNote[];
  addVersionNote: (n: VersionNote) => void;

  /** Admin: partner records live in state so "Add Partner" actually adds one. */
  partnerList: ServicePartner[];
  addPartner: (p: ServicePartner) => void;
  patchPartner: (id: string, patch: Partial<ServicePartner>) => void;

  sellerApplications: SellerApplication[];
  decideApplication: (id: string, status: "approved" | "rejected", reason?: string) => void;
  productSubmissions: ProductSubmission[];
  decideSubmission: (id: string, status: "approved" | "rejected", reason?: string) => void;

  /** Open projects — hackaday.io-style pages by sellers AND buyers. */
  projects: OpenProject[];
  addProject: (p: OpenProject) => void;
  likeProject: (id: string) => void;

  /** FunPack-style challenges: escrowed deposit, task, rules, refund on approval. */
  challenges: Challenge[];
  joinChallenge: (id: string) => void;

  /** Project rewards — seller-funded credits/coupons for published projects. */
  rewardPrograms: RewardProgram[];
  rewardGrants: RewardGrant[];
  /** Buyer demo wallet: Tindie credit granted by approved rewards. */
  walletCredit: number;
  upsertRewardProgram: (p: RewardProgram) => void;
  decideGrant: (id: string, approve: boolean, reason?: string) => void;

  /** Governance: reply ≠ removal. Sellers respond publicly; flags go to the
   *  platform; only a platform ruling can unpublish. */
  respondToProject: (id: string, text: string) => void;
  flagProject: (id: string, by: string, reason: string) => void;
  resolveProjectFlag: (id: string, uphold: boolean, resolution: string) => void;
  submitEntry: (challengeId: string, entryId: string, projectId: string) => void;
  reviewEntry: (challengeId: string, entryId: string, approve: boolean, reason?: string) => void;

  fulfillments: Fulfillment[];
  updateFulfillment: (id: string, patch: Partial<Fulfillment>) => void;

  destination: string;
  setDestination: (d: string) => void;

  /**
   * ONE draft object for the whole wizard. Previously each step held its own
   * useState, so nothing survived a refresh, nothing could be validated across
   * steps, and there was no way to come back after a long file parse. A listing
   * is a document with a lifecycle, not a sequence of screens.
   */
  draft: ListingDraft;
  patchDraft: (p: Partial<ListingDraft>) => void;
  markStepComplete: (step: string) => void;
  resetDraft: () => void;

  toast: string | null;
  showToast: (msg: string) => void;
}

const MFG_FLOW: ManufacturingOrder["status"][] = [
  "awaiting_files",
  "in_review",
  "in_production",
  "quality_check",
  "shipped",
  "delivered",
];

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
  role: "buyer",
  setRole: (r) => set({ role: r }),

  cart: [],
  addToCart: (item) =>
    set((s) => {
      const existing = s.cart.find((c) => c.key === item.key);
      if (existing) {
        return {
          cart: s.cart.map((c) => (c.key === item.key ? { ...c, qty: c.qty + item.qty } : c)),
          toast: "Added to cart",
        };
      }
      return { cart: [...s.cart, item], toast: "Added to cart" };
    }),
  removeFromCart: (key) => set((s) => ({ cart: s.cart.filter((c) => c.key !== key) })),
  clearCart: () => set({ cart: [] }),

  quotes: seedQuotes,
  addQuote: (q) => set((s) => ({ quotes: [q, ...s.quotes], toast: "Quote request submitted" })),
  advanceQuote: (id, status, patch) =>
    set((s) => ({
      quotes: s.quotes.map((q) => (q.id === id ? { ...q, status, ...patch } : q)),
    })),

  orders: seedOrders,
  advanceOrder: (id) =>
    set((s) => ({
      orders: s.orders.map((o) => {
        if (o.id !== id) return o;
        const idx = MFG_FLOW.indexOf(o.status);
        const next = MFG_FLOW[Math.min(idx + 1, MFG_FLOW.length - 1)];
        if (next === o.status) return o;
        return {
          ...o,
          status: next,
          timeline: [
            ...o.timeline,
            { status: next, at: new Date().toISOString().slice(0, 10), note: `Advanced to ${next.replace(/_/g, " ")}.` },
          ],
        };
      }),
      toast: "Order status advanced",
    })),

  entitlements: seedEntitlements,
  addEntitlement: (e) => set((s) => ({ entitlements: [e, ...s.entitlements] })),
  requestDownload: (id, versionId) => {
    const e = get().entitlements.find((x) => x.id === id);
    if (!e) return { ok: false, reason: "entitlement_revoked", message: "No such entitlement." };

    const grant = requestDownload(e, versionId);
    if (!grant.ok) {
      set({ toast: grant.message ?? "Download refused" });
      return grant;
    }
    // Only a GRANTED download increments the counter — and it can exceed nothing,
    // because the check ran before the increment, not after it.
    set((s) => ({
      entitlements: s.entitlements.map((x) =>
        x.id === id ? { ...x, downloadCount: x.downloadCount + 1 } : x
      ),
      toast: `Signed URL issued — expires in ${grant.expiresInSec}s`,
    }));
    return grant;
  },

  revokeEntitlement: (id) =>
    set((s) => ({
      entitlements: s.entitlements.map((e) => (e.id === id ? { ...e, status: "refunded" as const } : e)),
      toast: "Entitlement revoked — download tokens invalidated",
    })),

  disputes: seedDisputes,
  addDispute: (d) => set((s) => ({ disputes: [d, ...s.disputes], toast: "Dispute opened" })),

  shipProfiles: seedShipProfiles,
  updateShipProfile: (id, patch) =>
    set((s) => ({
      shipProfiles: s.shipProfiles.map((x) => (x.id === id ? { ...x, ...patch } : x)),
      shipProfile: s.shipProfile.id === id ? { ...s.shipProfile, ...patch } : s.shipProfile,
    })),
  addShipProfile: (p) => set((s) => ({ shipProfiles: [...s.shipProfiles, p], toast: `Profile "${p.name}" created` })),
  shipProfile: seedShipProfiles[0],
  setShipProfile: (p) => set({ shipProfile: p }),

  publishedProducts: [],
  publishProduct: (p) =>
    set((s) => ({ publishedProducts: [p, ...s.publishedProducts], toast: `"${p.title}" is live — buyers can see it now` })),
  productOverrides: {},
  updateProduct: (id, patch) =>
    set((s) => {
      const isPublished = s.publishedProducts.some((x) => x.id === id);
      return {
        publishedProducts: isPublished
          ? s.publishedProducts.map((x) => (x.id === id ? { ...x, ...patch } : x))
          : s.publishedProducts,
        productOverrides: isPublished
          ? s.productOverrides
          : { ...s.productOverrides, [id]: { ...s.productOverrides[id], ...patch } },
        toast: "Listing updated — the buyer page reflects it immediately",
      };
    }),
  allProducts: () => {
    const ov = get().productOverrides;
    return [...get().publishedProducts, ...seedProducts.map((p) => (ov[p.id] ? { ...p, ...ov[p.id] } : p))];
  },

  questions: seedQuestions,
  askQuestion: (productId, q) =>
    set((s) => ({
      questions: [
        { id: "q_" + Math.random().toString(36).slice(2, 7), productId, askedBy: "you (buyer demo)", askedAt: new Date().toISOString().slice(0, 10), question: q },
        ...s.questions,
      ],
      toast: "Question sent to the seller",
    })),
  answerQuestion: (id, answer) =>
    set((s) => ({
      questions: s.questions.map((q) =>
        q.id === id ? { ...q, answer, answeredAt: new Date().toISOString().slice(0, 10) } : q
      ),
      toast: "Answer published on the product page",
    })),

  versionNotes: seedVersionNotes,
  addVersionNote: (n) => set((s) => ({ versionNotes: [n, ...s.versionNotes], toast: `Version note ${n.semver} posted` })),

  partnerList: seedPartners,
  addPartner: (p) => set((s) => ({ partnerList: [...s.partnerList, p], toast: `${p.name} created as draft — complete onboarding before buyers see it` })),
  patchPartner: (id, patch) =>
    set((s) => ({ partnerList: s.partnerList.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),

  sellerApplications: seedSellerApplications,
  decideApplication: (id, status, reason) =>
    set((s) => ({
      sellerApplications: s.sellerApplications.map((a) => (a.id === id ? { ...a, status, decisionReason: reason } : a)),
      toast: status === "approved" ? "Seller approved — onboarding email sent" : "Application rejected with reason",
    })),
  productSubmissions: seedProductSubmissions,
  decideSubmission: (id, status, reason) =>
    set((s) => ({
      productSubmissions: s.productSubmissions.map((a) => (a.id === id ? { ...a, status, decisionReason: reason } : a)),
      toast: status === "approved" ? "Product approved and published" : "Submission rejected — seller notified",
    })),

  projects: seedProjects,
  addProject: (p) =>
    set((s) => {
      // Reward evaluation happens server-side at publish in the real system.
      // For every component that maps to a listing with an active program:
      // verified purchase + quality bar + one-per-product → a PENDING grant.
      const newGrants: RewardGrant[] = [];
      if (p.authorRole === "buyer") {
        for (const c of p.components) {
          if (!c.productId) continue;
          const program = s.rewardPrograms.find((rp) => rp.productId === c.productId);
          if (!program) continue;
          const buyerHasPurchase =
            s.entitlements.some((e) => e.productId === c.productId && e.status === "active") ||
            c.productId.startsWith("dp_pocket") || c.productId === "dp_logic_preorder"; // demo: physical orders count too
          const alreadyGranted = s.rewardGrants.some(
            (g) => g.buyerName === p.authorName && g.status !== "denied" &&
                   s.rewardPrograms.find((rp) => rp.id === g.programId)?.productId === c.productId
          );
          const ok = checkRewardEligibility({
            program,
            project: { sections: p.sections, summary: p.summary, logsCount: p.logs.length },
            buyerHasPurchase,
            alreadyGrantedForProduct: alreadyGranted,
          });
          if (ok.ok) {
            newGrants.push({
              id: "rg_" + Math.random().toString(36).slice(2, 7),
              programId: program.id,
              projectId: p.id,
              buyerName: p.authorName,
              type: program.type,
              valueUsd: program.type === "credit" ? program.creditUsd! : Math.round(program.budgetUsd / 60),
              couponPct: program.couponPct,
              status: "pending",
              createdAt: new Date().toISOString().slice(0, 10),
            });
          }
        }
      }
      return {
        projects: [p, ...s.projects],
        rewardGrants: [...newGrants, ...s.rewardGrants],
        toast:
          newGrants.length > 0
            ? "Project published — reward claim created, pending seller approval"
            : "Project published — linked to the product page",
      };
    }),
  likeProject: (id) =>
    set((s) => ({ projects: s.projects.map((p) => (p.id === id ? { ...p, likes: p.likes + 1 } : p)) })),
  respondToProject: (id, text) =>
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === id ? { ...p, sellerResponse: { text, date: new Date().toISOString().slice(0, 10) } } : p
      ),
      toast: "Official response posted on the project page",
    })),
  flagProject: (id, by, reason) =>
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === id && !p.flag
          ? { ...p, flag: { by, reason, at: new Date().toISOString().slice(0, 10), status: "open" as const } }
          : p
      ),
      toast: "Escalated to platform review — grounds must be provable falsehoods or policy violations, not sentiment",
    })),
  resolveProjectFlag: (id, uphold, resolution) =>
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === id && p.flag
          ? {
              ...p,
              flag: { ...p.flag, status: (uphold ? "upheld" : "dismissed") as "upheld" | "dismissed", resolution },
              publication: (uphold ? "removed" : p.publication) as "published" | "removed",
            }
          : p
      ),
      toast: uphold
        ? "Flag upheld — project unpublished, ruling recorded"
        : "Flag dismissed — project stays up, ruling recorded on the flag",
    })),

  rewardPrograms: seedRewardPrograms,
  rewardGrants: seedRewardGrants,
  walletCredit: 5, // mkr_jensen's approved seed grant
  upsertRewardProgram: (p) =>
    set((s) => ({
      rewardPrograms: s.rewardPrograms.some((x) => x.id === p.id)
        ? s.rewardPrograms.map((x) => (x.id === p.id ? p : x))
        : [p, ...s.rewardPrograms],
      toast: "Reward program saved — it now shows on the product page",
    })),
  decideGrant: (id, approve, reason) =>
    set((s) => {
      const g = s.rewardGrants.find((x) => x.id === id);
      if (!g || g.status !== "pending") return {};
      const program = s.rewardPrograms.find((p) => p.id === g.programId)!;
      const grants = s.rewardGrants.map((x) =>
        x.id === id
          ? { ...x, status: (approve ? "approved" : "denied") as "approved" | "denied",
              reason: approve ? undefined : reason,
              decidedAt: new Date().toISOString().slice(0, 10) }
          : x
      );
      return {
        rewardGrants: grants,
        rewardPrograms: approve
          ? s.rewardPrograms.map((p) => (p.id === program.id ? applyGrantToProgram(p, g) : p))
          : s.rewardPrograms,
        walletCredit: approve && g.type === "credit" ? s.walletCredit + g.valueUsd : s.walletCredit,
        toast: approve
          ? g.type === "credit"
            ? `Approved — $${g.valueUsd} Tindie credit added to the buyer's wallet`
            : `Approved — ${g.couponPct}% coupon issued to the buyer`
          : "Denied — reason sent to the buyer",
      };
    }),

  challenges: seedChallenges,
  joinChallenge: (id) =>
    set((s) => ({
      challenges: s.challenges.map((c) =>
        c.id === id && c.seatsTaken < c.seats
          ? {
              ...c,
              seatsTaken: c.seatsTaken + 1,
              entries: [
                ...c.entries,
                { id: "en_" + Math.random().toString(36).slice(2, 7), challengeId: id, buyerName: "you (demo)", status: "building" as const },
              ],
            }
          : c
      ),
      toast: "Joined — your deposit is now in platform escrow. Finish the task, pass review, and it refunds in full",
    })),
  submitEntry: (challengeId, entryId, projectId) =>
    set((s) => ({
      challenges: s.challenges.map((c) =>
        c.id === challengeId
          ? {
              ...c,
              entries: c.entries.map((e) =>
                e.id === entryId ? { ...e, projectId, status: "submitted" as const } : e
              ),
            }
          : c
      ),
      toast: "Entry submitted — awaiting the seller's review against the rules",
    })),
  reviewEntry: (challengeId, entryId, approve, reason) =>
    set((s) => {
      const challenges = s.challenges.map((c) => {
        if (c.id !== challengeId) return c;
        // Circuit breaker: once tripped, further REJECTIONS are blocked —
        // a challenge where the seller rejects most entries is a scam with
        // extra steps. Approvals stay open.
        const stats = declineStats(c);
        if (!approve && stats.tripped) return c;
        const entries = c.entries.map((e) =>
          e.id === entryId
            ? {
                ...e,
                status: (approve ? "approved" : "rejected") as "approved" | "rejected",
                decidedAt: new Date().toISOString().slice(0, 10),
                reason: approve ? undefined : reason,
              }
            : e
        );
        const after = declineStats({ ...c, entries });
        return { ...c, entries, escalated: after.tripped };
      });
      const c = challenges.find((x) => x.id === challengeId)!;
      const stats = declineStats(c);
      return {
        challenges,
        toast: approve
          ? "Approved — deposit refunded to the buyer (Stripe escrow refund)"
          : stats.tripped
          ? "Decline rate above 40% over ≥5 decisions — circuit breaker tripped. Rejections locked; challenge escalated to platform review"
          : "Rejected — reason sent. The buyer can fix and resubmit before the deadline",
      };
    }),

  fulfillments: seedFulfillments,
  updateFulfillment: (id, patch) =>
    set((s) => ({ fulfillments: s.fulfillments.map((f) => (f.id === id ? { ...f, ...patch } : f)) })),

  destination: "DE",
  setDestination: (d) => set({ destination: d }),

  draft: newDraft(),
  patchDraft: (p) =>
    set((s) => ({
      draft: {
        ...s.draft,
        ...p,
        dirtyFields: Array.from(new Set([...s.draft.dirtyFields, ...Object.keys(p)])),
        lastSavedAt: new Date().toISOString(),
      },
    })),
  markStepComplete: (step) =>
    set((s) => ({
      draft: {
        ...s.draft,
        completedSteps: Array.from(new Set([...s.draft.completedSteps, step])),
        lastSavedAt: new Date().toISOString(),
      },
    })),
  resetDraft: () => set({ draft: newDraft() }),

  toast: null,
  showToast: (msg) => set({ toast: msg }),
}),
    {
      name: "tindie-proto-db",
      storage: createJSONStorage(() => localStorage),
      // The demo "database": what the seller publishes/edits survives a refresh
      // and shows up for the buyer. Session-y stuff (role, toast) stays out.
      partialize: (s) => ({
        publishedProducts: s.publishedProducts,
        productOverrides: s.productOverrides,
        questions: s.questions,
        versionNotes: s.versionNotes,
        partnerList: s.partnerList,
        sellerApplications: s.sellerApplications,
        productSubmissions: s.productSubmissions,
        shipProfiles: s.shipProfiles,
        projects: s.projects,
        challenges: s.challenges,
        rewardPrograms: s.rewardPrograms,
        rewardGrants: s.rewardGrants,
        walletCredit: s.walletCredit,
        entitlements: s.entitlements,
        fulfillments: s.fulfillments,
        cart: s.cart,
      }),
      // Avoid SSR hydration mismatch: rehydrate manually after mount (Shell does it).
      skipHydration: true,
      // -------------------------------------------------------------------
      // Persisted-state versioning. localStorage outlives deploys: a client
      // that stored projects BEFORE components[]/logs[] existed (or before
      // the English-content pass) will feed stale shapes into new pages and
      // crash them. A migration is the structural fix; scattering `?? []`
      // through every consumer is the patch we don't do.
      //
      // Policy per collection:
      //   - Seed-origin rows (id matches a seed) → REPLACE with current seed.
      //   - User-created rows → keep, but NORMALIZE missing fields.
      //   - Unknown/missing collections → fall back to seeds via merge below.
      // -------------------------------------------------------------------
      version: 4,
      migrate: (persisted: unknown, fromVersion: number) => {
        const st = (persisted ?? {}) as Record<string, unknown>;
        if (fromVersion < 2) {
          const seedProjIds = new Set(seedProjects.map((x) => x.id));
          const oldProjects = Array.isArray(st.projects) ? (st.projects as OpenProject[]) : [];
          st.projects = [
            // current seeds first (English, full shape)
            ...seedProjects,
            // user-created rows, normalized
            ...oldProjects
              .filter((x) => x && !seedProjIds.has(x.id))
              .map((x) => ({ ...x, components: x.components ?? [], logs: x.logs ?? [], tags: x.tags ?? [] })),
          ];
          const seedChIds = new Set(seedChallenges.map((x) => x.id));
          const oldCh = Array.isArray(st.challenges) ? (st.challenges as Challenge[]) : [];
          st.challenges = [...seedChallenges, ...oldCh.filter((x) => x && !seedChIds.has(x.id))];
          // rewards didn't exist before v2 — drop anything stale, take seeds.
          st.rewardPrograms = seedRewardPrograms;
          st.rewardGrants = seedRewardGrants;
          if (typeof st.walletCredit !== "number") st.walletCredit = 5;
        }
        if (fromVersion < 4) {
          // Governance fields (publication / verifiedPurchase) — default old
          // rows to published; verified only if a matching entitlement exists.
          const projs = Array.isArray(st.projects) ? (st.projects as OpenProject[]) : [];
          const ents = Array.isArray(st.entitlements) ? (st.entitlements as Entitlement[]) : [];
          st.projects = projs.map((x) => ({
            ...x,
            publication: x.publication ?? "published",
            verifiedPurchase:
              x.verifiedPurchase ??
              (x.authorRole === "seller" ||
                (x.components ?? []).some((c) => c.productId && ents.some((e) => e.productId === c.productId))),
          }));
        }
        if (fromVersion < 3) {
          // New seed entitlements (e.g. the pocket bundle) must reach clients
          // whose persisted library predates them — merge missing by id.
          const old = Array.isArray(st.entitlements) ? (st.entitlements as Entitlement[]) : [];
          const have = new Set(old.map((e) => e?.id));
          st.entitlements = [...seedEntitlements.filter((e) => !have.has(e.id)), ...old];
        }
        return st;
      },
    }
  )
);
