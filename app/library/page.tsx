"use client";

import { useApp } from "@/lib/store";
import Link from "next/link";

export default function LibraryPage() {
  const { entitlements, recordDownload } = useApp();

  return (
    <div>
      <h1 className="text-xl font-bold text-navy mb-4">My Library</h1>
      {entitlements.length === 0 ? (
        <div className="t-card p-10 text-center text-muted">
          Nothing here yet. Purchased designs and licenses appear here with download access.
        </div>
      ) : (
        <div className="space-y-3">
          {entitlements.map((e) => {
            const exhausted = e.downloadCount >= e.downloadLimit;
            return (
              <div key={e.id} className="t-card p-4 bg-white">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h3 className="font-semibold text-navy">{e.productTitle}</h3>
                    <p className="text-sm text-muted mt-1">
                      {e.licenseName} · version {e.version} · granted {e.grantedAt}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs">
                      <span className={`t-tag ${e.status === "active" ? "bg-teal-light text-teal-dark" : "bg-panel text-muted"}`}>
                        {e.status}
                      </span>
                      <span className="text-muted">
                        Downloads used: {e.downloadCount}/{e.downloadLimit}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      className="t-btn-primary"
                      disabled={exhausted}
                      onClick={() => recordDownload(e.id)}
                    >
                      {exhausted ? "Limit reached" : "Download .zip"}
                    </button>
                    <Link href={`/dispute?product=${encodeURIComponent(e.productTitle)}`} className="text-xs text-link hover:underline text-center">
                      Report an issue
                    </Link>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-line text-xs text-muted">
                  Your download bundle includes <span className="font-mono">TINDIE-LICENSE.txt</span> and{" "}
                  <span className="font-mono">PURCHASE-CERTIFICATE.json</span> (order ID, buyer reference, file hashes,
                  license type). Copper and electrical layers are never modified.
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
