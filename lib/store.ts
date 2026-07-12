"use client";

import { create } from "zustand";
import { CartItem, Role, QuoteRequest, ManufacturingOrder, Entitlement, Dispute } from "./types";
import { seedQuotes, seedOrders, seedEntitlements, seedDisputes, seedFulfillments } from "./mock";
import { ShipProfile, defaultShipProfile, Fulfillment } from "./shipping";

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
  recordDownload: (id: string) => void;

  disputes: Dispute[];
  addDispute: (d: Dispute) => void;

  // Shipping profile — one config shared by the wizard, the calculator,
  // buyer checkout and fulfillment. Changing it here changes all four.
  shipProfile: ShipProfile;
  setShipProfile: (p: ShipProfile) => void;

  fulfillments: Fulfillment[];
  updateFulfillment: (id: string, patch: Partial<Fulfillment>) => void;

  destination: string;
  setDestination: (d: string) => void;

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

export const useApp = create<AppState>((set) => ({
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
  recordDownload: (id) =>
    set((s) => ({
      entitlements: s.entitlements.map((e) =>
        e.id === id ? { ...e, downloadCount: Math.min(e.downloadCount + 1, e.downloadLimit) } : e
      ),
      toast: "Download started — license bundle included",
    })),

  disputes: seedDisputes,
  addDispute: (d) => set((s) => ({ disputes: [d, ...s.disputes], toast: "Dispute opened" })),

  shipProfile: defaultShipProfile,
  setShipProfile: (p) => set({ shipProfile: p }),

  fulfillments: seedFulfillments,
  updateFulfillment: (id, patch) =>
    set((s) => ({ fulfillments: s.fulfillments.map((f) => (f.id === id ? { ...f, ...patch } : f)) })),

  destination: "DE",
  setDestination: (d) => set({ destination: d }),

  toast: null,
  showToast: (msg) => set({ toast: msg }),
}));
