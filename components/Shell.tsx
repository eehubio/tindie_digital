"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useApp } from "@/lib/store";
import { Role } from "@/lib/types";
import { Toast } from "./ui";

const ROLE_HOME: Record<Role, { href: string; nav: { href: string; label: string }[] }> = {
  buyer: {
    href: "/",
    nav: [
      { href: "/", label: "Marketplace" },
      { href: "/search", label: "Browse" },
      { href: "/library", label: "My Library" },
      { href: "/campaign/pocket-logic-analyzer", label: "Preorders" },
      { href: "/orders", label: "Mfg Orders" },
    ],
  },
  seller: {
    href: "/seller",
    nav: [
      { href: "/seller", label: "Dashboard" },
      { href: "/seller/new", label: "New Listing" },
      { href: "/seller/orders-action", label: "Orders" },
      { href: "/seller/messages", label: "Messages" },
      { href: "/seller/build", label: "Preorder" },
      { href: "/seller/shipping", label: "Shipping" },
      { href: "/seller/fulfillment", label: "Fulfillment" },
      { href: "/seller/payouts", label: "Payouts" },
    ],
  },
  partner: {
    href: "/partner",
    nav: [
      { href: "/partner", label: "Dashboard" },
      { href: "/partner/requests", label: "Requests" },
      { href: "/partner/orders", label: "Orders" },
    ],
  },
  admin: {
    href: "/admin",
    nav: [
      { href: "/admin", label: "Overview" },
      { href: "/admin/sellers", label: "Sellers" },
      { href: "/admin/reviews", label: "Product Review" },
      { href: "/admin/partners", label: "Partners" },
      { href: "/admin/disputes", label: "Disputes" },
      { href: "/admin/ip", label: "IP Complaints" },
      { href: "/admin/payments", label: "Payments" },
      { href: "/admin/logistics", label: "Logistics" },
    ],
  },
};

function useRehydrate() {
  // skipHydration is on to keep SSR markup deterministic; hydrate the demo DB here.
  useEffect(() => {
    useApp.persist.rehydrate();
  }, []);
}

export default function Shell({ children }: { children: React.ReactNode }) {
  useRehydrate();
  const { role, setRole, cart } = useApp();
  const pathname = usePathname();
  const nav = ROLE_HOME[role].nav;
  const cartCount = cart.reduce((s, c) => s + c.qty, 0);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top brand bar — mirrors Tindie's dark header */}
      <header className="bg-navy text-white">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-6">
          <Link href={ROLE_HOME[role].href} className="flex items-center gap-2 font-bold text-lg">
            <span className="text-teal">tindie</span>
            <span className="text-white/40 text-sm font-normal">/ design</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1 text-sm">
            {nav.map((n) => {
              const active = pathname === n.href || (n.href !== "/" && pathname.startsWith(n.href));
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`px-3 py-1.5 rounded-md transition ${
                    active ? "bg-white/15 text-white" : "text-white/70 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            {role === "buyer" && (
              <Link href="/cart" className="relative text-white/80 hover:text-white" aria-label="Cart">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
                </svg>
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-cta text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Role switcher — the demo control */}
      <div className="bg-teal-light border-b border-teal/20">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center gap-3 text-sm">
          <span className="text-teal-dark font-semibold">View as:</span>
          <div className="flex rounded-md overflow-hidden border border-teal/30">
            {(["buyer", "seller", "partner", "admin"] as Role[]).map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`px-3 py-1 capitalize transition ${
                  role === r ? "bg-teal text-white" : "bg-white text-teal-dark hover:bg-teal-light"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <span className="text-teal-dark/70 hidden sm:inline">
            Prototype — mock data, no real payments or file parsing.
          </span>
        </div>
      </div>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">{children}</main>

      <footer className="border-t border-line py-6 text-center text-xs text-muted">
        Tindie Design &amp; Manufacturing Marketplace — extension-layer prototype. Built to sit alongside the existing
        Django platform via OAuth / signed JWT.
      </footer>

      <Toast />
    </div>
  );
}
