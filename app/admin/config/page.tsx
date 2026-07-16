"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PartnersPage from "@/components/admin/Partners";
import IPPage from "@/components/admin/IP";
import PaymentsPage from "@/components/admin/Payments";
import LogisticsPage from "@/components/admin/Logistics";

/**
 * Admin Configuration hub — Partners, IP Complaints, Payments and Logistics
 * merged. This is where the platform's DATA-NOT-CODE rule lives (§0.2 of the
 * spec): fee modes, reserve ratios, partner records, logistics providers —
 * every one of them a row an admin edits with an audit trail, never a deploy.
 */
const TABS = [
  { key: "payments", label: "Payments", hint: "fees & reserves" },
  { key: "logistics", label: "Logistics", hint: "providers" },
  { key: "partners", label: "Partners", hint: "network" },
  { key: "ip", label: "IP Complaints", hint: "takedowns" },
] as const;

function ConfigInner() {
  const router = useRouter();
  const tab = useSearchParams().get("tab") ?? "payments";
  return (
    <div>
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-line mb-6 -mx-1 px-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => router.replace(`/admin/config?tab=${t.key}`, { scroll: false })}
            className={`px-4 py-2.5 text-sm whitespace-nowrap border-b-2 -mb-px transition ${
              tab === t.key ? "border-teal text-teal-dark font-semibold" : "border-transparent text-slate hover:text-navy"
            }`}
          >
            {t.label}
            <span className="hidden md:inline text-xs text-muted font-normal ml-1.5">· {t.hint}</span>
          </button>
        ))}
      </div>
      {tab === "payments" && <PaymentsPage />}
      {tab === "logistics" && <LogisticsPage />}
      {tab === "partners" && <PartnersPage />}
      {tab === "ip" && <IPPage />}
    </div>
  );
}

export default function AdminConfigPage() {
  return (
    <Suspense fallback={null}>
      <ConfigInner />
    </Suspense>
  );
}
