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

### 4.4 Logistics providers are configuration too / 物流服务商可配置

`lib/logistics.ts` · `/admin/logistics`

Carriers get the same treatment as manufacturing partners: a provider is a **record**, not a branch in the code. Shippo, EasyPost, Pirate Ship, a direct DHL account, and the manual China Post / Yanwen lanes each carry their own integration depth, negotiated discount, per-label fee, origin coverage and routing priority. Fulfillment rate-shops the eligible ones and buys the cheapest.

**Eligibility is enforced, not remembered.** On a cross-border lane Pirate Ship drops out despite having the best discount, because it cannot generate a commercial invoice. Cheapest ≠ eligible, and that rule belongs in the routing engine rather than in a seller's head.

Two policies live here that are usually left implicit, and both decide whether sellers trust the platform:

- **Label markup** — at cost / fixed handling fee / percentage. Default is **at cost**, because sellers compare your label price against the carrier's own website within a week of joining. A markup is discoverable, so if it exists it must be shown as its own line, never folded into the rate.
- **Post-billing adjustments** — carriers re-rate a parcel when actual weight or dimensions differ from the declaration. Not an edge case; a weekly occurrence at volume. Someone pays. Default is **split**: the platform absorbs anything under the threshold, larger adjustments are escalated to the seller with the carrier's evidence attached. That bounds the platform's exposure without punishing an honest 20-gram error.

### 4.5 What this changes about the cart

`/cart` now handles a **mixed digital + physical** basket in one Stripe charge: digital subtotal + small-order fee + live shipping quote + IOSS VAT. The buyer sees one number; the platform pays the fixed fee once. Add the assembled board from the cart page to see shipping, customs and VAT enter the same checkout.

### 4.6 Every seller type is now supported / 上架流程按商品类型分叉

The wizard is no longer a single linear form. The flow is a **function of what is being sold** — a physical seller is never walked through license tiers, and a digital seller is never asked for a parcel weight.

| Type | Flow |
|---|---|
| **Physical product** | Type → **AI Compose** → Pricing → Shipping → **Preorder** → Publish |
| **Digital design** | Type → Upload → Parsing → Components → Visibility → Licenses → Pricing → Publish |
| **Physical + digital bundle** | the union of both |
| **Professional service** | Type → AI Compose → Pricing → Publish |
| **Manufacturing service** | partner accounts only |

### 4.7 AI Compose — multi-modal listing generation / 智能上架

`components/AIComposer.tsx` + `lib/listing.ts`

Four inputs, any combination: **voice · typed note · product photos · engineering files + repo**. The output is **the existing Tindie product-create form, filled in** — name, category, price, stock, Markdown description, tags, weight, dimensions, doc links, OSHWA UID. The AI does not invent a second listing model; it fills the one Tindie already has. That is what makes it an extension rather than a parallel product, and it is why an experienced seller can ignore all of it and use the classic form.

Three rules, all visible in the UI:
- **Every field carries a confidence score and its source list.** "from voice + schematic + README" is printed next to the value.
- **Corroboration raises confidence; conflict is resolved by the files.** A schematic is evidence, speech is a claim.
- **Nothing under 80% is published without a human confirming it.** Stock quantity, for example, is never inferable — it is flagged rather than guessed.

### 4.8 Preorder / Build campaigns / 预售机制

`lib/build.ts` + `lib/campaigns.ts` · wizard step, `/seller/build`, `/seller/build/manufacturing`, `/seller/build/orders`, `/campaign/[slug]`

Ported from **`eehubio/ezplm_prebuild`** with the type contract unchanged — `BuildProject`, `ManufacturingReview`, quote tiers, `computeForecast()`, `buildCampaignPayload()`. A campaign created here serialises to the exact **Campaign JSON** that module already emits, so ezPLM stays the producer and Tindie a consumer of one contract rather than a fork. (Visible in the seller dashboard: "Show Campaign JSON".)

**Three campaign types, presented as a risk ladder** — the buyer-facing risk label is on the campaign page, not buried in terms:

| Type | Money | For |
|---|---|---|
| Interest Check | **no payment taken** | a first-time maker who has never manufactured |
| Batch Build | **authorised, captured only on goal** | crowdfunding-style production run |
| Rolling Preorder | **charged immediately — highest obligation** | proven design, simply out of stock |

**Demand becomes a margin number.** The manufacturing partner returns a DFM score and a **tiered quote** (50 / 100 / 200 units). The wizard and `/seller/build/manufacturing` compute margin at every tier live, and highlight **the tier the forecast actually supports** — not the one with the best headline margin. Producing 200 to chase three margin points when demand forecasts 100 is precisely how hardware sellers end up with a garage full of stock.

**One honest constraint surfaced rather than hidden:** Stripe authorisations expire in about 7 days, so a campaign running longer cannot rely on a long-lived hold — it needs a saved payment method plus an off-session charge at goal. The deadline and the capture mechanism have to be designed together. That note is in the wizard, because it is an architecture decision, not a UI detail.

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
- `/seller/new` — the wizard branches by product type. Pick **"A physical product"** to see AI Compose → Pricing → Shipping → Preorder; pick **"A digital hardware design"** for the file-parsing flow.
- `/seller/build` — preorder campaign dashboard: goal progress, demand forecast, partner DFM status, engineering readiness, milestones, and the raw Campaign JSON
- `/seller/build/manufacturing` — DFM findings + tiered quote with live margin per tier
- `/seller/build/orders` — cumulative preorder trend, country/variant split, recommended production run
- `/campaign/pocket-logic-analyzer` — the buyer's view of a live preorder
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
- `/admin/logistics` — **the same proof for carriers**: providers, negotiated discounts, per-label fees, integration depth, routing priority; plus the two policies that decide whether sellers trust you — label markup and post-billing adjustments — and a live rate-shop simulator
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
  logistics.ts             carrier providers, discounts, markup + adjustment policy
  build.ts                 preorder campaigns (ported contract from ezplm_prebuild)
  campaigns.ts             campaign seed data
  listing.ts               Tindie listing field schema + AI extraction model
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

---

## 5. Architecture-correctness refactor / 架构正确性重构

An external review (GPT) flagged a set of P0/P1 defects. Most were real; the response below states plainly which were accepted, which were judged more severe than reported, and which were disputed.

### 5.1 The payment ledger now closes (P0-2)

The old model computed a Stripe fee and then **deducted it from nobody**. Goods went to the seller, commission to the platform, and the processor's cut came from nowhere — an itemised UI over books that did not balance. This was worse than the review stated: it is not a display bug, it is a reconciliation incident waiting to happen.

`PaymentConfig` now carries `feeAllocation: "platform_absorbs" | "seller_pays" | "buyer_pays" | "shared"`, and `computePayment()` attributes every cent. `assertBalanced()` proves it:

```
buyerTotal = sellerNet + platformNetRevenue + stripeFee + tax + shippingCost
```

`/admin/payments` runs the four required scenarios (single $2, single $5, two $5, mixed digital+physical) against all four allocation modes, each showing a **✓ books close** proof. `buyer_pays` is circular (a surcharge raises the amount charged, which raises the fee) and is solved algebraically — `T = (B + k) / (1 − p)` — not approximated.

**Services were also pulled out of the digital small-order logic.** A $99 design review is quoted human work; it is not a small order in need of subsidy, and it must not inherit instant-download refund semantics.

### 5.2 Partner routing: eligibility is a hard gate (P0-3, P0-4)

The old engine scored everyone and surfaced anyone covering ≥1 requested service — so a PCB-only shop appeared for a PCB+SMT+sourcing+review job and looked like it could take the whole thing. It also routed to `draft` partners.

Now, in this order and never merged:

1. **`checkEligibility()`** — a hard gate. Operational readiness (contract, NDA, DPA, payouts, API health, accepting orders, capacity, capability-data freshness) **and** capability constraints (layers, materials, min trace, quantity range, packages, currency, lead time). Fail one, and the partner does not appear. No score rescues it.
2. **`rankPartners()`** — among the eligible only, on merit only.
3. **`composePlan()`** — when no single partner covers the job, build a **service chain**: KiCad Services reviews → Huaqiu fabricates and assembles → a US partner tests and ships. Each leg receives only the file scope it needs. *That* is a global partner network; picking one factory from a list is a dropdown.

`isBuyerVisible()` encodes the principle that **"active" in a database is not "safe to send a paying buyer to"**. Excluded partners are shown to the buyer *with reasons*, so they can tell "nobody can do this" apart from "nobody has been onboarded for this yet".

### 5.3 Strategic weighting removed from ranking (P1-4 — the most important one)

The old engine gave 5% of the match score for being a "Strategic Tindie partner", and printed *"Strategic Tindie partner"* as a match reason. That dresses a commercial relationship up as a technical fit.

**A ranking that quietly favours the partner who pays us is not a ranking. It is an advertisement wearing one.** The term is gone from `WEIGHTS` entirely. Commercial relationships now buy a **labelled `Sponsored` slot** — visible to the buyer as sponsorship, which is honest, and which is the only version of this compatible with the community-neutrality constraint.

### 5.4 Manufacturing is a licence right (P1-3)

`LicenseOffer.manufacturingRights` = `{ personalUnits, commercialUnits, partnerManufacturingAllowed, sourceFilesIncluded }`. `checkManufacturingRights()` runs live in **Make It**: select 200 units against a 100-unit commercial licence and the quote buttons disable with *"You selected 200 units. Your licence permits 100 commercial units and 40 are already used — 60 remain. Upgrade required."* The partner's file scope (fabrication outputs vs. editable sources) is read from the licence too.

### 5.5 Versions, entitlements, and a download gate that actually refuses (P0-5, P0-6)

**Where the review was wrong:** real download enforcement — signed URLs, atomic decrement, S3 anti-hotlinking — is inherently backend. A prototype cannot implement it, and pretending otherwise would be theatre.

**What a prototype can and must do:** stop lying. The old code did `Math.min(downloadCount + 1, downloadLimit)` — a counter that saturates at the limit and then says *"Download started"* forever. It was a progress bar, not a control.

Now: `AssetVersion` is a first-class immutable snapshot (files, BOM, validation, certification, withdrawal status). `Entitlement` is version-bound (`purchasedVersionId`, `updatePolicy`, `licenseSnapshotHash`, `commercialUnitsUsed`). `requestDownload()` returns a `DownloadGrant` that **can refuse** — limit reached, licence revoked, refund issued, version withdrawn on an IP complaint, or a version the update policy does not cover — with a reason the buyer reads. **The button does not decide.** The same state machine is the contract the backend implements, so the two cannot drift.

### 5.6 Digital listing flow: engineering trust first (P1-2)

Reordered to **Upload → Analyze → Fix BOM → Verify → Preview & scope → License → Sell**. A new **Verify** step earns a verification level (L0–L3) from *evidence* — DRC/ERC pass, fabricated, photo of the assembled board, firmware, test log — rather than from a checkbox. AI is repositioned as an assist at the description step, not the headline. A buyer of a KiCad project does not care how well the AI wrote the copy; they care whether the files open and whether anyone has ever actually built the thing.

### 5.7 Draft, repositories, tests (P1-1, P1-6, P1-8)

- **`lib/draft.ts`** — one `ListingDraft` object for the whole wizard, autosaved, with `validateDraft()` running over the *whole* draft rather than per-screen. A listing is a document with a lifecycle, not a sequence of screens.
- **`lib/repositories/`** — pages no longer `import { partners } from "@/lib/mock"`. `PartnerRepository.listBuyerVisible()` enforces the visibility boundary once, so a page *cannot* accidentally request draft partners. Swapping to an API implementation is one line in `repos`.
- **`tests/engine.test.ts`** — 31 vitest tests, all passing: ledger closure across 4 scenarios × 4 allocation modes, fee attribution, small-order economics, partner eligibility exclusions, chain composition, absence of a strategic term in ranking, download refusal, licence unit caps. Scripts: `typecheck`, `test`, `test:watch`, `format:check`.

### 5.8 Deliberately not done

- **Thin backend MVP (P1-5)** — agreed in direction, but it is not the prototype's job. The prototype's job is to pin the contracts down hard enough that the backend can be written against them. That is what §5.1–5.5 do.
- **Store splitting (P1-7)** — `sessionStore` / `cartStore` / `listingDraftStore` / `uiStore` is correct for production. Deferred: at prototype scale it is churn without a demonstration.


---

## 6. Marketplace-completeness update / 市场完整性更新

### 6.1 Storage — two layers, one build / 存储：两层，一次构建

- **Demo DB (zero config):** the Zustand store is persisted to `localStorage` (`tindie-proto-db`). What a seller publishes or edits survives a refresh and is immediately visible in the buyer marketplace — the seller→buyer loop is real, not staged.
- **Real DB (one env var):** a Drizzle + Neon Postgres schema lives in `lib/db/schema.ts` (`products`, `product_questions`, `version_notes`, `ship_profiles`), with API routes at `/api/products` and `/api/questions`. **Without `DATABASE_URL` they serve the seeded mock; with it they read/write Postgres.** Same build serves both modes. Push the schema with `npm i -D drizzle-kit && npx drizzle-kit push`.

### 6.2 Buyer / 买家

- **All product types are listed:** digital files, **physical** (`/product/pocket-instrument-assembled`), **physical + digital bundle** (`/product/pocket-instrument-kit-plus-sources`), and a **preorder** listing tied to the Pocket Logic Analyzer campaign.
- **Detail pages adapt to what is sold.** Physical: price, live stock, qty selector, handling time, weight, dimensions, and a **Shipping & Delivery** tab that shows exactly what the seller configured — per-destination rates from the seller's ship profile, IOSS/customs notes. Bundle: both the commerce panel and the full digital tabs. Preorder: commitment progress + link into the campaign; card is authorised, charged at goal.
- **Q&A on every listing.** Buyers ask on the product page; answers publish publicly. A listing is alive after publish.
- **BOM "Match" renamed to "Part ID confidence"** with an explanation: it is the parser's certainty that a BOM row maps to the exact orderable MPN, checked against distributor catalogs — i.e. "can you paste this BOM into an order". It stays, because for a design-file buyer it is one of the few pre-purchase signals of BOM quality; remove it and the column that replaces it is a support ticket.

### 6.3 Seller / 卖家

- **Dashboard**: four KPI cards — 可提现余额 / 待结算 / 需处理订单 / 待回复消息 — **every one is a link** landing on the page that acts on it. The 需要你处理 list computes from live state (overdue shipments, labels not marked shipped, unanswered questions) and each row carries a working CTA. Analytics is merged in; the old route redirects. **Payouts is the last nav tab.**
- **Orders (`/seller/orders-action`)**: the ship queue in three states. Overdue orders are flagged with a link to the delay template. **Label-bought-but-not-marked-shipped gets its own section and reminder** — the buyer still sees "preparing" until the seller marks it, and that gap is a top source of "where is my order". Marking shipped prompts (never auto-sends) the shipping-notice template.
- **Messages (`/seller/messages`)**: unanswered Q&A with publish-in-place, plus four order message templates — 发货通知 / 延迟 / 缺货 / 退款 — **copy-paste by design** with obvious variables pre-filled. The out-of-stock template offers the buyer the choice (wait with goodwill / refund now); that structure prevents more disputes than any policy text.
- **Manage listing (`/seller/manage/[slug]`)**: publish is the beginning, not the end — edit price/stock/tagline/handling, **post version notes** (shown on the buyer page under "Seller updates"), answer this listing's questions.
- **Shipping profiles are per-product.** Multiple named profiles (42 g module vs 620 g kit), assigned per listing; the buyer's Shipping tab, checkout and label purchase all read the same object.

### 6.4 Admin / 平台

- **Add Partner works** — creates a draft partner with *nothing signed*: the buyer-visible badge stays red until contract, NDA, DPA, payouts and integration are each flipped. No shortcut exists, on purpose. Admin partner edits (pause, capacity) apply to buyer routing immediately, because Make It reads the live partner list.
- **Sellers (`/admin/sellers`)**: application queue. Approval assigns the payment corridor and therefore the risk defaults (Stripe 0%/T+2 vs Wise 10%/T+14) — stated to the seller at approval, not discovered on first payout. Rejections require a reason the applicant reads.
- **Product Review (`/admin/reviews`)**: submission queue with two pre-checks (IP declaration, files parsed). **Approve is disabled while the IP declaration is unchecked** — the seeded "Arduino Nano Plus clone" is exactly the case the queue exists for.


---

## 7. Projects & Challenges / 开源项目与挑战活动（FunPack 模式）

- **Open projects (`/projects`)** — hackaday.io-style pages by sellers AND buyers, each linked to a listing. Sellers publish design walkthroughs (before / during / without a preorder) — architecture trade-offs, AFE iterations, **which of the three board spins failed and why**; buyers publish build logs and challenge entries, initiated with one click from their Library ("发布开源项目" on every purchase). The product page gains a **Projects tab** aggregating everything linked — credibility that marketing copy can't buy.
- **Challenges (`/challenges/[slug]`)** — the 电子森林 FunPack mechanism: N seats × deposit (= board price), a task, snapshot-frozen rules (repo + Tindie project page ≥2 sections + video + OSS licence). Complete on time and pass review → **deposit refunded in full, the board is effectively free**. Deposits sit in **platform escrow** (never in the seller's balance) so the refund is always recoverable — a Stripe-corridor product by design. Forfeits convert to a normal order.
- **Dispute circuit breaker (PRD v1.0 §11)** — ≥5 decisions with a decline rate >40% locks the seller's Reject action and escalates the whole challenge to platform review (Approve stays open). A challenge that rejects most entries is a scam with extra steps; the breaker makes it structurally impossible. Rules are frozen at join-time — same principle as the licence snapshot hash.
- **Sponsors** — DigiKey-style sponsors fund seats or perks in exchange for branding on the challenge and every entry page. Sponsored seats still refund to the **buyer**: sponsorship buys visibility, never influence over decisions — same discipline as §5.4 of the spec.
- Seller console at `/seller/projects`: publish walkthroughs, launch challenges (seats/deposit/task/rules/deadline), review submitted entries (approve → refund; reject requires a reason the buyer reads verbatim).
- **Surfacing** — projects are NOT hidden behind the nav item: the marketplace home page carries a Community section (active-challenge banner + latest projects), every `ProductCard` in browse/search shows an "N 个开源项目" badge, and `/search` returns matching open projects below the product results. The project is marketing for the listing; hiding it from browse wastes it.


## 8. Batch packing slips (a real seller request)

From a Tindie user, verbatim: printing packslips was "a one-by-one process of opening the order page, clicking the print button, confirming, closing, opening the next order page…" — they asked for **one button on the orders list that generates a single document with all packslips for all unshipped orders, so one print job covers everything**.

Built exactly that: `/seller/orders-action` carries a **"Print all packing slips (N)"** button at queue level → `/seller/packslips` renders one slip per unshipped order (awaiting-shipment + label-bought-not-marked), one per printed page (`break-after-page`), app chrome hidden via `print:hidden`, single `window.print()`. Slips carry ship-to address, order ref, SKU/qty, weight, service & tracking when a label exists, and a picked/packed/shipped checklist row. Batch operations belong on the queue page, not inside each order.

## 9. Batch label buying

The sibling of batch packslips: checkboxes on the Awaiting-shipment queue (+ select-all) → **"Buy labels for selected (N) — one payment"** → `/seller/labels-batch` rate-shops each order at **its own weight and destination**, defaults every row to the cheapest eligible service with a per-row upgrade select (a batch must never take away a choice the single flow offered; untracked services carry a "where is my order" warning) → one charge for the whole batch (`idempotency_key = batch id` — a retry storm must never buy a label twice) → every order moves to **label_purchased**, tracking numbers generated. Buying a label does NOT mark anything shipped: state 2 semantics hold, each parcel is marked as it physically leaves. The success screen offers "Print all packing slips" — slips printed after the batch include service + tracking per parcel.

## 10. Hackster/Hackaday patterns + Project Rewards

The maker→platform→Tindie funnel already exists in the wild (hackaday.io projects literally say "you can get the board on Tindie"); this internalizes it. From **Hackster**: a "Things used in this project" components list — `components[]` is many-to-many, every Tindie entry links to a listing, and the product's Projects tab reverse-indexes every project that lists it; plus difficulty/hours metadata. From **Hackaday**: chronological **build logs** separate from story sections — "last updated" is a trust signal buyers actually read.

**Rewards**: sellers attach a `RewardProgram` to a listing — publish an approved project *using* that product, earn Tindie wallet credit (e.g. $5) or a coupon (e.g. 15%). The seller buys what a Hackster feature gives them, at a price they set from a budget they cap. Five anti-abuse rules, each one a farm-vector closed: (1) verified purchase required; (2) machine-checked quality bar (≥2 substantive sections or ≥1 log) before any claim exists; (3) one grant per buyer per product; (4) budget cap auto-exhausts the program — never an unbounded liability; (5) seller decides with verbatim-readable denial reasons, same governance posture as the challenge circuit breaker. Wallet credit is a first-class balance gated by OUR ledger at spend time (processor metered billing can't do real-time enforcement), with payout-grade audit discipline. Buyer wallet lives in Library; claims queue + program budgets in `/seller/projects`; reward banners on product Projects tabs and in the publish form's component picker. All gating logic in `lib/rewards.ts` with tests (36 passing).

## 11. Persisted-state versioning (and the white-screen fix)

localStorage outlives deploys. Clients that stored projects before `components[]`/`logs[]` existed (or before the English-content pass) fed stale shapes into new pages and crashed them with a client-side exception. The structural fix is a **versioned persist layer** (`version: 2` + `migrate` in `lib/store.ts`), not `?? []` scattered through every consumer: on load, seed-origin rows are replaced with current seeds, user-created rows are kept but normalized with missing fields defaulted, and collections that didn't exist before (rewards) are dropped and re-seeded. Any future schema change to a persisted collection bumps the version and extends `migrate`.

Also: the **Partner** button is removed from the role switcher (buyer / seller / admin remain). Partner routes and the admin Partners console still exist; there's just no first-class entry at this stage.