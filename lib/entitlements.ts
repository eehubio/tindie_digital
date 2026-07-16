// ============================================================================
// Entitlements, versions and download grants.
//
// The previous model did this:
//     downloadCount = Math.min(downloadCount + 1, downloadLimit)
// which saturates the counter at the limit and then cheerfully says "Download
// started" forever. It was a progress bar, not a control.
//
// The rule this file encodes: THE BUTTON DOES NOT DECIDE. Every download asks
// for a grant, the grant can be refused, and the refusal has a reason the buyer
// can read. In production the same function runs server-side as an atomic
// transaction that issues a short-lived signed URL — the client-side version
// below is the same state machine so the contract cannot drift.
// ============================================================================

import { Entitlement, AssetVersion, DownloadGrant } from "./types";

export const seedAssetVersions: AssetVersion[] = [
  {
    id: "av_bundle_100",
    productId: "dp_pocket_bundle",
    semver: "1.0.0",
    publishedAt: "2026-06-28",
    changelog: "Kit sources: schematics, PCB, firmware 1.2, assembly guide.",
    files: [],
    bom: [],
    validation: { drc: "pass", erc: "pass", fabricated: true },
    certifiedLevel: 2,
    status: "published",
  },
  {
    id: "av_rp2350_100",
    productId: "dp_rp2350",
    semver: "1.0.0",
    publishedAt: "2026-04-02",
    changelog: "First public release.",
    files: [],
    bom: [],
    validation: { drc: "pass", erc: "pass", fabricated: true },
    certifiedLevel: 3,
    status: "published",
  },
  {
    id: "av_rp2350_110",
    productId: "dp_rp2350",
    semver: "1.1.0",
    publishedAt: "2026-07-08",
    changelog: "USB-C CC resistors corrected; silkscreen cleanup; new 3D models.",
    files: [],
    bom: [],
    validation: { drc: "pass", erc: "pass", fabricated: false },
    certifiedLevel: 1,
    status: "published",
  },
];

export function versionsFor(productId: string) {
  return seedAssetVersions.filter((v) => v.productId === productId);
}

/**
 * Can this entitlement reach that version? An update policy is a promise made
 * at checkout; a later upload by the seller does not silently rewrite it.
 */
export function canAccessVersion(e: Entitlement, v: AssetVersion, today = new Date()): boolean {
  if (v.productId !== e.productId) return false;
  if (v.status === "withdrawn_ip") return false; // nobody, ever
  if (v.id === e.purchasedVersionId) return true; // you always keep what you bought

  switch (e.updatePolicy) {
    case "current_version_only":
      return false;
    case "minor_updates": {
      const bought = seedAssetVersions.find((x) => x.id === e.purchasedVersionId);
      if (!bought) return false;
      return major(v.semver) === major(bought.semver);
    }
    case "all_updates_for_period":
      return e.updateExpiresAt ? today <= new Date(e.updateExpiresAt) : false;
    case "lifetime_updates":
      return true;
  }
}

/**
 * The atomic check. Returns a grant or a refusal — never a silent success.
 * Order matters: revocation beats limits, and a withdrawn version beats both.
 */
export function requestDownload(
  e: Entitlement,
  versionId: string,
  versions: AssetVersion[] = seedAssetVersions
): DownloadGrant {
  if (e.status === "revoked")
    return {
      ok: false,
      reason: "entitlement_revoked",
      message: "This licence has been revoked. Existing download links no longer resolve.",
    };
  if (e.status === "refunded")
    return {
      ok: false,
      reason: "entitlement_refunded",
      message:
        "This purchase was refunded, so the licence was withdrawn. A refund cannot be used as a free download.",
    };

  const v = versions.find((x) => x.id === versionId);
  if (!v)
    return { ok: false, reason: "not_entitled_to_version", message: "That version does not exist." };

  if (v.status === "withdrawn_ip")
    return {
      ok: false,
      reason: "version_withdrawn",
      message:
        "This version was withdrawn following an IP complaint and cannot be served to anyone, including buyers.",
    };

  if (!canAccessVersion(e, v))
    return {
      ok: false,
      reason: "not_entitled_to_version",
      message: `Your licence covers ${e.updatePolicy.replace(/_/g, " ")}. Upgrade to reach this version.`,
    };

  if (e.downloadCount >= e.downloadLimit)
    return {
      ok: false,
      reason: "download_limit_reached",
      message: `Download limit reached (${e.downloadCount}/${e.downloadLimit}). Contact the seller to have it reset — the counter is enforced server-side, so opening more tabs will not help.`,
    };

  // Success: a single-use, short-lived URL. Not a bucket path.
  return {
    ok: true,
    url: `https://files.tindie.example/grant/${e.id}/${v.id}/${token()}?exp=300`,
    expiresInSec: 300,
  };
}

/** Refund → the licence dies with it. Called from the dispute console. */
export function revokeOnRefund(e: Entitlement): Entitlement {
  return { ...e, status: "refunded" };
}

/**
 * Manufacturing is a LICENCE right, not a checkout option. Checked at the
 * moment of ordering a build, against units already consumed.
 */
export interface RightsCheck {
  allowed: boolean;
  reason?: string;
  remainingCommercial: number;
  requiresUpgrade: boolean;
}

export function checkManufacturingRights(
  e: Entitlement | null,
  units: number,
  commercial: boolean
): RightsCheck {
  if (!e)
    return {
      allowed: false,
      reason: "You do not own a licence for this design. Manufacturing requires one.",
      remainingCommercial: 0,
      requiresUpgrade: true,
    };
  if (!e.rights.partnerManufacturingAllowed)
    return {
      allowed: false,
      reason: "This licence does not permit a manufacturing partner to receive the files at all.",
      remainingCommercial: 0,
      requiresUpgrade: true,
    };

  if (!commercial) {
    const ok = units <= e.rights.personalUnits;
    return {
      allowed: ok,
      reason: ok
        ? undefined
        : `Your licence permits ${e.rights.personalUnits} personal units. You selected ${units}.`,
      remainingCommercial: e.rights.commercialUnits - e.commercialUnitsUsed,
      requiresUpgrade: !ok,
    };
  }

  const remaining = e.rights.commercialUnits - e.commercialUnitsUsed;
  if (e.rights.commercialUnits === 0)
    return {
      allowed: false,
      reason: "Your licence is personal-use only. Building units for sale requires a commercial licence.",
      remainingCommercial: 0,
      requiresUpgrade: true,
    };
  const ok = units <= remaining;
  return {
    allowed: ok,
    reason: ok
      ? undefined
      : `You selected ${units} units. Your licence permits ${e.rights.commercialUnits} commercial units and ${e.commercialUnitsUsed} are already used — ${remaining} remain. Upgrade required.`,
    remainingCommercial: remaining,
    requiresUpgrade: !ok,
  };
}

function major(semver: string) {
  return semver.split(".")[0];
}
function token() {
  return Math.random().toString(36).slice(2, 12);
}
