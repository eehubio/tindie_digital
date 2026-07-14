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
        entitlements: s.entitlements,
        fulfillments: s.fulfillments,
        cart: s.cart,
      }),
      // Avoid SSR hydration mismatch: rehydrate manually after mount (Shell does it).
      skipHydration: true,
    }
  )
);
