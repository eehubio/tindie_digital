"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useApp } from "@/lib/store";

/**
 * A listing after publish. Publishing is the beginning of a listing's life, not
 * the end: prices move, stock counts down, versions ship, buyers ask things.
 * Everything edited here is visible on the buyer page immediately.
 */
export default function ManageListingPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { updateProduct, addVersionNote, questions, answerQuestion, shipProfiles, showToast } = useApp();
  const products = useApp((st) => st.allProducts)();
  const p = products.find((x) => x.slug === slug);

  const [price, setPrice] = useState(p?.price ?? 0);
  const [stock, setStock] = useState(p?.stock ?? 0);
  const [tagline, setTagline] = useState(p?.tagline ?? "");
  const [handling, setHandling] = useState(p?.handlingDays ?? "");
  const [profileId, setProfileId] = useState(p?.shipProfileId ?? shipProfiles[0]?.id);
  const [noteSemver, setNoteSemver] = useState("");
  const [noteText, setNoteText] = useState("");
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});

  if (!p) {
    return (
      <div className="t-card p-10 text-center">
        <p className="text-muted">Listing not found.</p>
        <button className="t-btn-ghost mt-4" onClick={() => router.push("/seller")}>Back</button>
      </div>
    );
  }

  const isPhysical = p.productType !== "digital";
  const myQuestions = questions.filter((q) => q.productId === p.id);
  const seededListing = !p.id.startsWith("dp_pub_"); // seed rows: edits apply in-session via store override

  function save() {
    updateProduct(p!.id, {
      price,
      stock,
      tagline,
      handlingDays: handling,
      shipProfileId: profileId,
      updatedAt: new Date().toISOString().slice(0, 10),
    });
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-navy">{p.title}</h1>
          <p className="text-xs text-muted mt-0.5">
            Live listing · <Link href={`/product/${p.slug}`} className="text-link hover:underline">view as buyer →</Link>
          </p>
        </div>
        <span className="t-tag bg-teal-light text-teal-dark">published — still editable</span>
      </div>

      {/* -------- Edit core fields -------- */}
      <div className="t-card p-5">
        <h2 className="font-semibold text-navy mb-3">Listing details</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {isPhysical && (
            <>
              <div>
                <label className="t-label">Price (USD)</label>
                <input className="t-input" type="number" step="0.5" value={price} onChange={(e) => setPrice(Number(e.target.value))} />
              </div>
              <div>
                <label className="t-label">Stock</label>
                <input className="t-input" type="number" min={0} value={stock} onChange={(e) => setStock(Number(e.target.value))} />
                <p className="t-hint">Counts down on the buyer page in real time. 0 with no preorder = &ldquo;Out of stock&rdquo;.</p>
              </div>
              <div>
                <label className="t-label">Handling time</label>
                <input className="t-input" value={handling} onChange={(e) => setHandling(e.target.value)} placeholder="e.g. 2–4 days" />
              </div>
              <div>
                <label className="t-label">Shipping profile</label>
                <select className="t-input" value={profileId} onChange={(e) => setProfileId(e.target.value)}>
                  {shipProfiles.map((sp) => (
                    <option key={sp.id} value={sp.id}>{sp.name} — {sp.weightG} g</option>
                  ))}
                </select>
                <p className="t-hint">
                  Different products, different boxes: a 42 g module and a 620 g kit must not share one profile.{" "}
                  <Link href="/seller/shipping" className="text-link hover:underline">Manage profiles →</Link>
                </p>
              </div>
            </>
          )}
          <div className="sm:col-span-2">
            <label className="t-label">Tagline</label>
            <textarea className="t-input min-h-[60px]" value={tagline} onChange={(e) => setTagline(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end mt-3">
          <button className="t-btn-primary" onClick={save}>Save changes</button>
        </div>
        {seededListing && (
          <p className="t-hint mt-2">Demo note: edits to seeded listings apply for this session; your own published listings persist in the local demo DB.</p>
        )}
      </div>

      {/* -------- Version notes -------- */}
      <div className="t-card p-5">
        <h2 className="font-semibold text-navy mb-1">Post a version note</h2>
        <p className="text-xs text-muted mb-3">
          Shows in &ldquo;Seller updates&rdquo; on the buyer page. For digital assets it also tells v1.0 owners what their
          update policy entitles them to — announce a 2.0 here before charging for it.
        </p>
        <div className="flex gap-2">
          <input className="t-input !w-28" placeholder="1.0.2" value={noteSemver} onChange={(e) => setNoteSemver(e.target.value)} />
          <input className="t-input flex-1" placeholder="What changed, in one honest sentence." value={noteText} onChange={(e) => setNoteText(e.target.value)} />
          <button
            className="t-btn-primary disabled:opacity-40"
            disabled={!noteSemver.trim() || !noteText.trim()}
            onClick={() => {
              addVersionNote({
                id: "vn_" + Math.random().toString(36).slice(2, 7),
                productId: p.id,
                semver: noteSemver.trim(),
                note: noteText.trim(),
                postedAt: new Date().toISOString().slice(0, 10),
              });
              setNoteSemver("");
              setNoteText("");
            }}
          >
            Post
          </button>
        </div>
      </div>

      {/* -------- Q&A for this listing -------- */}
      <div className="t-card p-5">
        <h2 className="font-semibold text-navy mb-3">Buyer questions on this listing ({myQuestions.length})</h2>
        {myQuestions.length === 0 ? (
          <p className="text-sm text-muted">No questions yet.</p>
        ) : (
          <div className="space-y-3">
            {myQuestions.map((q) => (
              <div key={q.id} className="border border-line rounded-lg p-3">
                <div className="text-xs text-muted">{q.askedBy} · {q.askedAt}</div>
                <p className="text-sm text-slate mt-1">{q.question}</p>
                {q.answer ? (
                  <div className="mt-2 ml-3 pl-3 border-l-2 border-teal text-sm text-slate">
                    <span className="text-xs text-teal-dark font-semibold">You · {q.answeredAt}</span> — {q.answer}
                  </div>
                ) : (
                  <div className="flex gap-2 mt-2">
                    <input
                      className="t-input flex-1"
                      placeholder="Answer publicly…"
                      value={answerDrafts[q.id] ?? ""}
                      onChange={(e) => setAnswerDrafts((m) => ({ ...m, [q.id]: e.target.value }))}
                    />
                    <button
                      className="t-btn-ghost disabled:opacity-40"
                      disabled={!(answerDrafts[q.id] ?? "").trim()}
                      onClick={() => answerQuestion(q.id, answerDrafts[q.id].trim())}
                    >
                      Publish
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
