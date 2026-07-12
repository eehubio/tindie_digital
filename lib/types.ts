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

export interface LicenseOffer {
  id: string;
  kind: LicenseKind;
  name: string;
  price: number; // USD
  blurb: string;
  unitLimit?: number | null; // commercial unit cap; null = unlimited
  updatePolicy: "current_version_only" | "minor_updates" | "all_updates_for_period" | "lifetime_updates";
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

export interface DigitalProduct {
  id: string;
  slug: string;
  title: string;
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
  featured: boolean;
  strategic: boolean; // strategic partner weighting
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
}

export interface Entitlement {
  id: string;
  productId: string;
  productTitle: string;
  licenseName: string;
  grantedAt: string;
  downloadLimit: number;
  downloadCount: number;
  version: string;
  status: "active" | "suspended" | "revoked" | "refunded";
}

// Platform-level config (would live in DB / admin panel — never in frontend consts)
export interface PaymentConfig {
  digitalMinimumWithoutFee: number;
  smallOrderFee: number;
  minimumDigitalPrice: number;
  stripeFixedFee: number;
  stripePercent: number; // 0..1
  platformFeePercent: number; // 0..1 on digital
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
