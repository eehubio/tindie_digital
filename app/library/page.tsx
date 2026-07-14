"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";
import Link from "next/link";
import { versionsFor, canAccessVersion } from "@/lib/entitlements";
import { DownloadGrant } from "@/lib/types";

export default function LibraryPage() {
  const { entitlements, requestDownload, revokeEntitlement } = useApp();
  const [lastGrant, setLastGrant] = useState<Record<string, DownloadGrant>>({});

  return (
    <div>
      <h1 className="text-xl font-bold text-navy mb-1">My Library</h1>
      <p className="text-sm text-muted mb-5 max-w-3xl">
        Downloads are not a button that counts up. Each one asks the backend for a <strong>grant</strong>, which can be
        refused — limit reached, licence revoked, refund issued, version withdrawn, or a version your update policy does
        not cover. A granted download returns a single-use, short-lived signed URL, never a bucket path.
      </p>

      {entitlements.length === 0 ? (
        <div className="t-card p-10 text-center text-muted">
          Nothing here yet. Purchased designs and licences appear here with download access.
        </div>
      ) : (
        <div className="space-y-3">
          {entitlements.map((e) => {
            const versions = versionsFor(e.productId);
            const purchased = versions.find((v) => v.id === e.purchasedVersionId);
            const grant = lastGrant[e.id];

            return (
              <div key={e.id} className="t-card p-4 bg-white">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-navy">{e.productTitle}</h3>
                    <p className="text-sm text-muted mt-1">
                      {e.licenseName} · bought v{purchased?.semver ?? "?"} · granted {e.grantedAt}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs flex-wrap">
                      <span
                        className={`t-tag ${
                          e.status === "active" ? "bg-teal-light text-teal-dark" : "bg-red-100 text-red-700"
                        }`}
                      >
                        {e.status}
                      </span>
                      <span className="text-muted">
                        Downloads {e.downloadCount}/{e.downloadLimit}
                      </span>
                      <span className="t-tag bg-panel text-slate">{e.updatePolicy.replace(/_/g, " ")}</span>
                      <span className="text-muted">
                        Commercial units {e.commercialUnitsUsed}/{e.rights.commercialUnits}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <Link
                      href={`/dispute?product=${encodeURIComponent(e.productTitle)}`}
                      className="text-xs text-link hover:underline text-center"
                    >
                      Report an issue
                    </Link>
                    {e.status === "active" && (
                      <button
                        className="text-xs text-danger hover:underline"
                        onClick={() => revokeEntitlement(e.id)}
                        title="Demo: simulate what a refund does to this licence"
                      >
                        Simulate refund
                      </button>
                    )}
                  </div>
                </div>

                {/* Versions — access is per-version, decided by the update policy */}
                <div className="mt-4 pt-3 border-t border-line">
                  <div className="text-xs font-semibold text-navy uppercase tracking-wide mb-2">Versions</div>
                  <div className="space-y-2">
                    {versions.map((v) => {
                      const allowed = canAccessVersion(e, v);
                      const isPurchased = v.id === e.purchasedVersionId;
                      return (
                        <div
                          key={v.id}
                          className="flex items-center gap-3 border border-line rounded-lg px-3 py-2 text-sm"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-navy">v{v.semver}</span>
                              {isPurchased && <span className="t-tag bg-teal-light text-teal-dark">purchased</span>}
                              {v.status !== "published" && (
                                <span className="t-tag bg-red-100 text-red-700">{v.status.replace(/_/g, " ")}</span>
                              )}
                              <span className="t-tag bg-panel text-slate">
                                cert L{v.certifiedLevel} · DRC {v.validation.drc}
                                {v.validation.fabricated ? " · fabricated" : ""}
                              </span>
                            </div>
                            <p className="text-xs text-muted mt-0.5 truncate">{v.changelog}</p>
                          </div>
                          <button
                            className={allowed ? "t-btn-primary" : "t-btn-ghost"}
                            onClick={() => {
                              const g = requestDownload(e.id, v.id);
                              setLastGrant((m) => ({ ...m, [e.id]: g }));
                            }}
                          >
                            {allowed ? "Download" : "Try anyway"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {grant && (
                  <div
                    className={`mt-3 rounded-md px-3 py-2 text-xs ${
                      grant.ok
                        ? "bg-teal-light border border-teal/30 text-teal-dark"
                        : "bg-red-50 border border-red-200 text-red-700"
                    }`}
                  >
                    {grant.ok ? (
                      <>
                        <strong>Grant issued.</strong> Single-use signed URL, expires in {grant.expiresInSec}s:
                        <div className="font-mono text-[10px] mt-1 break-all opacity-80">{grant.url}</div>
                      </>
                    ) : (
                      <>
                        <strong>Refused ({grant.reason?.replace(/_/g, " ")}).</strong> {grant.message}
                      </>
                    )}
                  </div>
                )}

                <div className="mt-3 pt-3 border-t border-line text-xs text-muted leading-relaxed">
                  The bundle carries <span className="font-mono">TINDIE-LICENSE.txt</span> and{" "}
                  <span className="font-mono">PURCHASE-CERTIFICATE.json</span> (order ID, buyer reference, file hashes,
                  licence type), plus a per-entitlement fingerprint. Terms hash{" "}
                  <span className="font-mono">{e.licenseSnapshotHash}</span> — the seller cannot retroactively change
                  what you agreed to.
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
