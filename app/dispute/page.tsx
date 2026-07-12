"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { DisputeType } from "@/lib/types";

const TYPES: { key: DisputeType; label: string }[] = [
  { key: "download_failed", label: "Download failed" },
  { key: "corrupted_file", label: "Corrupted file" },
  { key: "missing_files", label: "Missing files" },
  { key: "incompatible_version", label: "Incompatible KiCad version" },
  { key: "materially_not_as_described", label: "Not as described" },
  { key: "license_issue", label: "License issue" },
  { key: "ip_infringement", label: "IP infringement" },
];

function DisputeForm() {
  const params = useSearchParams();
  const router = useRouter();
  const { addDispute } = useApp();
  const product = params.get("product") ?? "";
  const [type, setType] = useState<DisputeType>("missing_files");
  const [body, setBody] = useState("");

  function submit() {
    addDispute({
      id: "ds_" + Math.random().toString(36).slice(2, 7),
      productTitle: product || "Unknown design",
      buyerName: "You (demo)",
      sellerName: "Seller",
      type,
      status: "reported",
      openedAt: new Date().toISOString().slice(0, 10),
      messages: [{ from: "buyer", at: new Date().toISOString().slice(0, 16), body: body || "(no details)" }],
    });
    router.push("/library");
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-navy mb-1">Report an issue</h1>
      <p className="text-muted text-sm mb-5">
        Digital disputes run through diagnostics → seller response → repair → mediation. Automatic evidence (version,
        download log, file hashes) is attached for you.
      </p>

      <div className="t-card p-5 space-y-4 bg-white">
        <div>
          <label className="t-label">Design</label>
          <input className="t-input" value={product} readOnly />
        </div>
        <div>
          <label className="t-label">What went wrong?</label>
          <div className="grid grid-cols-2 gap-2">
            {TYPES.map((t) => (
              <button
                key={t.key}
                onClick={() => setType(t.key)}
                className={`text-left px-3 py-2 rounded-md text-sm border transition ${
                  type === t.key ? "border-teal bg-teal-light/40 text-teal-dark font-semibold" : "border-line hover:border-teal/50"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="t-label">Details</label>
          <textarea
            className="t-input min-h-[120px]"
            placeholder="Describe the problem. The download log and file hashes are attached automatically."
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>

        <div className="rounded-md bg-panel p-3 text-xs text-muted">
          <strong className="text-slate">Auto-attached evidence:</strong> product snapshot, purchased version,
          license, download timestamps, and stored SHA-256 hashes — so the seller and Tindie can verify claims quickly.
        </div>

        <div className="flex gap-2">
          <button className="t-btn-primary" onClick={submit}>Open dispute</button>
          <button className="t-btn-ghost" onClick={() => router.back()}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function DisputePage() {
  return (
    <Suspense fallback={<div className="text-muted">Loading…</div>}>
      <DisputeForm />
    </Suspense>
  );
}
