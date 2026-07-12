"use client";

import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";

export default function Convert() {
  const router = useRouter();
  const { showToast } = useApp();
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-navy mb-1">Create a physical product from this design</h1>
      <p className="text-muted text-sm mb-5">Turn a proven, manufactured design into a standard physical Tindie listing linked back to the digital source.</p>
      <div className="t-card p-5 space-y-4 bg-white">
        {[
          ["1", "Select a manufacturing partner", "Use a partner that has already produced this design."],
          ["2", "Produce a prototype or small batch", "Confirm the build before listing."],
          ["3", "Create a physical Tindie listing", "Pre-filled from the digital design's data."],
          ["4", "Link it to this digital design", "Buyers see both options on one page."],
        ].map(([n, t, d]) => (
          <div key={n} className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-teal text-white font-bold flex items-center justify-center text-sm shrink-0">{n}</div>
            <div><div className="font-semibold text-navy text-sm">{t}</div><div className="text-xs text-muted">{d}</div></div>
          </div>
        ))}
        <button className="t-btn-cta w-full" onClick={() => { showToast("Physical listing drafted (simulated)"); router.push("/seller"); }}>
          Draft physical listing
        </button>
      </div>
    </div>
  );
}
