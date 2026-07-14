// ============================================================================
// Repository layer.
//
// Pages must not `import { partners } from "@/lib/mock"`. That import is the
// thing that makes a mock prototype expensive to convert: every page becomes a
// call site that knows where data lives. Here, each repository is an interface
// with a Mock implementation today and an Api implementation later; swapping is
// one line in `repos`, not a grep across the app.
//
// This is also where the buyer/admin visibility boundary is enforced — a page
// cannot accidentally ask for draft partners, because the buyer-facing method
// does not offer them.
// ============================================================================

import { DigitalProduct, ServicePartner, Entitlement } from "../types";
import { products as mockProducts, partners as mockPartners, seedEntitlements } from "../mock";
import { isBuyerVisible } from "../engine";

export interface ProductRepository {
  list(): Promise<DigitalProduct[]>;
  bySlug(slug: string): Promise<DigitalProduct | null>;
}

export interface PartnerRepository {
  /** Buyer-facing. Operationally-unready partners are filtered out here, once. */
  listBuyerVisible(): Promise<ServicePartner[]>;
  /** Admin-facing. Everything, including draft. */
  listAll(): Promise<ServicePartner[]>;
}

export interface EntitlementRepository {
  listForBuyer(): Promise<Entitlement[]>;
  forProduct(productId: string): Promise<Entitlement | null>;
}

class MockProductRepository implements ProductRepository {
  async list() {
    return mockProducts;
  }
  async bySlug(slug: string) {
    return mockProducts.find((p) => p.slug === slug) ?? null;
  }
}

class MockPartnerRepository implements PartnerRepository {
  async listBuyerVisible() {
    return mockPartners.filter(isBuyerVisible);
  }
  async listAll() {
    return mockPartners;
  }
}

class MockEntitlementRepository implements EntitlementRepository {
  async listForBuyer() {
    return seedEntitlements;
  }
  async forProduct(productId: string) {
    return seedEntitlements.find((e) => e.productId === productId && e.status === "active") ?? null;
  }
}

// TODO(backend): ApiProductRepository etc. — same interfaces, fetch() inside.
// Switching is a change to this object only.
export const repos = {
  products: new MockProductRepository() as ProductRepository,
  partners: new MockPartnerRepository() as PartnerRepository,
  entitlements: new MockEntitlementRepository() as EntitlementRepository,
};
