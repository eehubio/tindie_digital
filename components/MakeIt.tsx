"use client";

import { useMemo, useState } from "react";
import { DigitalProduct, PartnerType } from "@/lib/types";

import { routeForBuyer, FAILURE_LABEL, RoutingInput } from "@/lib/engine";
import { checkManufacturingRights } from "@/lib/entitlements";
import { useApp } from "@/lib/store";
import { PartnerLogo, Stars } from "./ui";

const SERVICE_OPTIONS: { key: PartnerType; label: string }[] = [
  { key: "design_review", label: "Design review" },
  { key: "component_sourcing", label: "Component sourcing" },
  { key: "pcb_manufacturer", label: "PCB fabrication" },
  { key: "pcb_assembly", label: "PCB assembly (SMT)" },
  { key: "testing_service", label: "Functional test" },
  { key: "fulfillment", label: "Warehousing & fulfillment" },
];

const SERVICE_LABEL: Record<string, string> = Object.fromEntries(
  SERVICE_OPTIONS.map((s) => [s.key, s.label])
);

const COUNTRIES = ["US", "CN", "DE", "GB", "CA", "IT", "JP", "AU"];

const SCOPE_LABEL: Record<string, string> = {
  full_sources: "Editable sources",
  fabrication_outputs: "Gerber / drill / CPL only",
  documents_only: "BOM & documents only",
};

export default function MakeIt({ p }: { p: DigitalProduct }) {
  const { addQuote, showToast, entitlements, partnerList: partners } = useApp();
  const [services, setServices] = useState<PartnerType[]>(["pcb_manufacturer", "pcb_assembly"]);
  const [country, setCountry] = useState("US");
  const [qty, setQty] = useState(20);
  const [commercial, setCommercial] = useState(false);
  const [layers, setLayers] = useState(4);
  const [openQuote, setOpenQuote] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<string[]>([]);
  const [showRejected, setShowRejected] = useState(false);

  // ---- Licence gate. Manufacturing is a RIGHT, not a checkout option. -------
  const entitlement = entitlements.find((e) => e.productId === p.id && e.status === "active") ?? null;
  const rights = checkManufacturingRights(entitlement, qty, commercial);

  const req: RoutingInput = useMemo(
    () => ({
      destinationCountry: country,
      requestedServices: services,
      quantity: qty,
      layers,
      currency: "USD",
    }),
    [country, services, qty, layers]
  );

  const { ranked, rejected, plan } = useMemo(() => routeForBuyer(partners, req), [req]);

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
        The seller has not enabled manufacturing for this design.
      </div>
    );
  }

  return (
    <div>
      {/* ---------------- Request ---------------- */}
      <div className="t-card p-5">
        <h3 className="font-bold text-navy mb-3">What do you need built?</h3>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-4">
          {SERVICE_OPTIONS.map((s) => {
            const on = services.includes(s.key);
            return (
              <button
                key={s.key}
                onClick={() => toggleService(s.key)}
                className={`text-left border rounded-lg px-3 py-2 text-sm transition ${
                  on ? "border-teal bg-teal-light/50 text-teal-dark font-medium" : "border-line text-slate hover:border-teal/50"
                }`}
              >
                {on ? "✓ " : ""}
                {s.label}
              </button>
            );
          })}
        </div>

        <div className="grid sm:grid-cols-4 gap-3">
          <div>
            <label className="t-label">Quantity</label>
            <input className="t-input" type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value))} />
          </div>
          <div>
            <label className="t-label">Layers</label>
            <select className="t-input" value={layers} onChange={(e) => setLayers(Number(e.target.value))}>
              {[2, 4, 6, 8, 12].map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="t-label">Ship to</label>
            <select className="t-input" value={country} onChange={(e) => setCountry(e.target.value)}>
              {COUNTRIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="t-label">Intended use</label>
            <select
              className="t-input"
              value={commercial ? "c" : "p"}
              onChange={(e) => setCommercial(e.target.value === "c")}
            >
              <option value="p">Personal / prototype</option>
              <option value="c">For sale (commercial)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ---------------- Licence gate ---------------- */}
      <div
        className={`mt-4 rounded-lg border p-4 ${
          rights.allowed ? "border-teal/40 bg-teal-light/40" : "border-amber-300 bg-amber-50"
        }`}
      >
        <div className="flex items-start gap-3">
          <span className="text-lg">{rights.allowed ? "✓" : "⚠"}</span>
          <div className="flex-1">
            <div className={`font-semibold text-sm ${rights.allowed ? "text-teal-dark" : "text-amber-900"}`}>
              {rights.allowed ? "Your licence permits this build" : "Licence upgrade required"}
            </div>
            <p className={`text-sm mt-0.5 ${rights.allowed ? "text-teal-dark/80" : "text-amber-900/90"}`}>
              {rights.allowed
                ? entitlement
                  ? `${entitlement.licenseName} · ${rights.remainingCommercial} commercial units remaining · partner receives ${
                      entitlement.rights.sourceFilesIncluded ? "editable sources" : "fabrication outputs only"
                    }.`
                  : "Personal prototype build."
                : rights.reason}
            </p>
            {!rights.allowed && (
              <button className="t-btn-cta mt-3" onClick={() => showToast("Licence upgrade added to cart (simulated)")}>
                Upgrade licence
              </button>
            )}
          </div>
        </div>
        <p className="text-[11px] text-muted mt-3 leading-relaxed">
          Manufacturing rights live on the licence, not on the checkout. The unit cap is checked here, at the moment of
          ordering a build — and again server-side when the partner requests the files — so a 200-unit commercial run
          cannot be placed against a 100-unit licence.
        </p>
      </div>

      {/* ---------------- Eligible partners ---------------- */}
      <h3 className="font-bold text-navy mt-6 mb-1">
        Eligible partners{" "}
        <span className="text-sm font-normal text-muted">
          — {ranked.length} of {partners.length} can take this job
        </span>
      </h3>
      <p className="text-xs text-muted mb-3">
        Eligibility is a hard gate: a partner that cannot do <em>every</em> service you selected, at your quantity,
        layer count and destination, is not shown at all. Ranking then happens on merit only — price, lead time,
        on-time rate, rating, dispute rate. Commercial relationships do not move a partner up this list.
      </p>

      {ranked.length === 0 ? (
        <div className="t-card p-5 bg-panel/60 text-sm text-slate">
          No single partner covers this whole job. See the service chain below — that is not a failure, it is what a
          global partner network is for.
        </div>
      ) : (
        <div className="space-y-3">
          {ranked.map(({ partner: sp, score, reasons, sponsored }) => (
            <div key={sp.id} className={`t-card p-4 ${sponsored ? "border-tag/50" : ""}`}>
              <div className="flex items-start gap-4">
                <PartnerLogo token={sp.logoToken} size={44} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-navy">{sp.name}</h4>
                    {sponsored && (
                      <span className="t-tag bg-tag text-white" title="Paid placement. Does not affect the ranking score.">
                        Sponsored
                      </span>
                    )}
                    {sp.capacityStatus === "constrained" && (
                      <span className="t-tag bg-amber-100 text-amber-800">capacity constrained</span>
                    )}
                    <span className="ml-auto text-xs text-muted">match {(score * 100).toFixed(0)}</span>
                  </div>
                  <p className="text-sm text-muted mt-0.5">{sp.description}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {reasons.map((r) => (
                      <span key={r} className="t-tag bg-panel text-slate">
                        {r}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted">
                    <Stars rating={sp.rating} />
                    <span>{sp.completedOrders} orders</span>
                    <span>from ${sp.fromPricePcb}</span>
                    <span>
                      {sp.minLeadDays}–{sp.maxLeadDays} days
                    </span>
                  </div>
                </div>
                <button
                  className="t-btn-primary disabled:opacity-40"
                  disabled={!rights.allowed || submitted.includes(sp.id)}
                  onClick={() => setOpenQuote(sp.id)}
                >
                  {submitted.includes(sp.id) ? "Requested" : "Get quote"}
                </button>
              </div>

              {openQuote === sp.id && (
                <div className="mt-4 pt-4 border-t border-line">
                  <p className="text-sm text-slate mb-3">
                    {sp.name} will receive{" "}
                    <strong className="text-navy">
                      {entitlement?.rights.sourceFilesIncluded ? "the editable sources" : "fabrication outputs only"}
                    </strong>{" "}
                    for this order, under confidentiality, for this build and no other purpose.
                  </p>
                  <div className="flex gap-2">
                    <button className="t-btn-cta" onClick={() => submitQuote(sp.id, sp.name)}>
                      Send quote request
                    </button>
                    <button className="t-btn-ghost" onClick={() => setOpenQuote(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ---------------- Service chain ---------------- */}
      {plan.legs.length > 1 && (
        <div className="mt-6">
          <h3 className="font-bold text-navy mb-1">Or route it as a service chain</h3>
          <p className="text-xs text-muted mb-3">
            No one shop does review, sourcing, fabrication, assembly, test and fulfillment well. This plan splits the
            job across partners and hands each leg only the file scope it needs.
          </p>
          <div className="space-y-2">
            {plan.legs.map((leg) => (
              <div key={leg.sequence} className="t-card p-4 flex items-start gap-4">
                <span className="w-7 h-7 rounded-full bg-navy text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {leg.sequence}
                </span>
                <PartnerLogo token={leg.partner.logoToken} size={36} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-navy text-sm">{leg.partner.name}</div>
                  <div className="text-xs text-muted">
                    {leg.serviceTypes.map((s) => SERVICE_LABEL[s] ?? s).join(" · ")}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    <span
                      className={`t-tag ${
                        leg.inputFileScope === "full_sources"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-teal-light text-teal-dark"
                      }`}
                    >
                      receives: {SCOPE_LABEL[leg.inputFileScope]}
                    </span>
                    {leg.outputDeliverables.map((d) => (
                      <span key={d} className="t-tag bg-panel text-slate">
                        → {d}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {!plan.complete && (
            <div className="mt-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900">
              No partner in the network can currently cover:{" "}
              {plan.uncoveredServices.map((s) => SERVICE_LABEL[s] ?? s).join(", ")}. Said plainly rather than quietly
              dropped.
            </div>
          )}
          <button
            className="t-btn-primary mt-3 disabled:opacity-40"
            disabled={!rights.allowed || !plan.complete}
            onClick={() => showToast(`Service plan ${plan.id} submitted to ${plan.legs.length} partners`)}
          >
            Request quotes for the whole chain
          </button>
        </div>
      )}

      {/* ---------------- Rejected, with reasons ---------------- */}
      {rejected.length > 0 && (
        <div className="mt-6">
          <button className="text-sm text-link hover:underline" onClick={() => setShowRejected((v) => !v)}>
            {showRejected ? "Hide" : "Show"} {rejected.length} partner(s) excluded, and why
          </button>
          {showRejected && (
            <div className="mt-2 space-y-2">
              {rejected.map((r) => (
                <div key={r.partner.id} className="t-card p-3 opacity-70">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-navy text-sm">{r.partner.name}</span>
                    {r.failures.map((f) => (
                      <span key={f} className="t-tag bg-red-100 text-red-700">
                        {FAILURE_LABEL[f]}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              <p className="t-hint">
                Exclusions are shown rather than hidden, so a buyer can tell the difference between &ldquo;nobody can do
                this&rdquo; and &ldquo;nobody has been onboarded for this yet&rdquo;.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
