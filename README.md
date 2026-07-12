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

## 4. Merged from the Seller Console prototype / 并入的前期能力

Three capabilities proven in the earlier Seller Console prototype are now folded in — not copy-pasted as separate screens, but pulled down into **shared libraries** so digital assets, physical goods and manufactured boards all price and ship through one model.

### 4.1 SmartList — voice-to-listing / 语音上架

`components/VoiceCapture.tsx` · seller wizard, step 2 (Upload)

Many sellers can describe a board in twenty seconds but will abandon a thirty-field form. Record → live waveform → streaming transcription → **structured field extraction with per-field confidence and a source pointer** (voice / schematic / BOM / README).

Two design rules, both visible in the UI:
- Anything under **80% confidence** is surfaced for confirmation rather than silently published.
- Voice is an *input method*, not an authority — **parsed design files win any conflict** with what was said.

### 4.2 Net income calculator — dual payment corridor / 双通道净收入计算器

`lib/payments.ts` + `components/NetIncomeCalculator.tsx` · wizard step 7, `/seller/payouts`, `/seller/convert`

The seller picks a region and the **payment corridor follows from it**, because that is how the money actually moves:

| Corridor | Mechanism | Cost | Risk |
|---|---|---|---|
| **Stripe** (US/EU/UK/CA/AU) | destination charges — seller is merchant of record | 2.9% + $0.30, +1.5% cross-border, +1% FX | refunds debit the seller; platform carries no negative-balance liability |
| **Wise** (CN/IN/elsewhere) | payout + FX | 0.75% + $0.60 payout, 0.5% FX loss | **funds are irrecoverable once disbursed** → higher reserve ratio, longer hold |

The output is an itemised stack — buyer pays → platform fee → payment cost → shipping cost → **seller net**, with a margin pill and a composition bar. Commission is charged on goods value only, never on shipping. A negative net turns the panel red and **blocks publish**.

Why show sellers all of this: a 5% headline commission is not their real cost. On a small order, payment fees and the label can exceed the commission several times over. Showing the whole stack *before* publish is the difference between a seller who prices correctly and one who discovers the problem after their first payout.

### 4.3 Shipping, customs & Shippo / 运费、海关与物流集成

`lib/shipping.ts` + `components/ShippingProfileEditor.tsx` · wizard step 8, `/seller/shipping`, `/seller/fulfillment`, `/cart`

**One shipping profile, four consumers** — the listing wizard, the net-income calculator, the buyer's checkout, and the label bought at fulfillment. They cannot diverge, which is precisely how small hardware sellers quietly lose money.

- **Zone × carrier rate matrix**, priced as `zone base + per-gram × parcel weight`. The data shape is deliberately the shape Shippo returns, so swapping the static table for live carrier quotes is a provider change, not a redesign.
- **Blocked zones** — a buyer in an unreachable region is told *before* they add to cart, not at checkout.
- **HS Code** — AI-suggested from the design's function, seller-confirmed, never auto-filed.
- **EU IOSS** — with the seller registered, VAT is collected at checkout and the buyer pays **nothing on delivery**. A surprise customs bill at the door is the single most effective way to destroy repeat purchase from EU buyers; this is the fix.
- **Commercial invoices are generated, not typed** — the order layer builds the PDF from the HS code and declared value and hands it to the carrier with the label.
- **`/seller/fulfillment`** — rate-shop across carriers, buy the label, and the **tracking number is written back to the order automatically**; the buyer is notified without the seller touching a field. Manual entry stays available for corridors the aggregator does not serve (China Post, Yanwen).

### 4.4 What this changes about the cart

`/cart` now handles a **mixed digital + physical** basket in one Stripe charge: digital subtotal + small-order fee + live shipping quote + IOSS VAT. The buyer sees one number; the platform pays the fixed fee once. Add the assembled board from the cart page to see shipping, customs and VAT enter the same checkout.

---

## 5. Walkthrough / 演示路径

Use the **"View as"** role switcher in the teal bar at the top of every page.

**Buyer**
1. `/` → `/search` → open **RP2350 Multi-function Pocket Instrument**
2. Product tabs: Design Preview (schematic / PCB / 3D mock viewers), Files & Versions, BOM, Licenses, **Make It**, Reviews
3. Pick a license → add to cart → `/cart` — inspect the payment breakdown and the seller-economics panel
4. Checkout → `/library` — download with limit tracking → report an issue → `/dispute`
5. Back on the product page, **Make It** → choose services + destination country → the routing engine ranks partners live with its reasons → request a quote
6. `/orders` — 6-step manufacturing tracker, "simulate next status"

**Seller**
- `/seller/new` — 10-step publish wizard: Type → Upload (**+ SmartList voice capture**) → animated parsing → Components → Visibility → Licenses → **Pricing (net income calculator)** → **Shipping (profile + customs)** → Manufacturing → Publish
- `/seller/payouts` — Stripe vs Wise corridor comparison, ledger, and a pre-publish model
- `/seller/shipping` — shipping & customs profile, with a live buyer-side preview
- `/seller/fulfillment` — Shippo rate shopping → buy label → **tracking auto-filled back to the order**
- `/seller/convert` — digital → physical listing, with the physical-goods margin modelled before committing
- `/seller/analytics`

**Partner** (Huaqiu view)
- `/partner/requests` — quote requests with an inline quote editor (PCB / assembly / components / shipping, lead time) → send quote
- `/partner/orders` — production queue, advance the state machine

**Admin**
- `/admin` — overview, with the small-order economics comparison front and centre
- `/admin/partners` — **the proof that nothing is hardcoded**: change status, commission model, commission rate, quote mode, strategic weighting
- `/admin/disputes` · `/admin/ip` · `/admin/payments`

---

## 6. Stack / 技术栈

Next.js 14 (App Router) · TypeScript · Tailwind CSS · Zustand. No backend, no database, no external services — deliberately, so the prototype deploys anywhere in one step.

Visual language deliberately matches the existing Tindie UI (navy `#1F2D3D` header, teal `#38B2AC` primary, orange `#EE7752` CTA, gray panels) rather than inventing a new identity — this is a module of Tindie, not a separate product.

---

## 7. Layout / 目录结构

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
components/
  VoiceCapture.tsx         SmartList — record → transcribe → extract fields
  NetIncomeCalculator.tsx  dual-corridor cost stack (Stripe / Wise)
  ShippingProfileEditor.tsx  zones, customs, IOSS + live buyer preview
lib/
  types.ts                 domain model — the future API contract
  mock.ts                  all seed data + platform payment config
  engine.ts                partner routing scorer + digital payment breakdown
  payments.ts              REGIONS · FEES · computeNet() — Stripe vs Wise corridor
  shipping.ts              zones · destinations · customs · Shippo carrier layer
  store.ts                 Zustand app state (incl. shared shipping profile)
```

---

## 8. Not in this phase / 本阶段不包含

Real Stripe Connect onboarding · real Shippo API calls · real speech-to-text · real KiCad file parsing · real partner APIs · authentication · database · AI-assisted routing (the Phase 1 scorer is rule-based and sufficient).

Every one of these has a seam already cut for it: `computeNet()` for the payment corridor, `quoteShipping()` / `mockShippoLabel()` for the carrier layer, and `VoiceCapture`'s transcript stream for STT.
