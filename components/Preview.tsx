"use client";

import { useState } from "react";
import { DigitalProduct } from "@/lib/types";

type View = "schematic" | "pcb" | "3d";

export default function Preview({ p }: { p: DigitalProduct }) {
  const [view, setView] = useState<View>("pcb");
  const [layer, setLayer] = useState("top");

  return (
    <div>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {(["schematic", "pcb", "3d"] as View[]).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-3 py-1.5 rounded-md text-sm font-semibold capitalize transition ${
              view === v ? "bg-teal text-white" : "bg-panel text-slate hover:bg-line"
            }`}
          >
            {v === "3d" ? "3D" : v}
          </button>
        ))}
        {view === "pcb" && (
          <select className="t-input w-auto ml-auto text-sm py-1" value={layer} onChange={(e) => setLayer(e.target.value)}>
            <option value="top">Top copper</option>
            <option value="bottom">Bottom copper</option>
            <option value="silk">Silkscreen</option>
            <option value="all">All layers</option>
          </select>
        )}
      </div>

      <div className="rounded-lg border border-line bg-[#0d1117] overflow-hidden aspect-[16/9] flex items-center justify-center relative">
        <span className="absolute top-2 left-3 text-[11px] font-mono text-white/40">
          {p.title} · {view === "3d" ? "3D preview" : view} · watermarked preview
        </span>
        {view === "schematic" && <SchematicMock />}
        {view === "pcb" && <PcbMock layer={layer} />}
        {view === "3d" && <ThreeDMock />}
        <span className="absolute bottom-2 right-3 text-[10px] font-mono text-white/30">TINDIE · PREVIEW</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-sm">
        <Fact label="Board size" value={p.sizeMm} />
        <Fact label="Layers" value={p.layers ? String(p.layers) : "—"} />
        <Fact label="KiCad" value={p.kicadVersion} />
        <Fact label="Components" value={p.bom.length ? `${p.bom.length} lines` : "—"} />
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="t-card px-3 py-2">
      <div className="text-[11px] text-muted uppercase tracking-wide">{label}</div>
      <div className="font-semibold text-navy">{value}</div>
    </div>
  );
}

function SchematicMock() {
  return (
    <svg viewBox="0 0 320 180" className="w-full h-full opacity-90">
      <g stroke="#2dd4bf" strokeWidth="1" fill="none">
        <rect x="120" y="60" width="80" height="60" />
        <text x="160" y="94" fill="#2dd4bf" fontSize="9" textAnchor="middle" fontFamily="monospace">U1 RP2350</text>
        <line x1="120" y1="75" x2="90" y2="75" /><line x1="90" y1="75" x2="90" y2="40" />
        <line x1="200" y1="75" x2="240" y2="75" /><line x1="240" y1="75" x2="240" y2="120" />
        <line x1="120" y1="105" x2="90" y2="105" />
        <circle cx="90" cy="40" r="2" fill="#2dd4bf" />
        <rect x="250" y="100" width="18" height="10" />
        <text x="259" y="122" fill="#8b949e" fontSize="6" textAnchor="middle" fontFamily="monospace">C1</text>
      </g>
      <text x="160" y="165" fill="#484f58" fontSize="7" textAnchor="middle" fontFamily="monospace">
        net names hidden in preview
      </text>
    </svg>
  );
}

function PcbMock({ layer }: { layer: string }) {
  const copper = layer === "bottom" ? "#3b82f6" : "#f59e0b";
  const showSilk = layer === "silk" || layer === "all";
  const showCopper = layer !== "silk";
  return (
    <svg viewBox="0 0 320 180" className="w-[70%] h-[70%]">
      <rect x="40" y="30" width="240" height="120" rx="6" fill="#0b3d2e" stroke="#134e3a" />
      {showCopper && (
        <g stroke={copper} strokeWidth="2" fill="none" opacity="0.85">
          <path d="M70 60 H180 V110 H230" />
          <path d="M70 90 H150 V130" />
          <path d="M90 60 V120" />
          <circle cx="70" cy="60" r="3" /><circle cx="230" cy="110" r="3" />
        </g>
      )}
      {showSilk && (
        <g fill="none" stroke="#e5e7eb" strokeWidth="1" opacity="0.8">
          <rect x="130" y="70" width="40" height="40" />
          <text x="150" y="65" fill="#e5e7eb" fontSize="7" textAnchor="middle" fontFamily="monospace">U1</text>
        </g>
      )}
    </svg>
  );
}

function ThreeDMock() {
  return (
    <svg viewBox="0 0 320 180" className="w-[70%] h-[70%]">
      <g>
        <polygon points="60,110 200,110 240,80 100,80" fill="#0f5132" stroke="#134e3a" />
        <polygon points="200,110 200,130 240,100 240,80" fill="#0a3d28" />
        <polygon points="60,110 60,130 200,130 200,110" fill="#0c4530" />
        <rect x="120" y="86" width="34" height="20" fill="#111" transform="skewX(-26)" opacity="0.9" />
        <rect x="175" y="88" width="12" height="10" fill="#1f2937" transform="skewX(-26)" />
      </g>
      <text x="160" y="160" fill="#484f58" fontSize="7" textAnchor="middle" fontFamily="monospace">
        interactive 3D in full version
      </text>
    </svg>
  );
}
