"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { validateDraft } from "@/lib/draft";
import VoiceCapture from "@/components/VoiceCapture";
import AIComposer from "@/components/AIComposer";
import NetIncomeCalculator from "@/components/NetIncomeCalculator";
import ShippingProfileEditor from "@/components/ShippingProfileEditor";
import { seedCampaigns } from "@/lib/campaigns";
import {
  CampaignType,
  CAMPAIGN_TYPE_LABEL,
  CAMPAIGN_TYPE_HELP,
  CAMPAIGN_TYPE_RISK,
  estimateMargin,
} from "@/lib/build";

type PType = "physical" | "digital" | "bundle" | "service" | "manufacturing";

// The wizard is not one linear form — the flow is a function of what is being
// sold. A physical seller must never be walked through license tiers, and a
// digital seller must never be asked for a parcel weight.
const FLOWS: Record<PType, string[]> = {
  physical: ["type", "compose", "pricing", "shipping", "preorder", "publish"],
  // Digital: engineering trust FIRST. A buyer of a KiCad project does not care
  // how well the AI wrote the description — they care whether the files open,
  // whether DRC passes, whether the BOM resolves, and whether anyone has ever
  // actually fabricated the thing. AI assists at the description step; it is
  // not the headline. Upload → Analyze → Fix → Verify → Preview → License → Sell.
  digital: ["type", "upload", "parsing", "components", "verify", "visibility", "licenses", "pricing", "publish"],
  bundle: ["type", "upload", "parsing", "verify", "visibility", "licenses", "compose", "pricing", "shipping", "preorder", "publish"],
  service: ["type", "compose", "pricing", "publish"],
  manufacturing: ["type", "partner", "publish"],
};

const STEP_LABEL: Record<string, string> = {
  type: "Type",
  compose: "Describe (AI-assisted)",
  upload: "Upload",
  parsing: "Analyze",
  components: "Fix BOM",
  verify: "Verify",
  visibility: "Preview & scope",
  licenses: "Licenses",
  pricing: "Pricing",
  shipping: "Shipping",
  preorder: "Preorder",
  publish: "Publish",
};

const PARSE_STEPS = [
  "Project structure detected",
  "KiCad version detected (KiCad 9)",
  "Schematic rendered",
  "PCB rendered",
  "3D preview generated",
  "BOM extracted",
  "47 components matched",
];

export default function NewListingWizard() {
  const router = useRouter();
  const { showToast, draft, publishProduct, resetDraft } = useApp();
  const [ptype, setPtype] = useState<PType>("physical");
  const [step, setStep] = useState(0);

  const flow = FLOWS[ptype];
  const id = flow[Math.min(step, flow.length - 1)];
  const next = () => setStep((x) => Math.min(x + 1, flow.length - 1));

  const goodsKind: "digital" | "physical" | "manufacturing" =
    ptype === "digital" ? "digital" : ptype === "manufacturing" ? "manufacturing" : "physical";

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-xl font-bold text-navy mb-1">Create a listing</h1>
      <p className="text-muted text-sm mb-5">
        This wizard sits on top of the existing product-create form — the same seller, store and Stripe Connect account
        you already have. The steps you get depend on what you are selling.
      </p>

      <DraftBar />

      {/* Stepper */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
        {flow.map((sid, i) => (
          <div key={sid} className="flex items-center shrink-0">
            <button
              onClick={() => i <= step && setStep(i)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${
                i === step ? "bg-teal text-white" : i < step ? "text-teal-dark" : "text-muted"
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center ${
                  i < step ? "bg-teal text-white" : i === step ? "bg-white/20" : "bg-panel"
                }`}
              >
                {i < step ? "✓" : i + 1}
              </span>
              {STEP_LABEL[sid]}
            </button>
            {i < flow.length - 1 && <span className="text-line mx-0.5">›</span>}
          </div>
        ))}
      </div>

      <div className="t-card p-5 bg-white">
        {id === "type" && (
          <StepType
            choice={ptype}
            setChoice={(p) => {
              setPtype(p);
              setStep(0);
            }}
            onNext={next}
          />
        )}
        {id === "compose" && <StepCompose ptype={ptype} onNext={next} />}
        {id === "upload" && <StepUpload onNext={next} />}
        {id === "parsing" && <StepParsing onNext={next} />}
        {id === "components" && <StepComponents onNext={next} />}
        {id === "verify" && <StepVerify onNext={next} />}
        {id === "visibility" && <StepVisibility onNext={next} />}
        {id === "licenses" && <StepLicenses onNext={next} />}
        {id === "pricing" && <StepPricing kind={goodsKind} onNext={next} />}
        {id === "shipping" && <StepShipping onNext={next} />}
        {id === "preorder" && <StepPreorder onNext={next} />}
        {id === "partner" && <StepPartner onNext={next} />}
        {id === "publish" && (
          <StepPublish
            ptype={ptype}
            onPublish={() => {
              // The draft becomes a LIVE listing: it appears in the buyer
              // marketplace immediately and persists in the demo DB.
              const id = "dp_pub_" + Math.random().toString(36).slice(2, 7);
              const isPhysical = ptype === "physical" || ptype === "bundle";
              publishProduct({
                id,
                slug: (draft.title || "untitled").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + id.slice(-4),
                title: draft.title || "Untitled listing",
                productType: ptype === "bundle" ? "bundle" : ptype === "physical" ? "physical" : "digital",
                price: draft.price || (isPhysical ? 29 : undefined),
                stock: isPhysical ? draft.stock || 25 : undefined,
                weightG: isPhysical ? draft.weightG || 100 : undefined,
                shipProfileId: isPhysical ? "sp_small" : undefined,
                handlingDays: isPhysical ? "1–3 days" : undefined,
                tagline: draft.description?.slice(0, 140) || "Newly published listing.",
                category: ptype === "digital" ? "kicad_full_project" : "complete_design",
                sellerId: "s_sulab",
                sellerName: "SuLab",
                sellerCountry: "US",
                kicadVersion: ptype === "digital" ? "KiCad 8.0" : "—",
                verifyLevel: draft.fabricated && draft.drc === "pass" ? 2 : draft.drc === "pass" ? 1 : 0,
                downloads: 0,
                timesManufactured: 0,
                updatedAt: new Date().toISOString().slice(0, 10),
                layers: 2,
                sizeMm: "—",
                heroThumb: "from-slate-600 to-navy",
                makeEnabled: ptype !== "physical",
                allowFullFileToPartner: false,
                rating: 0,
                reviewCount: 0,
                supportResponse: "~48 hours",
                licenses: [],
                bom: [],
                files: [],
              });
              resetDraft();
              router.push("/seller");
            }}
          />
        )}
      </div>

      {step > 0 && (
        <button className="text-sm text-muted mt-3 hover:text-slate" onClick={() => setStep((x) => x - 1)}>
          ← Back
        </button>
      )}
    </div>
  );
}

function StepType({
  choice,
  setChoice,
  onNext,
}: {
  choice: PType;
  setChoice: (p: PType) => void;
  onNext: () => void;
}) {
  const opts: [PType, string, string][] = [
    ["physical", "A physical product", "A board you build and ship. AI compose, Stripe payouts, Shippo labels, optional preorder."],
    ["digital", "A digital hardware design", "Sell KiCad files under a license. No shipping, instant delivery."],
    ["bundle", "A physical + digital bundle", "Ship a board and grant the files with it."],
    ["service", "A professional design service", "Review, migration, custom work."],
    ["manufacturing", "A manufacturing service", "For approved partner accounts."],
  ];
  return (
    <div>
      <h2 className="font-semibold text-navy mb-3">What are you selling?</h2>
      <div className="space-y-2">
        {opts.map(([val, title, d]) => (
          <label
            key={val}
            className={`flex items-start gap-3 border rounded-lg p-3 cursor-pointer transition ${
              choice === val ? "border-teal bg-teal-light/40" : "border-line hover:border-teal/50"
            }`}
          >
            <input
              type="radio"
              name="ptype"
              checked={choice === val}
              onChange={() => setChoice(val)}
              className="mt-1 accent-teal"
            />
            <div>
              <div className="font-semibold text-navy text-sm">{title}</div>
              <div className="text-xs text-muted">{d}</div>
            </div>
          </label>
        ))}
      </div>
      <div className="mt-4 rounded-lg bg-panel border border-line p-3 text-xs text-slate">
        Your flow: {FLOWS[choice].map((s) => STEP_LABEL[s]).join(" → ")}
      </div>
      <button className="t-btn-primary mt-4" onClick={onNext}>
        Continue
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AI Compose — voice + text + photos + engineering files → Tindie listing fields
// ---------------------------------------------------------------------------
function StepCompose({ ptype, onNext }: { ptype: PType; onNext: () => void }) {
  const [done, setDone] = useState(false);
  return (
    <div>
      <h2 className="font-semibold text-navy mb-1">
        Describe your product <span className="t-tag bg-cta text-white ml-1">SmartList</span>
      </h2>
      <p className="text-sm text-muted mb-4">
        {ptype === "service"
          ? "Describe the service you offer — scope, turnaround, what the client receives."
          : "Talk, type, drop in photos, or hand over the design files. Any combination works; more sources means higher confidence. The output is your existing Tindie listing form, filled in."}
      </p>
      <AIComposer onComposed={() => setDone(true)} />
      <button className="t-btn-primary mt-5 disabled:opacity-40" disabled={!done} onClick={onNext}>
        Continue to pricing
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Preorder — the ezPLM Build module, folded in
// ---------------------------------------------------------------------------
function StepPreorder({ onNext }: { onNext: () => void }) {
  const c = seedCampaigns[0];
  const [enabled, setEnabled] = useState(true);
  const [type, setType] = useState<CampaignType>("batch_build");
  const [minUnits, setMinUnits] = useState(50);
  const [price, setPrice] = useState(79);
  const [earlyBird, setEarlyBird] = useState(true);
  const [ebPrice, setEbPrice] = useState(69);
  const [prodQty, setProdQty] = useState(100);

  const margin = estimateMargin(price, prodQty, c.review);
  const risk = CAMPAIGN_TYPE_RISK[type];

  if (!enabled) {
    return (
      <div>
        <h2 className="font-semibold text-navy mb-1">Preorder (optional)</h2>
        <p className="text-sm text-muted mb-4">
          Selling from stock — no preorder campaign. You can start one later from the Build tab.
        </p>
        <button className="t-btn-ghost" onClick={() => setEnabled(true)}>
          Actually, run a preorder
        </button>
        <button className="t-btn-primary ml-2" onClick={onNext}>
          Continue
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-semibold text-navy mb-1">Preorder campaign</h2>
      <p className="text-sm text-muted mb-4">
        Find out whether the market wants this <em>before</em> you spend money on a production run. The partner&apos;s
        tiered quote turns demand into a real margin number at each volume.
      </p>

      {/* Campaign type — the risk ladder */}
      <label className="t-label">Campaign type</label>
      <div className="space-y-2">
        {(["interest_check", "batch_build", "rolling_preorder"] as CampaignType[]).map((t) => (
          <label
            key={t}
            className={`flex items-start gap-3 border rounded-lg p-3 cursor-pointer transition ${
              type === t ? "border-teal bg-teal-light/40" : "border-line hover:border-teal/50"
            }`}
          >
            <input type="radio" checked={type === t} onChange={() => setType(t)} className="mt-1 accent-teal" />
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-navy text-sm">{CAMPAIGN_TYPE_LABEL[t]}</span>
                <span className={`t-tag ${CAMPAIGN_TYPE_RISK[t].tone}`}>{CAMPAIGN_TYPE_RISK[t].label}</span>
              </div>
              <div className="text-xs text-muted mt-0.5">{CAMPAIGN_TYPE_HELP[t]}</div>
            </div>
          </label>
        ))}
      </div>

      <div className="mt-3 rounded-lg bg-panel border border-line p-3 text-xs text-slate leading-relaxed">
        <strong className="text-navy">How the money is actually held.</strong> A Batch Build authorises the card and
        captures only when the goal is met. Stripe authorisations expire after about 7 days, so a campaign running
        longer uses a saved payment method plus an off-session charge at goal, not a long-lived hold. That constraint is
        why the goal deadline and the capture mechanism have to be designed together — it is not a UI detail.
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mt-4">
        <div>
          <label className="t-label">Minimum goal (units)</label>
          <input className="t-input" type="number" value={minUnits} onChange={(e) => setMinUnits(+e.target.value)} />
          <p className="t-hint">Production does not start below this. Nothing is captured if it is not reached.</p>
        </div>
        <div>
          <label className="t-label">Unit price (USD)</label>
          <input className="t-input" type="number" value={price} onChange={(e) => setPrice(+e.target.value)} />
        </div>
        <div>
          <label className="t-label">Planned production quantity</label>
          <input className="t-input" type="range" min={50} max={200} step={10} value={prodQty} onChange={(e) => setProdQty(+e.target.value)} />
          <p className="t-hint">
            {prodQty} units → quote tier {margin.tierUsed} @ ${margin.manufacturingCost.toFixed(2)}/unit ·{" "}
            {margin.leadTimeDays} day lead time
          </p>
        </div>
        <div>
          <label className="t-label">Early-bird price</label>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={earlyBird} onChange={() => setEarlyBird((v) => !v)} className="accent-teal" />
            <input
              className="t-input"
              type="number"
              value={ebPrice}
              disabled={!earlyBird}
              onChange={(e) => setEbPrice(+e.target.value)}
            />
          </div>
          <p className="t-hint">First 25 backers. Early-bird margin: ${(margin.profit - (price - ebPrice)).toFixed(2)}/unit.</p>
        </div>
      </div>

      {/* Live margin from the partner's tiered quote */}
      <div className="mt-4 border border-line rounded-lg overflow-hidden">
        <div className="px-4 py-2 bg-panel border-b border-line text-sm font-semibold text-navy flex items-center gap-2">
          Margin at {prodQty} units
          <span className="t-tag bg-teal-light text-teal-dark ml-auto">{c.review.partnerName} quote</span>
        </div>
        <div className="p-4 grid sm:grid-cols-2 gap-4">
          <dl className="text-sm space-y-1">
            <MRow k="Unit price" v={margin.unitPrice} />
            <MRow k="− Manufacturing" v={-margin.manufacturingCost} />
            <MRow k="− Platform fee (5%)" v={-margin.platformFee} />
            <MRow k="− Payment cost" v={-margin.paymentFee} />
            <MRow k="− Logistics" v={-margin.logistics} />
            <div
              className={`flex justify-between border-t pt-1.5 mt-1.5 font-bold ${
                margin.profit < 0 ? "border-danger text-danger" : "border-navy text-navy"
              }`}
            >
              <dt>Profit / unit</dt>
              <dd>${margin.profit.toFixed(2)}</dd>
            </div>
          </dl>
          <div>
            <div className="text-xs text-muted mb-1">Margin</div>
            <div
              className={`text-3xl font-bold ${
                margin.marginPct >= 35 ? "text-ok" : margin.marginPct >= 15 ? "text-tag" : "text-danger"
              }`}
            >
              {margin.marginPct.toFixed(1)}%
            </div>
            <div className="text-xs text-muted mt-2">
              Total profit at {prodQty} units:{" "}
              <strong className="text-navy">${(margin.profit * prodQty).toFixed(0)}</strong>
            </div>
            {margin.profit < 0 && (
              <div className="mt-2 rounded-md bg-red-50 border border-red-200 px-2.5 py-2 text-xs text-red-700 font-semibold">
                ⚠ This campaign loses money at every unit sold. Raise the price or produce a larger batch.
              </div>
            )}
            <p className="text-[11px] text-muted mt-2 leading-relaxed">
              Drag the production quantity: at 200 units the tier drops to $29.40 and the margin changes shape. This is
              exactly the decision a preorder exists to inform.
            </p>
          </div>
        </div>
      </div>

      <p className={`mt-3 text-xs px-3 py-2 rounded-md ${risk.tone}`}>
        Buyer-facing risk statement: <strong>{risk.label}.</strong> This is shown on the campaign page, not buried in
        terms.
      </p>

      <div className="mt-4 flex gap-2">
        <button className="t-btn-primary" onClick={onNext}>
          Continue
        </button>
        <button className="t-btn-ghost" onClick={() => setEnabled(false)}>
          No preorder — sell from stock
        </button>
      </div>
    </div>
  );
}

function MRow({ k, v }: { k: string; v: number }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted">{k}</dt>
      <dd>
        {v < 0 ? "-" : ""}${Math.abs(v).toFixed(2)}
      </dd>
    </div>
  );
}

function StepPartner({ onNext }: { onNext: () => void }) {
  return (
    <div>
      <h2 className="font-semibold text-navy mb-1">Manufacturing service listing</h2>
      <p className="text-sm text-muted mb-4">
        Manufacturing services are listed by approved partner accounts and are configured in the Partner console, not
        here — capabilities, regions, lead times and commission model are partner-record fields that feed the routing
        engine.
      </p>
      <div className="rounded-lg bg-panel border border-line p-4 text-sm text-slate">
        Your account is not a partner account. Apply through the partner programme, or switch the role selector to
        &ldquo;Partner&rdquo; to see that console.
      </div>
      <button className="t-btn-primary mt-4" onClick={onNext}>
        Continue anyway (demo)
      </button>
    </div>
  );
}

function StepUpload({ onNext }: { onNext: () => void }) {
  const [files, setFiles] = useState<string[]>([]);
  const [voiced, setVoiced] = useState(false);
  const mockTree = [
    ["board.kicad_pro", "KiCad Project", "12 KB"],
    ["board.kicad_sch", "Schematic", "486 KB"],
    ["board.kicad_pcb", "PCB Layout", "902 KB"],
    ["gerbers/", "Gerber package", "240 KB"],
    ["bom.csv", "BOM", "8 KB"],
    ["enclosure.step", "STEP model", "3.1 MB"],
  ];
  return (
    <div>
      <h2 className="font-semibold text-navy mb-3">Upload your project</h2>
      <button
        onClick={() => setFiles(mockTree.map((f) => f[0]))}
        className="w-full border-2 border-dashed border-line rounded-lg p-8 text-center hover:border-teal transition"
      >
        <div className="text-muted text-sm">
          Drop a <span className="font-mono">.zip</span> or KiCad files here
          <div className="text-xs mt-1">.kicad_pro · .kicad_sch · .kicad_pcb · .pretty · Gerber · BOM · STEP · firmware</div>
          <div className="mt-3 t-btn-ghost inline-flex">Select files (demo)</div>
        </div>
      </button>

      {files.length > 0 && (
        <div className="mt-4 t-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-panel text-xs uppercase text-muted">
              <tr><th className="text-left px-3 py-2">File</th><th className="text-left px-3 py-2">Type</th><th className="text-right px-3 py-2">Size</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {mockTree.map((f) => (
                <tr key={f[0]}><td className="px-3 py-2 font-mono">{f[0]}</td><td className="px-3 py-2 text-muted">{f[1]}</td><td className="px-3 py-2 text-right text-muted">{f[2]}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Voice is the low-friction entry point: many sellers can describe a board
          in 20 seconds but will abandon a 30-field form. */}
      <div className="mt-6 pt-5 border-t border-line">
        <h3 className="font-semibold text-navy text-sm mb-1">
          Or just talk <span className="t-tag bg-cta text-white ml-1">SmartList</span>
        </h3>
        <p className="text-xs text-muted mb-3">
          Describe the board out loud. Speech is transcribed, fields are extracted, and every extracted value keeps a
          pointer back to where it came from — voice, schematic, BOM or README.
        </p>
        <VoiceCapture onExtract={() => setVoiced(true)} />
      </div>

      <button className="t-btn-primary mt-5" onClick={onNext} disabled={files.length === 0 && !voiced}>
        Start parsing
      </button>
      {files.length === 0 && !voiced && (
        <p className="t-hint mt-2">Upload files or record a voice description to continue.</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pricing — the seller sees the real cost stack before naming a price.
// ---------------------------------------------------------------------------
function StepPricing({ kind, onNext }: { kind: "digital" | "physical" | "manufacturing"; onNext: () => void }) {
  const { shipProfile } = useApp();
  return (
    <div>
      <h2 className="font-semibold text-navy mb-1">Pricing &amp; net income</h2>
      <p className="text-sm text-muted mb-4 max-w-3xl">
        A 5–10% commission is not what a listing actually costs. Payment fees, cross-border and FX charges, and the
        outbound label all land on the seller. Model them here, before publishing — the wizard blocks a publish that
        would lose money on every unit.
      </p>
      <NetIncomeCalculator kind={kind} initialPrice={19.99} profile={shipProfile} />
      <div className="mt-4 rounded-lg bg-teal-light/50 border border-teal/30 p-3 text-xs text-teal-dark leading-relaxed">
        <strong>Two things worth trying.</strong> Switch the seller region to China — the corridor flips to Wise and
        the cost structure changes shape entirely. Then switch the goods type to digital and drag the cart size: the
        fixed fee amortises, which is the whole argument for bundling rather than raising prices.
      </div>
      <button className="t-btn-primary mt-4" onClick={onNext}>
        Continue
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shipping — same profile object the calculator, checkout and fulfillment read.
// ---------------------------------------------------------------------------
function StepShipping({ onNext }: { onNext: () => void }) {
  const { shipProfile, setShipProfile } = useApp();
  return (
    <div>
      <h2 className="font-semibold text-navy mb-1">
        Shipping, customs &amp; reachable countries{" "}
        <span className="t-tag bg-cta text-white ml-1">conversion lever</span>
      </h2>
      <p className="text-sm text-muted mb-4 max-w-3xl">
        Only applies to physical fulfillment — a pure digital asset skips this. Configure once; the buyer sees a live
        rate, a delivery window and an honest customs answer for their own country, and the label bought at fulfillment
        comes from the same rates.
      </p>
      <ShippingProfileEditor profile={shipProfile} onChange={setShipProfile} goodsValue={19.99} />
      <button className="t-btn-primary mt-5" onClick={onNext}>
        Continue
      </button>
    </div>
  );
}

function StepParsing({ onNext }: { onNext: () => void }) {
  const [done, setDone] = useState(0);
  useEffect(() => {
    if (done >= PARSE_STEPS.length) return;
    const t = setTimeout(() => setDone((d) => d + 1), 450);
    return () => clearTimeout(t);
  }, [done]);
  const complete = done >= PARSE_STEPS.length;
  return (
    <div>
      <h2 className="font-semibold text-navy mb-3">Parsing your project</h2>
      <ul className="space-y-2">
        {PARSE_STEPS.map((s, i) => (
          <li key={s} className="flex items-center gap-2 text-sm">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
              i < done ? "bg-ok text-white" : "bg-panel text-muted"
            }`}>
              {i < done ? "✓" : "…"}
            </span>
            <span className={i < done ? "text-slate" : "text-muted"}>{s}</span>
          </li>
        ))}
        {complete && (
          <>
            <li className="flex items-center gap-2 text-sm text-amber-600"><span className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center text-xs">!</span>3 components need confirmation</li>
            <li className="flex items-center gap-2 text-sm text-amber-600"><span className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center text-xs">!</span>2 external libraries are missing</li>
          </>
        )}
      </ul>
      <button className="t-btn-primary mt-4" onClick={onNext} disabled={!complete}>
        {complete ? "Review components" : "Parsing…"}
      </button>
    </div>
  );
}

function StepComponents({ onNext }: { onNext: () => void }) {
  const rows = [
    ["U1", "RP2350A", "MCU", 0.99],
    ["J1", "USB4110-GF-A", "USB-C", 0.88],
    ["D1", "PESD5V0X1BT", "TVS", 0.72],
  ] as const;
  const [vis, setVis] = useState("key");
  return (
    <div>
      <h2 className="font-semibold text-navy mb-3">Confirm components</h2>
      <div className="t-card overflow-hidden mb-4">
        <table className="w-full text-sm">
          <thead className="bg-panel text-xs uppercase text-muted"><tr><th className="text-left px-3 py-2">Ref</th><th className="text-left px-3 py-2">MPN</th><th className="text-left px-3 py-2">Value</th><th className="text-right px-3 py-2">Confidence</th></tr></thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r[0]} className={r[3] < 0.85 ? "bg-amber-50" : ""}>
                <td className="px-3 py-2 font-mono">{r[0]}</td>
                <td className="px-3 py-2 font-mono">{r[1]}</td>
                <td className="px-3 py-2 text-muted">{r[2]}</td>
                <td className="px-3 py-2 text-right">
                  <span className={r[3] < 0.85 ? "text-amber-600 font-semibold" : "text-ok"}>{Math.round(r[3] * 100)}%</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <label className="t-label">BOM visibility on the public page</label>
      <select className="t-input" value={vis} onChange={(e) => setVis(e.target.value)}>
        <option value="private">Private — hidden from buyers</option>
        <option value="key">Public key components only</option>
        <option value="full">Public full BOM</option>
      </select>
      <button className="t-btn-primary mt-4" onClick={onNext}>Continue</button>
    </div>
  );
}

function StepVisibility({ onNext }: { onNext: () => void }) {
  const items = ["Schematic", "PCB", "3D", "BOM", "Gerber", "Firmware", "Documentation"];
  const [state, setState] = useState<Record<string, string>>(
    Object.fromEntries(items.map((i) => [i, i === "Firmware" || i === "Gerber" ? "private" : "partial"]))
  );
  return (
    <div>
      <h2 className="font-semibold text-navy mb-3">Public preview control</h2>
      <p className="text-xs text-muted mb-3">Set how much of each part buyers can see before purchase. Full source stays protected.</p>
      <div className="t-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-panel text-xs uppercase text-muted"><tr><th className="text-left px-3 py-2">Content</th><th className="px-3 py-2">Hidden</th><th className="px-3 py-2">Partial</th><th className="px-3 py-2">Full</th></tr></thead>
          <tbody className="divide-y divide-line">
            {items.map((it) => (
              <tr key={it}>
                <td className="px-3 py-2 text-slate">{it}</td>
                {["private", "partial", "public"].map((lvl) => (
                  <td key={lvl} className="px-3 py-2 text-center">
                    <input type="radio" name={it} checked={state[it] === lvl} onChange={() => setState((s) => ({ ...s, [it]: lvl }))} className="accent-teal" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button className="t-btn-primary mt-4" onClick={onNext}>Continue</button>
    </div>
  );
}

function StepLicenses({ onNext }: { onNext: () => void }) {
  const [rows, setRows] = useState([
    { name: "Personal License", price: 5, on: true },
    { name: "Commercial — up to 100 units", price: 39, on: true },
    { name: "Unlimited Commercial", price: 99, on: true },
    { name: "Open Source (free)", price: 0, on: false },
  ]);
  return (
    <div>
      <h2 className="font-semibold text-navy mb-3">Licenses & pricing</h2>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={r.name} className="flex items-center gap-3 border border-line rounded-lg p-3">
            <input type="checkbox" checked={r.on} onChange={() => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, on: !x.on } : x)))} className="accent-teal" />
            <span className="flex-1 text-sm text-slate">{r.name}</span>
            <div className="flex items-center gap-1">
              <span className="text-muted">$</span>
              <input
                type="number"
                className="t-input w-24 py-1"
                value={r.price}
                onChange={(e) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, price: Number(e.target.value) } : x)))}
              />
            </div>
          </div>
        ))}
      </div>
      <button className="t-btn-primary mt-4" onClick={onNext}>Continue</button>
    </div>
  );
}

function StepManufacturing({ onNext }: { onNext: () => void }) {
  const opts = [
    "Enable PCB manufacturing",
    "Enable PCB assembly",
    "Enable component sourcing",
    "Enable design review",
    "Enable customization requests",
    "Enable local manufacturing partners",
  ];
  const [on, setOn] = useState<Record<string, boolean>>(Object.fromEntries(opts.map((o) => [o, true])));
  const [fullFiles, setFullFiles] = useState(false);
  return (
    <div>
      <h2 className="font-semibold text-navy mb-3">Help buyers manufacture this design</h2>
      <div className="space-y-2">
        {opts.map((o) => (
          <label key={o} className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={on[o]} onChange={() => setOn((s) => ({ ...s, [o]: !s[o] }))} className="accent-teal" />
            <span className="text-slate">{o}</span>
          </label>
        ))}
      </div>
      <label className="flex items-start gap-3 text-sm mt-4 border-t border-line pt-4">
        <input type="checkbox" checked={fullFiles} onChange={() => setFullFiles((v) => !v)} className="mt-0.5 accent-teal" />
        <span className="text-slate">
          Allow partners to access the <strong>full project</strong> (not just manufacturing files).
          <span className="block text-xs text-muted">Off by default — partners get scoped, expiring access to Gerbers/BOM only.</span>
        </span>
      </label>
      <button className="t-btn-primary mt-4" onClick={onNext}>Continue</button>
    </div>
  );
}

function StepPublish({ ptype, onPublish }: { ptype: PType; onPublish: () => void }) {
  const [ip, setIp] = useState(false);
  const digitalish = ptype === "digital" || ptype === "bundle";
  const physicalish = ptype === "physical" || ptype === "bundle";
  const checks: [string, string, boolean][] = [
    ["Listing completeness", "All required Tindie fields filled", true],
    ["Low-confidence fields", "0 remaining unconfirmed", true],
    ...(digitalish
      ? ([
          ["File completeness", "All core files present", true],
          ["BOM match rate", "94%", true],
          ["License status", "3 tiers configured", true],
        ] as [string, string, boolean][])
      : []),
    ...(physicalish
      ? ([
          ["Shipping profile", "Bound · 42 g · HS 8517.62", true],
          ["Net income at list price", "Positive across all corridors", true],
        ] as [string, string, boolean][])
      : []),
  ];
  return (
    <div>
      <h2 className="font-semibold text-navy mb-3">Pre-publish check</h2>
      <div className="t-card divide-y divide-line">
        {checks.map(([k, v, ok]) => (
          <div key={k} className="flex items-center justify-between px-4 py-2.5 text-sm">
            <span className="text-slate">{k}</span>
            <span className="flex items-center gap-2">
              <span className="text-muted">{v}</span>
              <span className={ok ? "text-ok" : "text-danger"}>{ok ? "✓" : "✕"}</span>
            </span>
          </div>
        ))}
      </div>

      <label className="flex items-start gap-3 text-sm mt-4">
        <input type="checkbox" checked={ip} onChange={() => setIp((v) => !v)} className="mt-0.5 accent-teal" />
        <span className="text-slate">
          I own the rights to this work, have disclosed third-party and open-source material, and accept Tindie&apos;s
          takedown and repeat-infringer policy.
        </span>
      </label>

      <button className="t-btn-cta mt-4" onClick={onPublish} disabled={!ip}>
        Publish design
      </button>
    </div>
  );
}


// ---------------------------------------------------------------------------
// VERIFY — the step that actually decides whether a buyer trusts this listing.
//
// The AI-written description is worth nothing to a KiCad buyer if the design has
// never been through DRC. This is the highest-leverage screen in the digital
// flow, so it gets its own step rather than being a checkbox at the end.
// ---------------------------------------------------------------------------
function StepVerify({ onNext }: { onNext: () => void }) {
  const { draft, patchDraft, markStepComplete } = useApp();
  const [drc, setDrc] = useState<"pass" | "fail" | "not_run">("pass");
  const [erc, setErc] = useState<"pass" | "fail" | "not_run">("pass");
  const [fabricated, setFabricated] = useState(false);
  const [photo, setPhoto] = useState(false);
  const [firmware, setFirmware] = useState(false);
  const [testLog, setTestLog] = useState(false);

  // Verification LEVEL is earned by evidence, not claimed by a checkbox.
  const level =
    fabricated && photo && (testLog || firmware) && drc === "pass" && erc === "pass"
      ? 3
      : fabricated && drc === "pass"
      ? 2
      : drc === "pass" && erc === "pass"
      ? 1
      : 0;

  const LEVELS = [
    { n: 0, name: "Unverified", blurb: "Files upload and parse. Nothing else is claimed." },
    { n: 1, name: "Checks pass", blurb: "DRC and ERC pass in KiCad. The design is manufacturable on paper." },
    { n: 2, name: "Fabricated", blurb: "The seller has had this board made at least once." },
    { n: 3, name: "Proven", blurb: "Fabricated, photographed, and either firmware or a test log is attached." },
  ];

  return (
    <div>
      <h2 className="font-bold text-navy mb-1">Verify the design</h2>
      <p className="text-sm text-muted mb-4">
        This is what a buyer of a KiCad project actually reads. A good description does not make an unfabricated design
        safe to build — so the listing badge is earned from evidence below, and cannot be typed in.
      </p>

      <div className="space-y-2 mb-5">
        <Check label="DRC passes" hint="Design rule check clean in KiCad." on={drc === "pass"} set={(v) => setDrc(v ? "pass" : "not_run")} />
        <Check label="ERC passes" hint="Electrical rule check clean — no unconnected pins, no conflicting drivers." on={erc === "pass"} set={(v) => setErc(v ? "pass" : "not_run")} />
        <Check label="I have fabricated this design" hint="At least one physical board has been made from these exact files." on={fabricated} set={setFabricated} />
        <Check label="Photo of the assembled board attached" hint="The single most persuasive artifact on the whole listing." on={photo} set={setPhoto} />
        <Check label="Firmware / example code included" on={firmware} set={setFirmware} />
        <Check label="Test log or measurement data attached" on={testLog} set={setTestLog} />
      </div>

      <div className="t-card p-4 mb-5">
        <div className="text-xs uppercase tracking-wide text-muted mb-2">Verification level (earned)</div>
        <div className="space-y-1.5">
          {LEVELS.map((l) => (
            <div
              key={l.n}
              className={`flex items-start gap-3 rounded-lg px-3 py-2 border ${
                l.n === level ? "border-teal bg-teal-light/50" : "border-line opacity-50"
              }`}
            >
              <span className="font-bold text-navy text-sm shrink-0">L{l.n}</span>
              <div>
                <div className="font-semibold text-navy text-sm">{l.name}</div>
                <div className="text-xs text-muted">{l.blurb}</div>
              </div>
            </div>
          ))}
        </div>
        {level < 2 && (
          <p className="t-hint mt-3">
            Buyers filter on L2+. An unfabricated design still sells — it is just listed honestly as one, and priced
            accordingly.
          </p>
        )}
      </div>

      <button
        className="t-btn-primary"
        onClick={() => {
          patchDraft({ drc, erc, fabricated });
          markStepComplete("verify");
          onNext();
        }}
      >
        Continue — saved to draft {draft.id}
      </button>
    </div>
  );
}

function Check({
  label,
  hint,
  on,
  set,
}: {
  label: string;
  hint?: string;
  on: boolean;
  set: (v: boolean) => void;
}) {
  return (
    <label
      className={`flex items-start gap-3 border rounded-lg p-3 cursor-pointer transition ${
        on ? "border-teal bg-teal-light/40" : "border-line hover:border-teal/50"
      }`}
    >
      <input type="checkbox" checked={on} onChange={(e) => set(e.target.checked)} className="mt-0.5 accent-teal" />
      <div>
        <div className="font-medium text-navy text-sm">{label}</div>
        {hint && <div className="text-xs text-muted">{hint}</div>}
      </div>
    </label>
  );
}


/** The draft is real: one object, autosaved, validated as a whole before publish. */
function DraftBar() {
  const { draft } = useApp();
  const issues = validateDraft(draft);
  const errors = issues.filter((i) => i.severity === "error").length;
  return (
    <div className="flex items-center gap-2 flex-wrap text-xs mb-4 rounded-lg border border-line bg-panel/60 px-3 py-2">
      <span className="font-mono text-slate">{draft.id}</span>
      <span className="t-tag bg-white border border-line text-slate">{draft.status}</span>
      <span className="text-muted">
        autosaved {new Date(draft.lastSavedAt).toLocaleTimeString()} · {draft.completedSteps.length} step(s) complete
      </span>
      <span className={`t-tag ml-auto ${errors ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-700"}`}>
        {errors ? `${errors} blocker(s) before publish` : "ready to publish"}
      </span>
    </div>
  );
}
