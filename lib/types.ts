// ============================================================================
// Tindie Design & Manufacturing Marketplace — shared domain types
// These mirror the future backend (FastAPI / DRF) contract so the frontend
// can be wired to a real API later with minimal change.
// ============================================================================

export type Role = "buyer" | "seller" | "partner" | "admin";

export type ProductType =
  | "physical"
  | "digital_asset"
  | "physical_digital_bundle"
  | "professional_service"
  | "manufacturing_service";

export type DigitalAssetCategory =
  | "kicad_full_project"
  | "schematic"
  | "pcb_layout"
  | "symbol_library"
  | "footprint_library"
  | "3d_model"
  | "gerber_package"
  | "bom"
  | "complete_design" // physical or bundle listings
  | "firmware"
  | "mechanical_design"
  | "test_fixture"
  | "reference_design"
  | "course_project";

export type VerifyLevel = 0 | 1 | 2 | 3; // 0 none, 1 file, 2 mfg-ready, 3 pro-review

export type LicenseKind =
  | "personal"
  | "educational"
  | "commercial_limited"
  | "unlimited_commercial"
  | "open_source"
  | "custom";

export interface ManufacturingRights {
  /** Units the buyer may have built for personal, non-resale use. */
  personalUnits: number;
  /** Units the buyer may have built for sale. 0 = commercial manufacturing not licensed. */
  commercialUnits: number;
  /** May a Tindie manufacturing partner receive the fabrication outputs at all? */
  partnerManufacturingAllowed: boolean;
  /** Does the partner receive editable sources, or only Gerber/drill/CPL? */
  sourceFilesIncluded: boolean;
}

export interface LicenseOffer {
  id: string;
  kind: LicenseKind;
  name: string;
  price: number; // USD
  blurb: string;
  unitLimit?: number | null; // commercial unit cap; null = unlimited
  updatePolicy: "current_version_only" | "minor_updates" | "all_updates_for_period" | "lifetime_updates";
  /** Manufacturing is a right granted by the licence, not a checkout option. */
  manufacturingRights: ManufacturingRights;
}

export interface BomLine {
  refdes: string;
  mpn: string;
  manufacturer: string;
  value: string;
  package: string;
  qty: number;
  confidence: number; // 0..1 match confidence
  needsReview?: boolean;
}

export interface AssetFile {
  path: string;
  type: string;
  sizeKb: number;
  sha256: string;
}

export type ParseStep =
  | "structure"
  | "kicad_version"
  | "schematic"
  | "pcb"
  | "preview_3d"
  | "bom"
  | "components";

export type ListedProductType = "digital" | "physical" | "bundle";

export interface ProductQuestion {
  id: string;
  productId: string;
  askedBy: string;
  askedAt: string;
  question: string;
  answer?: string;
  answeredAt?: string;
}

/** A version note the seller adds AFTER publishing — updates are part of the product's life. */
export interface VersionNote {
  id: string;
  productId: string;
  semver: string;
  note: string;
  postedAt: string;
}

export interface SellerApplication {
  id: string;
  storeName: string;
  applicantName: string;
  country: string;
  productsPlanned: string;
  corridor: "stripe" | "wise";
  appliedAt: string;
  status: "pending" | "approved" | "rejected";
  decisionReason?: string;
}

export interface ProductSubmission {
  id: string;
  productTitle: string;
  sellerName: string;
  productType: ListedProductType;
  submittedAt: string;
  ipDeclared: boolean;
  filesOk: boolean;
  status: "pending" | "approved" | "rejected";
  decisionReason?: string;
}

export interface DigitalProduct {
  id: string;
  slug: string;
  title: string;
  /** digital = files only · physical = shipped goods · bundle = both */
  productType: ListedProductType;
  /** Physical/bundle commerce — what the seller sets in the back office and the buyer must SEE on the front. */
  price?: number;
  stock?: number;
  weightG?: number;
  dimensionsMm?: string;
  shipProfileId?: string;
  handlingDays?: string;
  /** Links a listing to a preorder campaign (stock can be 0 while preorder runs). */
  preorderCampaignSlug?: string;
  tagline: string;
  category: DigitalAssetCategory;
  sellerId: string;
  sellerName: string;
  sellerCountry: string;
  kicadVersion: string;
  verifyLevel: VerifyLevel;
  verifiedVersion?: string;
  reviewPartner?: string;
  downloads: number;
  timesManufactured: number;
  updatedAt: string;
  layers: number;
  sizeMm: string;
  heroThumb: string; // css gradient token, not a real image (prototype)
  licenses: LicenseOffer[];
  bom: BomLine[];
  files: AssetFile[];
  makeEnabled: boolean; // "Make It" services turned on by seller
  allowFullFileToPartner: boolean;
  rating: number;
  reviewCount: number;
  supportResponse: string;
}

// ---------------------------------------------------------------------------
// Partner network — fully data-driven, never hardcoded in components
// ---------------------------------------------------------------------------
export type PartnerType =
  | "design_service"
  | "design_review"
  | "pcb_manufacturer"
  | "pcb_assembly"
  | "component_sourcing"
  | "mechanical_manufacturing"
  | "testing_service"
  | "certification_service"
  | "warehousing"
  | "fulfillment"
  | "local_support";

export type QuoteMode =
  | "external_link"
  | "email_request"
  | "manual_quote"
  | "api_quote"
  | "instant_checkout";

export type CommissionModel =
  | "referral"
  | "percentage"
  | "fixed_fee"
  | "revenue_share"
  | "platform_checkout";

export interface ServicePartner {
  id: string;
  name: string;
  slug: string;
  logoToken: string; // color token for prototype logo block
  description: string;
  partnerTypes: PartnerType[];
  headquartersCountry: string;
  serviceCountries: string[]; // ISO or "GLOBAL"
  shippingCountries: string[];
  languages: string[];
  minLeadDays: number;
  maxLeadDays: number;
  fromPricePcb?: number;
  fromPriceAssembly?: number;
  quoteMode: QuoteMode;
  commissionModel: CommissionModel;
  commissionRate?: number; // 0..1
  rating: number;
  completedOrders: number;
  disputeRate: number; // 0..1
  onTimeRate: number; // 0..1
  status: "draft" | "active" | "suspended" | "restricted";

  // ---- Hard capability constraints. Used for ELIGIBILITY, not for scoring.
  // A partner that cannot make a 6-layer board must not appear at all for a
  // 6-layer job, however good its rating is.
  maxLayers: number;
  materials: string[]; // "FR-4", "Rogers", "Aluminium", "Flex"
  minTraceMm: number; // finest trace/space it can hold
  minQty: number;
  maxQty: number;
  currencies: string[];
  packages: string[]; // "0201", "BGA", "QFN", "THT"

  // ---- Operational readiness. "Active" in a database is not the same thing as
  // "safe to send a paying buyer to". All of these must hold.
  contractStatus: "none" | "negotiating" | "signed";
  ndaStatus: "none" | "signed";
  dataProcessingAgreement: "none" | "signed";
  payoutReady: boolean;
  apiHealth: "healthy" | "degraded" | "down" | "not_integrated";
  acceptingNewOrders: boolean;
  capacityStatus: "normal" | "constrained" | "full";
  lastCapabilityVerifiedAt: string;

  /**
   * Commercial relationship. DELIBERATELY NOT a scoring input — see
   * lib/engine.ts. It buys labelled placement, never a hidden ranking boost.
   */
  featured: boolean;
  strategic: boolean;
}

// ---------------------------------------------------------------------------
// Quotes & manufacturing
// ---------------------------------------------------------------------------
export type QuoteStatus =
  | "draft"
  | "submitted"
  | "partner_review"
  | "quoted"
  | "accepted"
  | "declined"
  | "expired"
  | "converted";

export interface QuoteRequest {
  id: string;
  buyerName: string;
  productId: string;
  productTitle: string;
  requestedServices: PartnerType[];
  quantity: number;
  destinationCountry: string;
  targetDate?: string;
  notes?: string;
  partnerId: string;
  partnerName: string;
  status: QuoteStatus;
  createdAt: string;
  quotedTotal?: number;
  leadTimeDays?: number;
}

export type MfgStatus =
  | "awaiting_files"
  | "in_review"
  | "in_production"
  | "quality_check"
  | "shipped"
  | "delivered";

export interface ManufacturingOrder {
  id: string;
  productTitle: string;
  partnerName: string;
  buyerName: string;
  quantity: number;
  total: number;
  status: MfgStatus;
  placedAt: string;
  timeline: { status: MfgStatus; at: string; note: string }[];
}

// ---------------------------------------------------------------------------
// Cart / entitlement / payment
// ---------------------------------------------------------------------------
export interface CartItem {
  key: string;
  productId: string;
  productTitle: string;
  productType: "digital" | "physical" | "service" | "manufacturing";
  fulfillmentType: "download" | "shipping" | "manual_delivery" | "partner_fulfillment";
  licenseId?: string;
  licenseName?: string;
  sellerName: string;
  unitPrice: number;
  qty: number;
  weightG?: number; // physical items only — drives the live shipping quote
}

/**
 * A published, immutable snapshot of a design. Files, BOM, previews and
 * validation belong to a VERSION, not to the product — otherwise you cannot
 * answer "the buyer owns 1.0, the seller published 1.1, 1.1 is uncertified and
 * 1.0 was found to infringe" without corrupting somebody's purchase.
 */
export interface AssetVersion {
  id: string;
  productId: string;
  semver: string;
  publishedAt: string;
  changelog: string;
  files: AssetFile[];
  bom: BomLine[];
  validation: { drc: "pass" | "fail" | "not_run"; erc: "pass" | "fail" | "not_run"; fabricated: boolean };
  certifiedLevel: 0 | 1 | 2 | 3;
  /** A version can be pulled without deleting it — buyers who own it keep it. */
  status: "published" | "deprecated" | "withdrawn_ip" | "withdrawn_defect";
  withdrawnReason?: string;
}

export interface Entitlement {
  id: string;
  productId: string;
  productTitle: string;
  licenseName: string;
  grantedAt: string;
  downloadLimit: number;
  downloadCount: number;
  status: "active" | "suspended" | "revoked" | "refunded";

  /** The version actually bought. Never mutated by a later seller upload. */
  purchasedVersionId: string;
  /** The newest version this entitlement's update policy lets the buyer reach. */
  latestAccessibleVersionId: string;
  updatePolicy: LicenseOffer["updatePolicy"];
  updateExpiresAt?: string;

  /** Licence limits, enforced at manufacture time, not at checkout. */
  rights: ManufacturingRights;
  commercialUnitsUsed: number;
  seats: number;

  /** Hash of the exact licence text shown at checkout — the seller cannot
   *  retroactively change the terms the buyer agreed to. */
  licenseSnapshotHash: string;
  termsAcceptedAt: string;
}

/** Result of asking the backend for a download. The BUTTON does not decide. */
export interface DownloadGrant {
  ok: boolean;
  /** Short-lived signed URL — issued by the backend, single use. */
  url?: string;
  expiresInSec?: number;
  reason?:
    | "entitlement_revoked"
    | "entitlement_refunded"
    | "download_limit_reached"
    | "version_withdrawn"
    | "not_entitled_to_version";
  message?: string;
}

// Platform-level config (would live in DB / admin panel — never in frontend consts)
/**
 * WHO PAYS THE PROCESSING FEE. This was previously undefined, which meant the
 * UI showed a Stripe fee that no line of the ledger ever absorbed — the money
 * simply vanished. Every mode below closes the books.
 */
export type ProcessingFeeAllocation =
  | "platform_absorbs" // platform eats it out of its commission
  | "seller_pays" // deducted from seller net (Tindie's classic behaviour)
  | "buyer_pays" // surcharged at checkout (illegal in some jurisdictions)
  | "shared"; // split 50/50 between seller and platform

export interface PaymentConfig {
  /** Who absorbs the Stripe fee. Without this the ledger does not balance. */
  feeAllocation: ProcessingFeeAllocation;
  /** Sales tax / VAT rate applied to goods (0 when not collected). */
  taxRate: number;
  /** Services are quoted work, not instant downloads — priced and refunded separately. */
  servicePlatformFeePercent: number;
  digitalMinimumWithoutFee: number;
  smallOrderFee: number;
  minimumDigitalPrice: number;
  stripeFixedFee: number;
  stripePercent: number; // 0..1
  platformFeePercent: number; // 0..1 on digital
  platformFeePercentPhysical: number; // 0..1 on physical goods
}

// ---------------------------------------------------------------------------
// Disputes & IP
// ---------------------------------------------------------------------------
export type DisputeType =
  | "download_failed"
  | "corrupted_file"
  | "missing_files"
  | "incompatible_version"
  | "materially_not_as_described"
  | "license_issue"
  | "unauthorized_charge"
  | "ip_infringement";

export type DisputeStatus =
  | "reported"
  | "seller_response"
  | "repair_offered"
  | "buyer_confirm"
  | "mediation"
  | "resolved_refund"
  | "resolved_partial"
  | "resolved_rejected";

export interface Dispute {
  id: string;
  productTitle: string;
  buyerName: string;
  sellerName: string;
  type: DisputeType;
  status: DisputeStatus;
  openedAt: string;
  messages: { from: Role; at: string; body: string }[];
}

export interface IpComplaint {
  id: string;
  productTitle: string;
  complainant: string;
  rightsHolder: string;
  basis: string;
  status: "submitted" | "under_review" | "listing_restricted" | "counter_filed" | "removed" | "dismissed";
  filedAt: string;
}
