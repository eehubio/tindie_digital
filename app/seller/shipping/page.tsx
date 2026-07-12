"use client";

import { useApp } from "@/lib/store";
import { SectionTitle } from "@/components/ui";
import ShippingProfileEditor from "@/components/ShippingProfileEditor";

export default function SellerShippingPage() {
  const { shipProfile, setShipProfile, showToast } = useApp();

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

      <ShippingProfileEditor profile={shipProfile} onChange={setShipProfile} goodsValue={19.99} />
    </div>
  );
}
