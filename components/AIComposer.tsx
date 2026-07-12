"use client";

import { useState } from "react";
import VoiceCapture from "./VoiceCapture";
import { composeListing, ExtractedField, SOURCE_LABEL, REVIEW_THRESHOLD } from "@/lib/listing";

const PHOTOS = ["front.jpg", "pcb_top.jpg", "in_use.jpg"];
const ENG_FILES = ["RS485_MAX485E.kicad_sch", "RS485_MAX485E.kicad_pcb", "bom.csv", "gerbers.zip"];

export default function AIComposer({ onComposed }: { onComposed?: (f: ExtractedField[]) => void }) {
  const [voice, setVoice] = useState(false);
  const [text, setText] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [eng, setEng] = useState<string[]>([]);
  const [repo, setRepo] = useState("");
  const [composing, setComposing] = useState(false);
  const [fields, setFields] = useState<ExtractedField[] | null>(null);

  const anyInput = voice || text.trim().length > 0 || photos.length > 0 || eng.length > 0 || repo.trim().length > 0;

  function compose() {
    setComposing(true);
    setTimeout(() => {
      const f = composeListing({
        voice,
        text: text.trim().length > 0,
        photos: photos.length,
        engineeringFiles: eng.length > 0,
        repo: repo.trim().length > 0,
      });
      setFields(f);
      setComposing(false);
      onComposed?.(f);
    }, 1100);
  }

  const needsReview = fields?.filter((f) => f.confidence < REVIEW_THRESHOLD) ?? [];

  return (
    <div className="space-y-5">
      {/* Inputs */}
      <div className="grid md:grid-cols-2 gap-4">
        <Panel title="🎤 Describe it out loud" sub="The fastest path for a seller who hates forms.">
          <VoiceCapture onExtract={() => setVoice(true)} />
        </Panel>

        <Panel title="✎ Or type a few lines" sub="One or two sentences is enough — the AI does the rest.">
          <textarea
            className="t-input"
            rows={5}
            placeholder="e.g. Industrial RS485 to TTL module, MAX485E, ESD/TVS protected, for Arduino and Pi over Modbus…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </Panel>

        <Panel title="🖼️ Product photos" sub="Board shots, packaging, in-use. AI reads connectors, silkscreen, form factor.">
          <button
            className="w-full border-2 border-dashed border-line rounded-lg p-5 text-center hover:border-cta transition text-sm text-muted"
            onClick={() => setPhotos(PHOTOS)}
          >
            Drop photos here, or click to add (demo)
          </button>
          {photos.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {photos.map((p) => (
                <span key={p} className="t-tag bg-panel text-slate font-mono">
                  {p}
                </span>
              ))}
            </div>
          )}
        </Panel>

        <Panel
          title="📐 Engineering files & repo"
          sub="Schematic, PCB, BOM, Gerber, README — the highest-confidence source of all."
        >
          <button
            className="w-full border-2 border-dashed border-line rounded-lg p-4 text-center hover:border-teal transition text-sm text-muted"
            onClick={() => setEng(ENG_FILES)}
          >
            Add KiCad / Altium / Gerber / BOM (demo)
          </button>
          {eng.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {eng.map((p) => (
                <span key={p} className="t-tag bg-teal-light text-teal-dark font-mono">
                  {p}
                </span>
              ))}
            </div>
          )}
          <input
            className="t-input mt-2"
            placeholder="https://github.com/you/your-project"
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
          />
        </Panel>
      </div>

      <div className="rounded-lg bg-panel border border-line p-3 text-xs text-slate leading-relaxed">
        <strong className="text-navy">More sources, higher confidence.</strong> Every field carries a confidence score
        and a list of the sources that produced it. When two sources agree, confidence rises; when they conflict, the
        <strong className="text-navy"> engineering files win</strong> — a schematic is evidence, speech is a claim.
      </div>

      <button className="t-btn-cta disabled:opacity-40" disabled={!anyInput || composing} onClick={compose}>
        {composing ? "Composing listing…" : "✦ Generate Tindie listing"}
      </button>
      {!anyInput && <p className="t-hint">Add at least one input — voice, text, a photo, or a design file.</p>}

      {/* Output */}
      {fields && (
        <div>
          {needsReview.length > 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900 mb-3">
              <strong>{needsReview.length} field(s) need your confirmation.</strong> Nothing below{" "}
              {(REVIEW_THRESHOLD * 100).toFixed(0)}% confidence is published without a human saying yes:{" "}
              {needsReview.map((f) => f.label).join(", ")}.
            </div>
          )}

          <div className="t-card overflow-hidden">
            <div className="px-4 py-2.5 bg-navy text-white text-sm font-semibold flex items-center gap-2">
              Tindie listing fields — the same form you already use
              <span className="t-tag bg-white/20 text-white ml-auto">{fields.length} fields filled</span>
            </div>
            <div className="divide-y divide-line">
              {fields.map((f) => (
                <FieldRow key={f.key} f={f} onChange={(v) => setFields((fs) => fs!.map((x) => (x.key === f.key ? { ...x, value: v } : x)))} />
              ))}
            </div>
          </div>

          <p className="t-hint mt-2">
            These map one-to-one onto the existing Tindie product-create form. The AI is a faster way to fill that form,
            not a second listing model — which is why an experienced seller can still ignore all of this and use the
            classic form.
          </p>
        </div>
      )}
    </div>
  );
}

function FieldRow({ f, onChange }: { f: ExtractedField; onChange: (v: string) => void }) {
  const low = f.confidence < REVIEW_THRESHOLD;
  return (
    <div className={`p-4 ${low ? "bg-amber-50/50" : ""}`}>
      <div className="flex items-center gap-2 flex-wrap mb-1.5">
        <label className="text-sm font-semibold text-navy">{f.label}</label>
        <span
          className={`t-tag ${
            f.confidence >= 0.9
              ? "bg-emerald-100 text-emerald-700"
              : f.confidence >= REVIEW_THRESHOLD
              ? "bg-teal-light text-teal-dark"
              : "bg-amber-100 text-amber-800"
          }`}
        >
          {(f.confidence * 100).toFixed(0)}%
        </span>
        {f.sources.length > 0 ? (
          <span className="text-[11px] text-muted font-mono">
            from {f.sources.map((s) => SOURCE_LABEL[s]).join(" + ")}
          </span>
        ) : (
          <span className="text-[11px] text-muted italic">no supporting evidence</span>
        )}
        {low && <span className="t-tag bg-amber-100 text-amber-800 ml-auto">confirm before publish</span>}
      </div>

      {f.kind === "textarea" ? (
        <textarea className="t-input font-mono text-xs" rows={10} value={f.value} onChange={(e) => onChange(e.target.value)} />
      ) : f.kind === "select" ? (
        <select className="t-input" value={f.value} onChange={(e) => onChange(e.target.value)}>
          {f.options?.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      ) : (
        <input
          className="t-input"
          type={f.kind === "number" ? "number" : "text"}
          value={f.value}
          placeholder={f.value ? "" : "—"}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {f.hint && <p className="t-hint">{f.hint}</p>}
    </div>
  );
}

function Panel({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="border border-line rounded-lg bg-white overflow-hidden">
      <div className="px-4 py-2.5 bg-panel border-b border-line">
        <div className="font-semibold text-navy text-sm">{title}</div>
        <div className="text-xs text-muted">{sub}</div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
