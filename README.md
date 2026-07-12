# Tindie Design & Manufacturing Marketplace — Prototype

设计与制造市场原型 · Clickable prototype, Vercel-deployable.

A new Tindie module for selling **digital hardware design assets** (KiCad projects, libraries, reference designs) and routing buyers to **regional manufacturing partners**.

> **This is a prototype.** Mock data, no real payments, no real file parsing. Every flow is clickable end-to-end so the model can be validated before backend work starts.

---

## 1. Quick start / 快速开始

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # production build
```

**Deploy to Vercel:** push to GitHub → import the repo in Vercel → framework auto-detected (Next.js) → deploy. No environment variables required.

---

## 2. Architecture position / 架构定位

This is an **extension layer**, not a rewrite. The existing Tindie platform (Python / Django) stays the system of record for identity, sellers and physical commerce.

```
┌──────────────────────────────┐        ┌──────────────────────────────────┐
│  Tindie core (Django)        │        │  Design Marketplace (this app)   │
│  · accounts / auth           │◄──────►│  · digital asset catalog         │
│  · physical listings         │ OAuth  │  · license & entitlement engine  │
│  · orders / payouts          │ + JWT  │  · partner routing engine        │
│  · seller identity           │        │  · quote & manufacturing flow    │
└──────────────────────────────┘        └──────────────────────────────────┘
                                                     │
                                        ┌────────────┴────────────┐
                                        │  Partner network (API)  │
                                        │  Huaqiu · KiCad Svc ·   │
                                        │  future EU / US partners│
                                        └─────────────────────────┘
```

Key constraint honoured throughout: **partners, prices, commissions and routing weights are data, never hardcoded.** Adding a European PCB partner is a database row plus a status change in Admin → Partners. No code change.

The frontend calls a thin `lib/` layer (`mock.ts`, `engine.ts`) that mirrors the future backend contract in `lib/types.ts`, so swapping mock data for real API calls touches one layer.

---

## 3. The three hard problems / 三个核心问题

### 3.1 Stripe small-order economics — 小额支付经济性

**Problem.** A $5 asset carries a fixed **$0.30** Stripe fee + 2.9%. That is **~8.8% of the sale** before the platform earns anything. At $2 it is over 20%. The business is structurally unprofitable at the price points that make digital assets attractive.

**Solution — three configurable levers, all visible in the product:**

| Lever | Where to see it |
|---|---|
| **Minimum digital price** — blocks structurally unprofitable listings | Admin → Payments |
| **Small-order fee below a fee-free threshold** — charged to the buyer, seller keeps their headline price | Cart page (line item appears/disappears live) |
| **Consolidated cart checkout** — one Stripe charge per cart, so the fixed fee is amortised across all assets | Cart page + Admin → Payments simulator |

**Demo path:** add one $12 asset to the cart → no small-order fee. Remove it, add a single low-priced item → the fee line appears and the seller-economics panel shows the Stripe fee as a share of goods value. Then open **Admin → Payments**, drag the sliders, and set the small-order fee to $0 — the sweep table goes red: the platform loses money on every sale under ~$5. That is the point.

### 3.2 Dispute resolution — 纠纷处理

Digital goods cannot be returned, so the policy is **repair-first**, not refund-first:

1. Buyer reports a typed issue (missing files, corrupted, version incompatible, not as described…).
2. Seller gets a fixed window to repair — re-upload, supply the missing file, fix the version.
3. If unresolved, platform mediation with **auto-collected machine evidence**: download logs, SHA-256 integrity hashes at publish vs. delivery, version history, the license terms snapshot shown at checkout, seller response times.
4. A full refund **revokes the entitlement** and invalidates download tokens — a refund cannot be used as a free-download exploit.

Both sides are policed: repeat claimants and repeat-offending sellers are tracked.

**See:** `/dispute` (buyer report) and **Admin → Disputes** (mediation console with the evidence sidebar).

### 3.3 IP protection — 知识产权保护

No technical measure makes a design file uncopyable once delivered. The realistic goal is **traceability plus a credible enforcement path**:

- **Seller originality declaration** at publish, timestamped and bound to account identity.
- **Scoped file release** — buyers get only their license tier; **manufacturing partners receive only fabrication outputs** (Gerber / drill / pick-and-place) unless the seller explicitly opts in to releasing full sources.
- **Per-entitlement fingerprinting** — a leaked package traces back to the buying account.
- **Partner confidentiality** — files may be used only for the routed order.
- **Notice & counter-notice** — rights holders file; listings can be restricted pending review; sellers may counter-file.

**See:** seller wizard step 5 (Visibility) and step 8 (IP declaration), plus **Admin → IP Complaints**.

---

## 4. Walkthrough / 演示路径

Use the **"View as"** role switcher in the teal bar at the top of every page.

**Buyer**
1. `/` → `/search` → open **RP2350 Multi-function Pocket Instrument**
2. Product tabs: Design Preview (schematic / PCB / 3D mock viewers), Files & Versions, BOM, Licenses, **Make It**, Reviews
3. Pick a license → add to cart → `/cart` — inspect the payment breakdown and the seller-economics panel
4. Checkout → `/library` — download with limit tracking → report an issue → `/dispute`
5. Back on the product page, **Make It** → choose services + destination country → the routing engine ranks partners live with its reasons → request a quote
6. `/orders` — 6-step manufacturing tracker, "simulate next status"

**Seller**
- `/seller` dashboard → `/seller/new` — 8-step publish wizard (Type → Upload → **animated parsing** → Components → Visibility → Licenses → Manufacturing → Publish, with a pre-publish check and IP declaration)
- `/seller/convert` — turn a digital design into a physical Tindie listing
- `/seller/analytics`

**Partner** (Huaqiu view)
- `/partner/requests` — quote requests with an inline quote editor (PCB / assembly / components / shipping, lead time) → send quote
- `/partner/orders` — production queue, advance the state machine

**Admin**
- `/admin` — overview, with the small-order economics comparison front and centre
- `/admin/partners` — **the proof that nothing is hardcoded**: change status, commission model, commission rate, quote mode, strategic weighting
- `/admin/disputes` · `/admin/ip` · `/admin/payments`

---

## 5. Stack / 技术栈

Next.js 14 (App Router) · TypeScript · Tailwind CSS · Zustand. No backend, no database, no external services — deliberately, so the prototype deploys anywhere in one step.

Visual language deliberately matches the existing Tindie UI (navy `#1F2D3D` header, teal `#38B2AC` primary, orange `#EE7752` CTA, gray panels) rather than inventing a new identity — this is a module of Tindie, not a separate product.

---

## 6. Layout / 目录结构

```
app/
  page.tsx                 marketplace home
  search/                  browse + filters
  product/[slug]/          product detail (7 tabs) — the centrepiece
  cart/                    consolidated cart + payment breakdown
  library/                 entitlements + downloads
  orders/                  manufacturing order tracking
  dispute/                 buyer dispute report
  seller/                  dashboard · new (8-step wizard) · convert · analytics
  partner/                 dashboard · requests (quote editor) · orders (queue)
  admin/                   overview · partners · disputes · ip · payments
components/
  Shell.tsx                nav + role switcher
  Preview.tsx              schematic / PCB / 3D mock viewers
  MakeIt.tsx               live partner routing panel
  ProductCard.tsx, ui.tsx
lib/
  types.ts                 domain model — the future API contract
  mock.ts                  all seed data + platform payment config
  engine.ts                partner routing scorer + payment breakdown
  store.ts                 Zustand app state
```

---

## 7. Not in this phase / 本阶段不包含

Real Stripe integration · real KiCad file parsing · real partner APIs · authentication · database · AI-assisted routing (the Phase 1 scorer is rule-based and sufficient) · SmartList.
