"use client";

import { VerifyLevel } from "@/lib/types";
import { useApp } from "@/lib/store";
import { useEffect } from "react";

export function VerifyBadge({ level, version }: { level: VerifyLevel; version?: string }) {
  if (!level) return null;
  const map: Record<number, { label: string; cls: string }> = {
    1: { label: "File Verified", cls: "bg-teal-light text-teal-dark" },
    2: { label: "Manufacturing Ready", cls: "bg-blue-100 text-blue-700" },
    3: { label: "Professionally Reviewed", cls: "bg-emerald-100 text-emerald-700" },
  };
  const m = map[level];
  return (
    <span className={`t-tag ${m.cls} gap-1`}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 1l3 5 5 1-3.5 4 1 5.5L12 19l-5.5 2.5 1-5.5L4 7l5-1z" />
      </svg>
      {m.label}
      {level === 3 && version ? ` · v${version}` : ""}
    </span>
  );
}

export function Stars({ rating, count }: { rating: number; count?: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <span className="text-tag">
        {"★".repeat(Math.round(rating))}
        <span className="text-line">{"★".repeat(5 - Math.round(rating))}</span>
      </span>
      <span className="text-muted">
        {rating.toFixed(1)}
        {count != null ? ` (${count})` : ""}
      </span>
    </span>
  );
}

export function PartnerLogo({ token, size = 40 }: { token: string; size?: number }) {
  return (
    <div
      className={`rounded-md bg-gradient-to-br ${token} shrink-0`}
      style={{ width: size, height: size }}
      aria-hidden
    />
  );
}

export function Money({ v }: { v: number }) {
  return <span>${v.toFixed(2)}</span>;
}

export function Toast() {
  const { toast, showToast } = useApp();
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => showToast(null as unknown as string), 2200);
    return () => clearTimeout(t);
  }, [toast, showToast]);
  if (!toast) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-navy text-white text-sm px-4 py-2.5 rounded-lg shadow-lg">
      {toast}
    </div>
  );
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-line pb-2 mb-4">
      <h2 className="text-lg font-bold text-navy">{children}</h2>
      {right}
    </div>
  );
}
