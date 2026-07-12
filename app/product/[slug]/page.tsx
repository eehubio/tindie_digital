"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getProduct } from "@/lib/mock";
import { useApp } from "@/lib/store";
import { VerifyBadge, Stars, Money } from "@/components/ui";
import Preview from "@/components/Preview";
import MakeIt from "@/components/MakeIt";

const TABS = ["Overview", "Design Preview", "Files & Versions", "BOM", "Licenses", "Make It", "Reviews"] as const;
type Tab = (typeof TABS)[number];

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const p = getProduct(slug);
  const { addToCart, role } = useApp();
  const [tab, setTab] = useState<Tab>("Overview");
  const [selLicense, setSelLicense] = useState(p?.licenses[0]?.id ?? "");

  if (!p) {
    return (
      <div className="t-card p-10 text-center">
        <p className="text-muted">That design doesn&apos;t exist.</p>
        <button className="t-btn-ghost mt-4" onClick={() => router.push("/search")}>Back to browse</button>
      </div>
    );
  }

  const license = p.licenses.find((l) => l.id === selLicense) ?? p.licenses[0];

  function addLicense() {
    if (!license) return;
    addToCart({
      key: `${p!.id}:${license.id}`,
      productId: p!.id,
      productTitle: p!.title,
      productType: p!.category === "reference_design" ? "service" : "digital",
      fulfillmentType: p!.category === "reference_design" ? "manual_delivery" : "download",
      licenseId: license.id,
      licenseName: license.name,
      sellerName: p!.sellerName,
      unitPrice: license.price,
      qty: 1,
    });
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span className="t-tag bg-navy text-white">Digital Design</span>
          <VerifyBadge level={p.verifyLevel} version={p.verifiedVersion} />
          <span className="text-xs text-muted font-mono">{p.kicadVersion}</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-navy">{p.title}</h1>
        <p className="text-muted mt-1">{p.tagline}</p>
        <div className="flex items-center gap-4 mt-2 text-sm text-muted flex-wrap">
          <span>Designed by <span className="text-link font-semibold">{p.sellerName}</span> in {p.sellerCountry}</span>
          <Stars rating={p.rating} count={p.reviewCount} />
          {p.timesManufactured > 0 && <span>Manufactured successfully {p.timesManufactured}×</span>}
          <span>Updated {p.updatedAt}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
        {/* Left: tabs */}
        <div>
          <div className="flex gap-1 border-b border-line overflow-x-auto">
            {TABS.map((t) => {
              if (t === "Make It" && !p.makeEnabled) return null;
              if (t === "BOM" && p.bom.length === 0) return null;
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-3 py-2 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition ${
                    tab === t ? "border-teal text-teal-dark" : "border-transparent text-muted hover:text-slate"
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>

          <div className="py-5">
            {tab === "Overview" && <Overview p={p} />}
            {tab === "Design Preview" && <Preview p={p} />}
            {tab === "Files & Versions" && <Files p={p} />}
            {tab === "BOM" && <Bom p={p} />}
            {tab === "Licenses" && <LicenseMatrix p={p} />}
            {tab === "Make It" && <MakeIt p={p} />}
            {tab === "Reviews" && (
              <div className="t-card p-6 text-muted text-sm">
                {p.reviewCount} reviews · {p.rating.toFixed(1)} average. Review content omitted in prototype.
              </div>
            )}
          </div>
        </div>

        {/* Right: license buy box */}
        <aside className="lg:sticky lg:top-4 space-y-4">
          <div className="border border-line rounded-lg p-4 bg-white shadow-card">
            <h3 className="font-semibold text-navy mb-3">Choose your license</h3>
            <div className="space-y-2">
              {p.licenses.map((l) => (
                <label
                  key={l.id}
                  className={`block border rounded-lg p-3 cursor-pointer transition ${
                    selLicense === l.id ? "border-teal bg-teal-light/40" : "border-line hover:border-teal/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="license"
                        checked={selLicense === l.id}
                        onChange={() => setSelLicense(l.id)}
                        className="accent-teal"
                      />
                      <span className="font-semibold text-navy text-sm">{l.name}</span>
                    </div>
                    <span className="font-bold text-teal-dark"><Money v={l.price} /></span>
                  </div>
                  <p className="text-xs text-muted mt-1 ml-6">{l.blurb}</p>
                </label>
              ))}
            </div>

            <button className="t-btn-cta w-full mt-4" onClick={addLicense}>
              Add license to cart
            </button>
            <p className="t-hint text-center mt-2">
              Files download instantly after checkout. License bundle included.
            </p>
          </div>

          {p.makeEnabled && (
            <div className="border border-line rounded-lg p-4 bg-white">
              <h3 className="font-semibold text-navy text-sm">Want a physical board?</h3>
              <p className="text-xs text-muted mt-1">
                Skip logistics — a regional partner fabricates and ships it to you.
              </p>
              <button className="t-btn-ghost w-full mt-3" onClick={() => setTab("Make It")}>
                See manufacturing options
              </button>
            </div>
          )}

          {(role === "seller" || role === "buyer") && p.makeEnabled && (
            <div className="border border-dashed border-line rounded-lg p-4 bg-panel">
              <h3 className="font-semibold text-navy text-sm">Sell the finished product</h3>
              <ol className="text-xs text-muted mt-2 space-y-1 list-decimal list-inside">
                <li>Pick a manufacturing partner</li>
                <li>Produce a prototype or small batch</li>
                <li>Create a physical Tindie listing</li>
                <li>Link it to this digital design</li>
              </ol>
              <button className="t-btn-ghost w-full mt-3" onClick={() => router.push("/seller/convert")}>
                Create physical product
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Overview({ p }: { p: ReturnType<typeof getProduct> }) {
  if (!p) return null;
  return (
    <div className="prose-sm max-w-none space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          ["Downloads", String(p.downloads)],
          ["Made", `${p.timesManufactured}×`],
          ["Support", p.supportResponse],
          ["Files", `${p.files.length}`],
        ].map(([k, v]) => (
          <div key={k} className="t-card px-3 py-2">
            <div className="text-[11px] text-muted uppercase">{k}</div>
            <div className="font-semibold text-navy">{v}</div>
          </div>
        ))}
      </div>
      <div className="t-card p-4">
        <h3 className="font-semibold text-navy mb-2">What is it?</h3>
        <p className="text-sm text-slate">{p.tagline} Built and verified in {p.kicadVersion}, this design ships as a
          complete project you can open, modify, and manufacture.</p>
        {p.verifyLevel === 3 && (
          <div className="mt-3 flex items-center gap-2 text-sm bg-emerald-50 text-emerald-800 rounded-md p-3">
            <VerifyBadge level={3} version={p.verifiedVersion} />
            Reviewed by {p.reviewPartner} · verified version {p.verifiedVersion}
          </div>
        )}
      </div>
    </div>
  );
}

function Files({ p }: { p: ReturnType<typeof getProduct> }) {
  if (!p) return null;
  if (p.files.length === 0)
    return <div className="t-card p-6 text-muted text-sm">This is a service listing — no downloadable files.</div>;
  return (
    <div className="t-card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-panel text-muted text-xs uppercase">
          <tr>
            <th className="text-left px-4 py-2">File</th>
            <th className="text-left px-4 py-2">Type</th>
            <th className="text-right px-4 py-2">Size</th>
            <th className="text-left px-4 py-2 hidden sm:table-cell">SHA-256</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {p.files.map((f) => (
            <tr key={f.path}>
              <td className="px-4 py-2 font-mono text-slate">{f.path}</td>
              <td className="px-4 py-2 text-muted">{f.type}</td>
              <td className="px-4 py-2 text-right text-muted">{(f.sizeKb / 1024).toFixed(1)} MB</td>
              <td className="px-4 py-2 font-mono text-xs text-muted hidden sm:table-cell">{f.sha256}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-muted p-3 border-t border-line">
        File hashes are recorded at publish time and included in every download&apos;s manifest for dispute evidence.
      </p>
    </div>
  );
}

function Bom({ p }: { p: ReturnType<typeof getProduct> }) {
  if (!p) return null;
  return (
    <div className="t-card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-panel text-muted text-xs uppercase">
          <tr>
            <th className="text-left px-3 py-2">Ref</th>
            <th className="text-left px-3 py-2">MPN</th>
            <th className="text-left px-3 py-2 hidden sm:table-cell">Value</th>
            <th className="text-left px-3 py-2 hidden md:table-cell">Package</th>
            <th className="text-right px-3 py-2">Qty</th>
            <th className="text-right px-3 py-2">Match</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {p.bom.map((b) => (
            <tr key={b.refdes} className={b.needsReview ? "bg-amber-50" : ""}>
              <td className="px-3 py-2 font-mono">{b.refdes}</td>
              <td className="px-3 py-2 font-mono text-slate">{b.mpn}</td>
              <td className="px-3 py-2 text-muted hidden sm:table-cell">{b.value}</td>
              <td className="px-3 py-2 text-muted hidden md:table-cell">{b.package}</td>
              <td className="px-3 py-2 text-right">{b.qty}</td>
              <td className="px-3 py-2 text-right">
                <span className={b.confidence < 0.85 ? "text-amber-600 font-semibold" : "text-ok"}>
                  {Math.round(b.confidence * 100)}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-muted p-3 border-t border-line">
        Rows highlighted in amber were flagged as low-confidence during parsing and confirmed by the seller.
      </p>
    </div>
  );
}

function LicenseMatrix({ p }: { p: ReturnType<typeof getProduct> }) {
  if (!p) return null;
  const rows = [
    ["Study and modify", [true, true, true]],
    ["Build for personal use", [true, true, true]],
    ["Sell physical products", ["✕", "Limited", "✓"]],
    ["Resell source files", [false, false, false]],
    ["Publish the project", [false, false, false]],
  ] as const;
  return (
    <div className="t-card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-panel text-xs uppercase text-muted">
          <tr>
            <th className="text-left px-4 py-2">Right</th>
            <th className="px-4 py-2">Personal</th>
            <th className="px-4 py-2">Commercial</th>
            <th className="px-4 py-2">Unlimited</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map(([label, vals]) => (
            <tr key={label}>
              <td className="px-4 py-2 text-slate">{label}</td>
              {vals.map((v, i) => (
                <td key={i} className="px-4 py-2 text-center">
                  {v === true ? <span className="text-ok">✓</span> : v === false ? <span className="text-danger">✕</span> : <span className="text-slate">{v}</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
