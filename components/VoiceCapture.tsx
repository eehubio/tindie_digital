"use client";

import { useEffect, useRef, useState } from "react";

// Mock transcript + the fields an LLM would lift out of it.
const TRANSCRIPT =
  "It's an industrial RS485 to TTL module built around the MAX485E, five volt, with ESD and TVS protection " +
  "on the A and B lines. It's for Arduino and Raspberry Pi people doing Modbus. Two-layer board, about " +
  "forty-two by twenty-two millimetres. I want to sell it around twenty dollars and I'm shipping from the US.";

const EXTRACTED: { field: string; value: string; from: string; confidence: number }[] = [
  { field: "Title", value: "Industrial RS485 ↔ TTL Module (MAX485E)", from: "voice", confidence: 0.94 },
  { field: "Main IC", value: "MAX485E", from: "voice + schematic", confidence: 0.99 },
  { field: "Input voltage", value: "5 V", from: "voice", confidence: 0.96 },
  { field: "Protection", value: "ESD + TVS on A/B", from: "voice + BOM D1/D5", confidence: 0.91 },
  { field: "Use case", value: "Arduino / Raspberry Pi · Modbus", from: "voice", confidence: 0.88 },
  { field: "Board size", value: "42 × 22 mm, 2-layer", from: "voice + PCB", confidence: 0.97 },
  { field: "Suggested price", value: "$19.99", from: "voice + benchmark", confidence: 0.72 },
  { field: "Ship-from region", value: "United States → Stripe corridor", from: "voice", confidence: 0.99 },
];

type Phase = "idle" | "recording" | "transcribing" | "done";

export default function VoiceCapture({ onExtract }: { onExtract?: () => void }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [bars, setBars] = useState<number[]>(Array(24).fill(6));
  const [secs, setSecs] = useState(0);
  const [typed, setTyped] = useState("");
  const timers = useRef<ReturnType<typeof setInterval>[]>([]);

  useEffect(() => () => timers.current.forEach(clearInterval), []);

  function stopTimers() {
    timers.current.forEach(clearInterval);
    timers.current = [];
  }

  function toggle() {
    if (phase === "recording") {
      stopTimers();
      setBars(Array(24).fill(6));
      setPhase("transcribing");
      // Stream the transcript in, the way a real STT stream would arrive.
      let i = 0;
      const t = setInterval(() => {
        i += 4;
        setTyped(TRANSCRIPT.slice(0, i));
        if (i >= TRANSCRIPT.length) {
          clearInterval(t);
          setPhase("done");
          onExtract?.();
        }
      }, 18);
      timers.current.push(t);
      return;
    }
    if (phase !== "idle") {
      // reset
      stopTimers();
      setPhase("idle");
      setTyped("");
      setSecs(0);
      return;
    }
    setPhase("recording");
    setSecs(0);
    const wave = setInterval(() => setBars(Array.from({ length: 24 }, () => 4 + Math.random() * 24)), 110);
    const clock = setInterval(() => setSecs((s) => s + 1), 1000);
    timers.current.push(wave, clock);
  }

  const label =
    phase === "recording"
      ? `Recording… ${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")} — tap to stop`
      : phase === "transcribing"
      ? "Transcribing…"
      : phase === "done"
      ? "Transcribed — tap to record again"
      : "Tap to describe this board out loud";

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        className={`w-full flex items-center gap-4 border rounded-lg px-4 py-3.5 text-left transition ${
          phase === "recording" ? "border-cta bg-orange-50" : "border-line hover:border-cta bg-white"
        }`}
      >
        <span
          className={`w-11 h-11 rounded-full bg-cta text-white flex items-center justify-center text-lg shrink-0 ${
            phase === "recording" ? "animate-pulse" : ""
          }`}
          aria-hidden
        >
          🎤
        </span>
        <span className="flex items-end gap-[3px] h-8 flex-1" aria-hidden>
          {bars.map((h, i) => (
            <i
              key={i}
              className={`w-[3px] rounded-full block transition-[height] duration-100 ${
                phase === "recording" ? "bg-cta" : "bg-line"
              }`}
              style={{ height: h }}
            />
          ))}
        </span>
        <span className="text-xs text-muted shrink-0 w-48 text-right">{label}</span>
      </button>

      {(phase === "transcribing" || phase === "done") && (
        <div className="mt-3 rounded-lg border border-line bg-panel p-3">
          <div className="text-[11px] uppercase tracking-wide text-muted font-semibold mb-1">Transcript</div>
          <p className="text-sm text-slate leading-relaxed">
            {typed}
            {phase === "transcribing" && <span className="inline-block w-1.5 h-4 bg-teal align-middle ml-0.5 animate-pulse" />}
          </p>
        </div>
      )}

      {phase === "done" && (
        <div className="mt-3 rounded-lg border border-teal/40 bg-teal-light/40 overflow-hidden">
          <div className="px-3 py-2 text-xs font-semibold text-teal-dark border-b border-teal/20 flex items-center gap-2">
            <span>✦</span> Fields extracted from speech — every value is traceable to its source
          </div>
          <table className="w-full text-sm">
            <tbody>
              {EXTRACTED.map((e) => (
                <tr key={e.field} className="border-b border-teal/10 last:border-0">
                  <td className="px-3 py-1.5 text-muted w-36">{e.field}</td>
                  <td className="px-3 py-1.5 font-medium text-navy">{e.value}</td>
                  <td className="px-3 py-1.5 text-xs text-muted font-mono">{e.from}</td>
                  <td className="px-3 py-1.5 text-right">
                    <span
                      className={`t-tag ${
                        e.confidence >= 0.9
                          ? "bg-emerald-100 text-emerald-700"
                          : e.confidence >= 0.8
                          ? "bg-amber-100 text-amber-800"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {(e.confidence * 100).toFixed(0)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-3 py-2 text-[11px] text-teal-dark/80 bg-white/50 border-t border-teal/20">
            Anything below 80% confidence is surfaced for the seller to confirm rather than silently published. Voice is
            an <strong>input method</strong>, not an authority — parsed design files always win a conflict.
          </div>
        </div>
      )}
    </div>
  );
}
