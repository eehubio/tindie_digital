"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";

// ---------------------------------------------------------------------------
// Order message templates. Deliberately COPY-PASTE, not auto-send: the seller
// reads it, edits the human parts, and pastes it into the order conversation.
// A template the seller never sees becomes a template buyers learn to ignore.
// ---------------------------------------------------------------------------
const TEMPLATES: { id: string; label: string; tone: string; body: string }[] = [
  {
    id: "shipped",
    label: "Shipping notice",
    tone: "bg-teal-light text-teal-dark",
    body: `Hi {buyer_name},

Good news — your order {order_ref} ({product}) shipped today via {carrier}.

Tracking: {tracking}
Expected delivery: {eta}

It left in anti-static packaging with the connector kit included. If anything looks off when it arrives, reply here first — most issues are a 5-minute fix.

Thanks for supporting an independent maker!
{seller_name}`,
  },
  {
    id: "delay",
    label: "Delay notice",
    tone: "bg-amber-100 text-amber-800",
    body: `Hi {buyer_name},

A quick heads-up on order {order_ref} ({product}): it's going to leave {delay_days} day(s) later than my usual handling time — {delay_reason}.

New ship date: {new_ship_date}. You'll get the tracking number the moment it's on its way.

If the new date doesn't work for you, reply here and I'll cancel and refund in full, no questions.

Sorry for the wait, and thanks for your patience.
{seller_name}`,
  },
  {
    id: "oos",
    label: "Out-of-stock notice",
    tone: "bg-orange-100 text-orange-800",
    body: `Hi {buyer_name},

I have to be straight with you: the {component} for order {order_ref} ({product}) is out of stock at my supplier, and the restock date is {restock_date}.

Two options — your choice:
  1. Wait: I ship the day the parts arrive, and I'll add {goodwill} as a thank-you.
  2. Refund: full refund today, and I'll ping you when it's back in stock.

Just reply 1 or 2. Either way, sorry — I'd rather tell you now than go quiet.
{seller_name}`,
  },
  {
    id: "refund",
    label: "Refund confirmation",
    tone: "bg-red-100 text-red-700",
    body: `Hi {buyer_name},

Your refund for order {order_ref} ({product}) — {amount} — was issued today. Depending on your bank it lands in 5–10 business days; the card statement will show "TINDIE".

{return_line}

Thanks for giving the product a try. If there's something I could have done better, one line of honest feedback genuinely helps.

{seller_name}`,
  },
];

export default function MessagesPage() {
  const { questions, answerQuestion } = useApp();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const products = useApp((st) => st.allProducts)();

  const open = questions.filter((q) => !q.answer);
  const answered = questions.filter((q) => q.answer);

  async function copy(id: string, body: string) {
    // Pre-fill the obvious variables from a live order so paste-and-edit is fast.
    const filled = body
      .replaceAll("{buyer_name}", "Lena")
      .replaceAll("{order_ref}", "TD-88213")
      .replaceAll("{product}", "RS485 ↔ TTL Module")
      .replaceAll("{seller_name}", "SuLab");
    await navigator.clipboard.writeText(filled);
    setCopied(id);
    setTimeout(() => setCopied(null), 1600);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-navy">Messages</h1>
        <p className="text-sm text-muted mt-1">
          Buyer questions publish on the product page once answered — a good public answer sells the next unit. Templates
          below are copy-paste on purpose: read it, edit the human parts, then send.
        </p>
      </div>

      {/* -------- Unanswered questions -------- */}
      <section>
        <h2 className="font-bold text-navy mb-2">Unanswered ({open.length})</h2>
        {open.length === 0 ? (
          <div className="t-card p-6 text-center text-muted text-sm">Inbox zero.</div>
        ) : (
          <div className="space-y-3">
            {open.map((q) => {
              const prod = products.find((p) => p.id === q.productId);
              return (
                <div key={q.id} className="t-card p-4">
                  <div className="text-xs text-muted">
                    <span className="font-semibold text-navy">{q.askedBy}</span> · on{" "}
                    <span className="text-link">{prod?.title ?? q.productId}</span> · {q.askedAt}
                  </div>
                  <p className="text-sm text-slate mt-1">{q.question}</p>
                  <textarea
                    className="t-input min-h-[64px] mt-3"
                    placeholder="Your answer — this publishes on the product page for everyone."
                    value={drafts[q.id] ?? ""}
                    onChange={(e) => setDrafts((m) => ({ ...m, [q.id]: e.target.value }))}
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      className="t-btn-primary disabled:opacity-40"
                      disabled={!(drafts[q.id] ?? "").trim()}
                      onClick={() => answerQuestion(q.id, drafts[q.id].trim())}
                    >
                      Publish answer
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* -------- Templates -------- */}
      <section id="templates">
        <h2 className="font-bold text-navy mb-2">Order message templates</h2>
        <div className="grid md:grid-cols-2 gap-3">
          {TEMPLATES.map((t) => (
            <div key={t.id} className="t-card p-4 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <span className={`t-tag ${t.tone}`}>{t.label}</span>
                <button className="t-btn-ghost" onClick={() => copy(t.id, t.body)}>
                  {copied === t.id ? "✓ Copied" : "Copy"}
                </button>
              </div>
              <pre className="text-xs text-slate whitespace-pre-wrap font-sans bg-panel rounded-md p-3 flex-1 leading-relaxed">
                {t.body}
              </pre>
            </div>
          ))}
        </div>
        <p className="t-hint mt-2">
          {"{placeholders}"} for the current order are pre-filled on copy where known. Note the out-of-stock template
          gives the buyer the choice instead of making it for them — that single structure prevents more disputes than
          any refund policy does.
        </p>
      </section>

      {/* -------- Answered history -------- */}
      <section>
        <h2 className="font-bold text-navy mb-2">Answered ({answered.length})</h2>
        <div className="space-y-2">
          {answered.map((q) => (
            <div key={q.id} className="t-card p-3 text-sm">
              <span className="text-muted">{q.askedBy}:</span> <span className="text-slate">{q.question}</span>
              <div className="ml-4 mt-1 pl-3 border-l-2 border-teal text-slate">
                <span className="text-xs text-teal-dark font-semibold">You · {q.answeredAt}</span> — {q.answer}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
