"use client";

import { useMemo, useState } from "react";
import { DigitalProduct, PartnerType } from "@/lib/types";
import { partners } from "@/lib/mock";
import { scorePartners } from "@/lib/engine";
import { useApp } from "@/lib/store";
import { PartnerLogo, Stars } from "./ui";

const SERVICE_OPTIONS: { key: PartnerType; label: string }[] = [
  { key: "pcb_manufacturer", label: "PCB fabrication" },
  { key: "pcb_assembly", label: "PCB assembly (SMT)" },
  { key: "component_sourcing", label: "Component sourcing" },
  { key: "design_review", label: "Design review" },
];

const COUNTRIES = ["US", "CN", "DE", "GB", "CA", "IT", "JP", "AU"];

export default function MakeIt({ p }: { p: DigitalProduct }) {
  const { addQuote, showToast } = useApp();
  const [services, setServices] = useState<PartnerType[]>(["pcb_manufacturer", "pcb_assembly"]);
  const [country, setCountry] = useState("US");
  const [qty, setQty] = useState(20);
  const [openQuote, setOpenQuote] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<string[]>([]);

  const ranked = useMemo(
    () =>
      scorePartners(partners, {
        destinationCountry: country,
        requestedServices: services,
        quantity: qty,
      }),
    [country, services, qty]
  );

  function toggleService(s: PartnerType) {
    setServices((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  function submitQuote(partnerId: string, partnerName: string) {
    addQuote({
      id: "qr_" + Math.random().toString(36).slice(2, 7),
      buyerName: "You (demo)",
      productId: p.id,
      productTitle: p.title,
      requestedServices: services,
      quantity: qty,
      destinationCountry: country,
      partnerId,
      partnerName,
      status: "submitted",
      createdAt: new Date().toISOString().slice(0, 10),
    });
    setSubmitted((s) => [...s, partnerId]);
    setOpenQuote(null);
    showToast(`Quote request sent to ${partnerName}`);
  }

  if (!p.makeEnabled) {
    return (
      <div className="t-card p-6 text-center text-muted">
        This seller hasn&apos;t enabled manufacturing services for this design.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Requirements — feeds the routing engine live */}
      <div className="t-card p-4">
        <h3 className="font-semibold text-navy mb-3">What do you need?</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {SERVICE_OPTIONS.map((s) => (
            <button
              key={s.key}
              onClick={() => toggleService(s.key)}
              className={`px-3 py-1.5 rounded-md text-sm border transition ${
                services.includes(s.key)
                  ? "bg-teal text-white border-teal"
                  : "bg-white text-slate border-line hover:border-teal"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="t-label">Ship to</label>
            <select className="t-input" value={country} onChange={(e) => setCountry(e.target.value)}>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="t-label">Quantity</label>
            <input
              type="number"
              min={1}
              className="t-input"
              value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
            />
          </div>
        </div>
      </div>

      {/* Ranked partners — nothing hardcoded, all from scorePartners() */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-navy">Recommended partners</h3>
          <span className="text-xs text-muted">Ranked by capability, region, price, lead time & quality</span>
        </div>
        {ranked.length === 0 && (
          <div className="t-card p-6 text-center text-muted">
            No active partner covers those services yet. Try removing a service or changing the destination.
          </div>
        )}
        {ranked.map(({ partner, score, reasons }, i) => (
          <div key={partner.id} className="t-card p-4 bg-white">
            <div className="flex items-start gap-3">
              <PartnerLogo token={partner.logoToken} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-semibold text-navy">{partner.name}</h4>
                  {i === 0 && <span className="t-tag bg-teal-light text-teal-dark">Best match</span>}
                  {partner.status === "draft" && (
                    <span className="t-tag bg-amber-100 text-amber-700">Onboarding</span>
                  )}
                  <span className="ml-auto text-xs font-mono text-muted">match {Math.round(score * 100)}%</span>
                </div>
                <p className="text-sm text-muted mt-1">{partner.description}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate">
                  <span>🌍 {partner.serviceCountries.includes("GLOBAL") ? "Global" : partner.serviceCountries.join(", ")}</span>
                  <span>⏱ {partner.minLeadDays}–{partner.maxLeadDays} days</span>
                  <span>🗣 {partner.languages.join(" / ")}</span>
                  {partner.fromPricePcb && <span>PCB from ${partner.fromPricePcb}</span>}
                  {partner.fromPriceAssembly && <span>Assembly from ${partner.fromPriceAssembly}</span>}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {reasons.map((r) => (
                    <span key={r} className="t-tag bg-panel text-muted">{r}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-3">
                  <Stars rating={partner.rating} count={partner.completedOrders} />
                  {submitted.includes(partner.id) ? (
                    <span className="text-sm font-semibold text-ok">✓ Quote requested</span>
                  ) : (
                    <button className="t-btn-primary" onClick={() => setOpenQuote(partner.id)}>
                      Get quote
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quote confirm modal */}
      {openQuote && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setOpenQuote(null)}>
          <div className="bg-white rounded-xl max-w-md w-full p-5" onClick={(e) => e.stopPropagation()}>
            {(() => {
              const partner = partners.find((x) => x.id === openQuote)!;
              return (
                <>
                  <h3 className="text-lg font-bold text-navy">Request a quote</h3>
                  <p className="text-sm text-muted mt-1">
                    We&apos;ll share the manufacturing files you approve with {partner.name} through a secure,
                    expiring link. Nothing is charged now.
                  </p>
                  <div className="t-card p-3 mt-4 text-sm space-y-1">
                    <Row k="Design" v={p.title} />
                    <Row k="Services" v={services.join(", ") || "—"} />
                    <Row k="Quantity" v={String(qty)} />
                    <Row k="Ship to" v={country} />
                    <Row k="File access" v={p.allowFullFileToPartner ? "Full project" : "Manufacturing files only"} />
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button className="t-btn-primary flex-1" onClick={() => submitQuote(partner.id, partner.name)}>
                      Send request
                    </button>
                    <button className="t-btn-ghost" onClick={() => setOpenQuote(null)}>Cancel</button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted">{k}</span>
      <span className="text-slate font-medium text-right">{v}</span>
    </div>
  );
}
