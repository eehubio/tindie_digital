// ============================================================================
// Real database schema (Drizzle + Neon Postgres).
//
// The prototype runs on two storage layers:
//   1. localStorage (zustand persist) — the zero-config demo "database".
//      Deploy to Vercel with no env vars and everything still works.
//   2. THIS — a real Postgres schema, activated by setting DATABASE_URL
//      (a Neon connection string). The API routes below fall back to mock
//      data when it is absent, so the same build serves both modes.
//
// Push the schema with:  npx drizzle-kit push  (config in drizzle.config.ts)
// ============================================================================

import { pgTable, text, integer, real, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";

export const products = pgTable("products", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  productType: text("product_type").notNull(), // digital | physical | bundle
  tagline: text("tagline").notNull().default(""),
  category: text("category").notNull(),
  sellerId: text("seller_id").notNull(),
  sellerName: text("seller_name").notNull(),
  sellerCountry: text("seller_country").notNull().default("US"),
  // Physical/bundle commerce — the fields the buyer must see
  price: real("price"),
  stock: integer("stock"),
  weightG: integer("weight_g"),
  dimensionsMm: text("dimensions_mm"),
  shipProfileId: text("ship_profile_id"),
  handlingDays: text("handling_days"),
  preorderCampaignSlug: text("preorder_campaign_slug"),
  // Digital
  kicadVersion: text("kicad_version").default("—"),
  verifyLevel: integer("verify_level").notNull().default(0),
  verifiedVersion: text("verified_version"),
  // Everything structural rides as JSON — same shape as lib/types.ts
  licenses: jsonb("licenses").notNull().default([]),
  bom: jsonb("bom").notNull().default([]),
  files: jsonb("files").notNull().default([]),
  heroThumb: text("hero_thumb").notNull().default("from-slate-600 to-slate-900"),
  makeEnabled: boolean("make_enabled").notNull().default(false),
  rating: real("rating").notNull().default(0),
  reviewCount: integer("review_count").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const productQuestions = pgTable("product_questions", {
  id: text("id").primaryKey(),
  productId: text("product_id").notNull(),
  askedBy: text("asked_by").notNull(),
  askedAt: timestamp("asked_at").notNull().defaultNow(),
  question: text("question").notNull(),
  answer: text("answer"),
  answeredAt: timestamp("answered_at"),
});

export const versionNotes = pgTable("version_notes", {
  id: text("id").primaryKey(),
  productId: text("product_id").notNull(),
  semver: text("semver").notNull(),
  note: text("note").notNull(),
  postedAt: timestamp("posted_at").notNull().defaultNow(),
});

export const shipProfiles = pgTable("ship_profiles", {
  id: text("id").primaryKey(),
  sellerId: text("seller_id").notNull(),
  name: text("name").notNull(),
  payload: jsonb("payload").notNull(), // the ShipProfile object
});
