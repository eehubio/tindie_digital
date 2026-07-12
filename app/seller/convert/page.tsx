"use client";

import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import NetIncomeCalculator from "@/components/NetIncomeCalculator";
import Link from "next/link";

export default function Convert() {
  const router = useRouter();
  const { showToast, shipProfile } = useApp();
  return (
    <div className="max-w-3xl mx-auto">
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

      {/* Going physical changes the economics completely — show that before they commit. */}
      <div className="mt-6">
        <h2 className="font-bold text-navy mb-1">Check the economics before you commit</h2>
        <p className="text-sm text-muted mb-3">
          A digital licence has no unit cost and no label. A physical board has both, plus customs. Model the real
          margin here — the shipping rates come from your{" "}
          <Link href="/seller/shipping" className="text-link hover:underline">
            shipping profile
          </Link>
          , so this is the number you will actually see.
        </p>
        <NetIncomeCalculator kind="physical" initialPrice={19.99} profile={shipProfile} />
      </div>
    </div>
  );
}
