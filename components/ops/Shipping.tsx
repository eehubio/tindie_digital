"use client";

import { useState } from "react";

import { useApp } from "@/lib/store";
import { SectionTitle } from "@/components/ui";
import ShippingProfileEditor from "@/components/ShippingProfileEditor";

export default function SellerShippingPage() {
  const { shipProfiles, updateShipProfile, addShipProfile, showToast } = useApp();
  const [activeId, setActiveId] = useState(shipProfiles[0]?.id);
  const active = shipProfiles.find((sp) => sp.id === activeId) ?? shipProfiles[0];
  const products = useApp((st) => st.allProducts)();

  return (
    <div>
      <SectionTitle
        right={
          <button className="t-btn-primary" onClick={() => showToast("Shipping profile saved — applied to all listings")}>
            Save profile
          </button>
        }
      >
        Shipping &amp; Customs Profile
      </SectionTitle>

      <p className="text-sm text-muted mb-5 max-w-3xl">
        Configure this once. The same profile drives the rates in the net-income calculator, the quote a buyer sees at
        checkout, and the label bought at fulfillment — so the number the seller planned against is the number they
        actually pay. Physical goods, converted designs and manufactured boards all use it.
      </p>

      {/* Profile switcher — a 42 g module and a 620 g kit cannot share one weight */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        {shipProfiles.map((sp) => (
          <button
            key={sp.id}
            onClick={() => setActiveId(sp.id)}
            className={`px-3 py-1.5 rounded-lg border text-sm transition ${
              sp.id === active.id ? "border-teal bg-teal-light/50 text-teal-dark font-semibold" : "border-line text-slate hover:border-teal/50"
            }`}
          >
            {sp.name} <span className="text-xs text-muted">· {sp.weightG} g</span>
          </button>
        ))}
        <button
          className="t-btn-ghost"
          onClick={() =>
            addShipProfile({
              ...active,
              id: "sp_" + Math.random().toString(36).slice(2, 7),
              name: "New profile (copy of " + active.name + ")",
            })
          }
        >
          + New profile
        </button>
      </div>

      <div className="rounded-md bg-panel border border-line px-3 py-2 text-xs text-slate mb-4">
        Listings using <strong className="text-navy">{active.name}</strong>:{" "}
        {products.filter((p) => p.shipProfileId === active.id).map((p) => p.title).join(" · ") || "none yet"} — assign a
        profile per listing in <span className="text-link">Manage listing</span>. One profile object feeds the wizard,
        the net-income calculator, buyer checkout and the label purchase, so they can never quote different numbers.
      </div>

      <ShippingProfileEditor profile={active} onChange={(p) => updateShipProfile(active.id, p)} goodsValue={19.99} />
    </div>
  );
}
