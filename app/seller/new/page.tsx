"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";

const STEPS = [
  "Type",
  "Upload",
  "Parsing",
  "Components",
  "Visibility",
  "Licenses",
  "Manufacturing",
  "Publish",
];

const PARSE_STEPS = [
  "Project structure detected",
  "KiCad version detected (KiCad 9)",
  "Schematic rendered",
  "PCB rendered",
  "3D preview generated",
  "BOM extracted",
  "47 components matched",
];

export default function NewDesignWizard() {
  const router = useRouter();
  const { showToast } = useApp();
  const [step, setStep] = useState(0);

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-xl font-bold text-navy mb-1">Publish a digital hardware design</h1>
      <p className="text-muted text-sm mb-5">
        This wizard sits on top of the existing product-create form — the same seller, store and Stripe Connect account
        you already have.
      </p>

      {/* Stepper */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center shrink-0">
            <button
              onClick={() => i <= step && setStep(i)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${
                i === step ? "bg-teal text-white" : i < step ? "text-teal-dark" : "text-muted"
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center ${
                i < step ? "bg-teal text-white" : i === step ? "bg-white/20" : "bg-panel"
              }`}>
                {i < step ? "✓" : i + 1}
              </span>
              {s}
            </button>
            {i < STEPS.length - 1 && <span className="text-line mx-0.5">›</span>}
          </div>
        ))}
      </div>

      <div className="t-card p-5 bg-white">
        {step === 0 && <StepType onNext={() => setStep(1)} />}
        {step === 1 && <StepUpload onNext={() => setStep(2)} />}
        {step === 2 && <StepParsing onNext={() => setStep(3)} />}
        {step === 3 && <StepComponents onNext={() => setStep(4)} />}
        {step === 4 && <StepVisibility onNext={() => setStep(5)} />}
        {step === 5 && <StepLicenses onNext={() => setStep(6)} />}
        {step === 6 && <StepManufacturing onNext={() => setStep(7)} />}
        {step === 7 && (
          <StepPublish
            onPublish={() => {
              showToast("Design published (simulated)");
              router.push("/seller");
            }}
          />
        )}
      </div>

      {step > 0 && step < 7 && (
        <button className="text-sm text-muted mt-3 hover:text-slate" onClick={() => setStep((s) => s - 1)}>
          ← Back
        </button>
      )}
    </div>
  );
}

function StepType({ onNext }: { onNext: () => void }) {
  const [choice, setChoice] = useState("digital");
  const opts = [
    ["physical", "A physical product", "Standard Tindie flow — unchanged."],
    ["digital", "A digital hardware design", "Sell KiCad files under a license."],
    ["bundle", "A physical + digital bundle", "Ship a board and grant the files."],
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
            <input type="radio" name="ptype" checked={choice === val} onChange={() => setChoice(val)} className="mt-1 accent-teal" />
            <div>
              <div className="font-semibold text-navy text-sm">{title}</div>
              <div className="text-xs text-muted">{d}</div>
            </div>
          </label>
        ))}
      </div>
      <button className="t-btn-primary mt-4" onClick={onNext} disabled={choice !== "digital"}>
        {choice === "digital" ? "Continue" : "Select digital design to continue"}
      </button>
    </div>
  );
}

function StepUpload({ onNext }: { onNext: () => void }) {
  const [files, setFiles] = useState<string[]>([]);
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

      <button className="t-btn-primary mt-4" onClick={onNext} disabled={files.length === 0}>
        Start parsing
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

function StepPublish({ onPublish }: { onPublish: () => void }) {
  const [ip, setIp] = useState(false);
  const checks = [
    ["Product completeness", "100%", true],
    ["File completeness", "All core files present", true],
    ["BOM match rate", "94%", true],
    ["Preview status", "Rendered", true],
    ["License status", "3 tiers configured", true],
    ["Manufacturing readiness", "Enabled · Gerbers present", true],
  ] as const;
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
