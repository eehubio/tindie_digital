"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getProduct } from "@/lib/mock";
import Link from "next/link";
import { cheapestQuote, DEST_COUNTRIES } from "@/lib/shipping";
import { useApp } from "@/lib/store";
import { VerifyBadge, Stars, Money } from "@/components/ui";
import Preview from "@/components/Preview";
import MakeIt from "@/components/MakeIt";

// Tabs depend on what is being sold. A shipped product needs Shipping & Delivery;
// a design file needs Files/BOM/Licenses; a bundle needs both. Q&A on everything —
// a listing stays alive after publish.
const TAB_SETS: Record<string, string[]> = {
  digital: ["Overview", "Design Preview", "Files & Versions", "BOM", "Licenses", "Make It", "Q&A", "Reviews"],
  physical: ["Overview", "Shipping & Delivery", "Q&A", "Reviews"],
  bundle: ["Overview", "Shipping & Delivery", "Design Preview", "Files & Versions", "BOM", "Licenses", "Make It", "Q&A", "Reviews"],
};
type Tab = string;

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const allProducts = useApp((st) => st.allProducts)();
  const p = allProducts.find((x) => x.slug === slug) ?? getProduct(slug);
  const { addToCart, role } = useApp();
  const versionNotes = useApp((st) => st.versionNotes).filter((n) => n.productId === p?.id);
  const [qty, setQty] = useState(1);
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
          <span className={`t-tag ${p.productType === "physical" ? "bg-teal text-white" : p.productType === "bundle" ? "bg-indigo-600 text-white" : "bg-navy text-white"}`}>
            {p.preorderCampaignSlug ? "Preorder" : p.productType === "physical" ? "Physical Product" : p.productType === "bundle" ? "Kit + Files Bundle" : "Digital Design"}
          </span>
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
          <div className="flex gap-1 border-b border-line overflow-x-auto no-scrollbar">
            {TAB_SETS[p.productType].map((t) => {
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
            {tab === "Shipping & Delivery" && <ShippingTab p={p} />}
            {tab === "Q&A" && <QATab p={p} />}
            {tab === "Reviews" && (
              <div className="t-card p-6 text-muted text-sm">
                {p.reviewCount} reviews · {p.rating.toFixed(1)} average. Review content omitted in prototype.
              </div>
            )}
          </div>
        </div>

        {/* Right: license buy box */}
        <aside className="lg:sticky lg:top-4 space-y-4">
          {p.productType !== "digital" && (
            <div className="border border-line rounded-lg p-4 bg-white shadow-card">
              {p.preorderCampaignSlug ? (
                <>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold text-navy">${p.price?.toFixed(2)}</span>
                    <span className="t-tag bg-tag text-white">Preorder — Batch 2</span>
                  </div>
                  <div className="mt-3 rounded-md bg-panel p-3 text-sm text-slate">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-navy">37 / 50 units committed</span>
                      <span className="text-muted">74%</span>
                    </div>
                    <div className="h-2 rounded-full bg-line overflow-hidden">
                      <div className="h-full bg-tag" style={{ width: "74%" }} />
                    </div>
                    <p className="text-xs text-muted mt-2">
                      Your card is authorised now and charged only when the batch reaches its goal. Batch builds → ships ~4 weeks after goal.
                    </p>
                  </div>
                  <Link href={`/campaign/${p.preorderCampaignSlug}`} className="t-btn-cta w-full text-center block mt-3">
                    Join the preorder
                  </Link>
                </>
              ) : (
                <>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold text-navy">${p.price?.toFixed(2)}</span>
                    <span className={`t-tag ${(p.stock ?? 0) > 20 ? "bg-teal-light text-teal-dark" : (p.stock ?? 0) > 0 ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-700"}`}>
                      {(p.stock ?? 0) > 0 ? `${p.stock} in stock` : "Out of stock"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <label className="text-sm text-muted">Qty</label>
                    <input
                      type="number" min={1} max={p.stock ?? 1} value={qty}
                      onChange={(e) => setQty(Math.min(Number(e.target.value), p.stock ?? 1))}
                      className="t-input !w-20"
                    />
                    <button
                      className="t-btn-cta flex-1 disabled:opacity-40"
                      disabled={(p.stock ?? 0) === 0}
                      onClick={() =>
                        addToCart({
                          key: `${p.id}:physical`,
                          productId: p.id,
                          productTitle: p.title,
                          productType: "physical",
                          fulfillmentType: "shipping",
                          sellerName: p.sellerName,
                          unitPrice: p.price ?? 0,
                          qty,
                        })
                      }
                    >
                      Add to cart
                    </button>
                  </div>
                  <dl className="mt-3 pt-3 border-t border-line text-xs text-muted space-y-1">
                    <div className="flex justify-between"><dt>Ships from</dt><dd className="text-slate">{p.sellerCountry}</dd></div>
                    <div className="flex justify-between"><dt>Handling time</dt><dd className="text-slate">{p.handlingDays}</dd></div>
                    <div className="flex justify-between"><dt>Weight</dt><dd className="text-slate">{p.weightG} g</dd></div>
                    {p.dimensionsMm && <div className="flex justify-between"><dt>Dimensions</dt><dd className="text-slate">{p.dimensionsMm} mm</dd></div>}
                  </dl>
                  <p className="text-[11px] text-muted mt-2">
                    Exact shipping is computed at checkout from the seller&apos;s shipping profile — see the Shipping &amp; Delivery tab.
                  </p>
                </>
              )}
            </div>
          )}
          {p.licenses.length > 0 && (
          <div className="border border-line rounded-lg p-4 bg-white shadow-card">
            <h3 className="font-semibold text-navy mb-3">{p.productType === "bundle" ? "Included licence" : "Choose your license"}</h3>
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
          )}

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
  const notes = useApp((st) => st.versionNotes).filter((n) => n.productId === p?.id);
  if (!p) return null;
  return (
    <div className="prose-sm max-w-none space-y-4">

      {notes.length > 0 && (
        <div className="rounded-lg border border-teal/30 bg-teal-light/30 p-4">
          <h3 className="font-semibold text-navy text-sm mb-2">Seller updates &amp; version notes</h3>
          <div className="space-y-2">
            {notes.map((n) => (
              <div key={n.id} className="text-sm">
                <span className="t-tag bg-white border border-line text-slate mr-2">v{n.semver}</span>
                <span className="text-slate">{n.note}</span>
                <span className="text-xs text-muted ml-2">{n.postedAt}</span>
              </div>
            ))}
          </div>
        </div>
      )}      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
            <th className="text-right px-3 py-2">Part ID confidence</th>
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
        <strong className="text-navy">Part ID confidence</strong> = how certain the parser is that this row maps to the
        exact orderable part number (MPN) shown — extracted from the KiCad fields and checked against distributor
        catalogs. 100% means you can paste this BOM straight into an order; amber rows were ambiguous during parsing and
        were confirmed by the seller.
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


// ---------------------------------------------------------------------------
// Shipping & Delivery — the buyer sees exactly what the seller configured:
// stock, handling time, weight, per-zone rates, customs treatment.
// ---------------------------------------------------------------------------
function ShippingTab({ p }: { p: NonNullable<ReturnType<typeof getProduct>> }) {
  const { shipProfiles, destination, setDestination } = useApp();
  const profile = shipProfiles.find((sp) => sp.id === p.shipProfileId) ?? shipProfiles[0];
  const quote = cheapestQuote(destination, { ...profile, weightG: p.weightG ?? profile.weightG });
  const dest = DEST_COUNTRIES[destination];

  return (
    <div className="space-y-4">
      <div className="t-card p-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-semibold text-navy">Stock &amp; handling</h3>
          <span className="text-xs text-muted">set by the seller in their back office — shown live here</span>
        </div>
        <dl className="grid sm:grid-cols-4 gap-3 mt-3 text-sm">
          <div className="rounded-md bg-panel p-3">
            <dt className="text-xs text-muted uppercase">In stock</dt>
            <dd className="font-bold text-navy text-lg">{p.preorderCampaignSlug ? "Preorder" : p.stock ?? "—"}</dd>
          </div>
          <div className="rounded-md bg-panel p-3">
            <dt className="text-xs text-muted uppercase">Handling</dt>
            <dd className="font-bold text-navy text-lg">{p.handlingDays ?? profile.handlingDays}</dd>
          </div>
          <div className="rounded-md bg-panel p-3">
            <dt className="text-xs text-muted uppercase">Weight</dt>
            <dd className="font-bold text-navy text-lg">{p.weightG ?? profile.weightG} g</dd>
          </div>
          <div className="rounded-md bg-panel p-3">
            <dt className="text-xs text-muted uppercase">Ships from</dt>
            <dd className="font-bold text-navy text-lg">{profile.originLabel}</dd>
          </div>
        </dl>
      </div>

      <div className="t-card p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <h3 className="font-semibold text-navy">Estimate shipping</h3>
          <select className="t-input !w-auto" value={destination} onChange={(e) => setDestination(e.target.value)}>
            {Object.entries(DEST_COUNTRIES).map(([code, d]) => (
              <option key={code} value={code}>{d.flag} {d.label}</option>
            ))}
          </select>
        </div>
        {quote ? (
          <div className="mt-3 rounded-md bg-teal-light/40 border border-teal/30 p-3 text-sm text-slate">
            To {dest?.label}: <strong className="text-navy">${quote.cost.toFixed(2)}</strong> · {quote.method.name} · {quote.method.eta}. Profile: <span className="font-mono text-xs">{profile.name}</span>
            {profile.combined && " · combined shipping on multi-item orders"}
          </div>
        ) : (
          <div className="mt-3 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            The seller does not ship to this destination.
          </div>
        )}
        {dest && <p className="text-xs text-muted mt-2">{dest.note}</p>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Q&A — the listing stays alive after publish. Buyers ask; the seller answers
// from their Messages console; answers publish here for everyone.
// ---------------------------------------------------------------------------
function QATab({ p }: { p: NonNullable<ReturnType<typeof getProduct>> }) {
  const { questions, askQuestion } = useApp();
  const [text, setText] = useState("");
  const mine = questions.filter((q) => q.productId === p.id);

  return (
    <div className="space-y-4">
      <div className="t-card p-4">
        <h3 className="font-semibold text-navy mb-2">Ask the seller</h3>
        <textarea
          className="t-input min-h-[70px]"
          placeholder="e.g. Does this work with a 3.3 V supply? What connector does it use?"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-muted">Typical response: {p.supportResponse}</span>
          <button
            className="t-btn-primary disabled:opacity-40"
            disabled={!text.trim()}
            onClick={() => {
              askQuestion(p.id, text.trim());
              setText("");
            }}
          >
            Send question
          </button>
        </div>
      </div>

      {mine.length === 0 ? (
        <div className="t-card p-6 text-center text-muted text-sm">No questions yet — be the first.</div>
      ) : (
        mine.map((q) => (
          <div key={q.id} className="t-card p-4">
            <div className="text-sm text-slate">
              <span className="font-semibold text-navy">{q.askedBy}</span>{" "}
              <span className="text-xs text-muted">· {q.askedAt}</span>
            </div>
            <p className="text-sm text-slate mt-1">{q.question}</p>
            {q.answer ? (
              <div className="mt-3 ml-4 pl-3 border-l-2 border-teal">
                <div className="text-xs text-teal-dark font-semibold">{p.sellerName} (seller) · {q.answeredAt}</div>
                <p className="text-sm text-slate mt-0.5">{q.answer}</p>
              </div>
            ) : (
              <div className="mt-2 ml-4 text-xs text-muted italic">Awaiting the seller&apos;s answer…</div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
