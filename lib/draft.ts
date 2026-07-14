// ============================================================================
// The listing draft.
//
// A listing is a DOCUMENT with a lifecycle, not a sequence of screens. Keeping
// per-step useState meant: nothing survived a refresh, a seller who closed the
// tab during a two-minute file parse lost everything, no rule could be checked
// across steps, and "publish" was whatever the last screen happened to hold.
//
// Everything the wizard collects lands here, is autosaved, and is validated as
// a whole before publish. The backend re-validates the same object — the client
// is a convenience, never the authority.
// ============================================================================

export type DraftStatus = "draft" | "processing" | "ready" | "published";

export interface ValidationIssue {
  field: string;
  severity: "error" | "warning";
  message: string;
}

export interface ListingDraft {
  id: string;
  productType: "physical" | "digital" | "bundle" | "service" | "manufacturing";
  currentStep: string;
  status: DraftStatus;
  completedSteps: string[];
  dirtyFields: string[];
  lastSavedAt: string;

  // listing fields (the existing Tindie product-create schema)
  title: string;
  category: string;
  price: number;
  stock: number;
  description: string;
  tags: string;
  weightG: number;

  // digital-specific
  filesUploaded: string[];
  drc: "pass" | "fail" | "not_run";
  erc: "pass" | "fail" | "not_run";
  fabricated: boolean;
  bomMatchPct: number;
  licenseTiers: number;

  // commerce
  netIncomeChecked: boolean;
  shippingProfileBound: boolean;
  preorderEnabled: boolean;

  ipDeclared: boolean;
}

export function newDraft(): ListingDraft {
  return {
    id: "draft_" + Math.random().toString(36).slice(2, 8),
    productType: "physical",
    currentStep: "type",
    status: "draft",
    completedSteps: [],
    dirtyFields: [],
    lastSavedAt: new Date().toISOString(),
    title: "",
    category: "",
    price: 0,
    stock: 0,
    description: "",
    tags: "",
    weightG: 0,
    filesUploaded: [],
    drc: "not_run",
    erc: "not_run",
    fabricated: false,
    bomMatchPct: 0,
    licenseTiers: 0,
    netIncomeChecked: false,
    shippingProfileBound: false,
    preorderEnabled: false,
    ipDeclared: false,
  };
}

/**
 * Validation runs over the WHOLE draft, not per-screen. The seller can reach
 * publish from any path; only this decides whether they may leave it.
 */
export function validateDraft(d: ListingDraft): ValidationIssue[] {
  const out: ValidationIssue[] = [];
  const digitalish = d.productType === "digital" || d.productType === "bundle";
  const physicalish = d.productType === "physical" || d.productType === "bundle";

  if (!d.title.trim()) out.push({ field: "title", severity: "error", message: "A product name is required." });
  if (d.price <= 0) out.push({ field: "price", severity: "error", message: "A price is required." });
  if (!d.ipDeclared)
    out.push({ field: "ipDeclared", severity: "error", message: "The IP / originality declaration must be accepted." });

  if (digitalish) {
    if (d.filesUploaded.length === 0)
      out.push({ field: "files", severity: "error", message: "No design files uploaded." });
    if (d.drc === "fail")
      out.push({ field: "drc", severity: "error", message: "DRC is failing — a buyer cannot fabricate this." });
    if (d.drc === "not_run")
      out.push({ field: "drc", severity: "warning", message: "DRC has not been run. Buyers filter on this." });
    if (!d.fabricated)
      out.push({
        field: "fabricated",
        severity: "warning",
        message: "This design has never been fabricated. It will be listed at a lower verification level.",
      });
    if (d.bomMatchPct < 90)
      out.push({ field: "bom", severity: "warning", message: `BOM match is ${d.bomMatchPct}% — some parts are unresolved.` });
    if (d.licenseTiers === 0)
      out.push({ field: "licenses", severity: "error", message: "At least one licence tier is required." });
  }

  if (physicalish) {
    if (!d.shippingProfileBound)
      out.push({ field: "shipping", severity: "error", message: "No shipping profile bound to this listing." });
    if (d.stock <= 0 && !d.preorderEnabled)
      out.push({
        field: "stock",
        severity: "error",
        message: "Stock is zero and no preorder campaign is configured. Run a preorder rather than guessing a number.",
      });
  }

  if (!d.netIncomeChecked)
    out.push({
      field: "pricing",
      severity: "warning",
      message: "Net income has not been reviewed. Sellers who skip this are the ones who discover the fee stack after their first payout.",
    });

  return out;
}
