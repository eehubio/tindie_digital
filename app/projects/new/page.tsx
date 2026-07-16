"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useApp } from "@/lib/store";
import { ProjectComponent } from "@/lib/projects";

/**
 * Publish an open project. Reached three ways:
 *   - buyer's Library, from a purchased item  (?product=)
 *   - a challenge's "submit entry" button      (?challenge=&entry=&product=)
 *   - seller console, introducing a product    (?product=&as=seller)
 * The product link is the whole point: the project enriches the listing,
 * and the listing gives the project an audience.
 */
function NewProjectForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const { addProject, submitEntry, challenges } = useApp();
  const products = useApp((st) => st.allProducts)();

  const challengeId = sp.get("challenge") ?? undefined;
  const entryId = sp.get("entry") ?? undefined;
  const asSeller = sp.get("as") === "seller";
  const ch = challenges.find((c) => c.id === challengeId);

  const [productId, setProductId] = useState(sp.get("product") ?? ch?.productId ?? "");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [github, setGithub] = useState("");
  const [youtube, setYoutube] = useState("");
  const [sections, setSections] = useState([{ heading: "", body: "" }]);
  // Things used in this project (hackster-style). Tindie listings are
  // checkboxes; free-text externals can be added inline.
  const [compSel, setCompSel] = useState<Record<string, boolean>>(
    sp.get("product") ? { [sp.get("product")!]: true } : ch?.productId ? { [ch.productId]: true } : {}
  );
  const [extName, setExtName] = useState("");
  const [externals, setExternals] = useState<ProjectComponent[]>([]);
  const rewardPrograms = useApp((st) => st.rewardPrograms);

  const prod = products.find((p) => p.id === productId);
  const requiredOk =
    title.trim() && summary.trim() && sections.filter((s) => s.heading.trim() && s.body.trim()).length >= (ch ? 2 : 1)
    && (!ch || youtube.trim()); // challenge rules: video is hard-required

  function publish() {
    const id = "pj_" + Math.random().toString(36).slice(2, 7);
    const components: ProjectComponent[] = [
      ...products.filter((x) => compSel[x.id]).map((x) => ({ name: x.title, qty: 1, productId: x.id })),
      ...externals,
    ];
    addProject({
      id,
      slug: title.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) + "-" + id.slice(-4),
      title: title.trim(),
      authorName: asSeller ? "SuLab" : "you (demo)",
      authorRole: asSeller ? "seller" : "buyer",
      kind: ch ? "challenge_entry" : asSeller ? "product_intro" : "build_log",
      productId: productId || undefined,
      challengeId,
      summary: summary.trim(),
      sections: sections.filter((s) => s.heading.trim() && s.body.trim()),
      components,
      logs: [],
      tags: ch ? ["challenge-entry"] : [],
      githubUrl: github.trim() || undefined,
      youtubeUrl: youtube.trim() || undefined,
      coverGradient: asSeller ? "from-teal-600 to-emerald-800" : "from-slate-600 to-navy",
      likes: 0,
      createdAt: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().slice(0, 10),
    });
    if (ch && entryId) submitEntry(ch.id, entryId, id);
    router.push(ch ? `/challenges/${ch.slug}` : "/projects");
  }

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-navy">Publish an open project</h1>
        <p className="text-sm text-muted mt-1">
          {ch
            ? `Publishing as an entry in "${ch.title}" — it submits for review automatically.`
            : asSeller
            ? "Introduce your product as a design walkthrough — laying trade-offs and pitfalls open is the shortest path to credibility."
            : "Publish a build log or mod project on hardware you bought."}
        </p>
      </div>

      {ch && (
        <div className="t-card p-4 border-tag/40 bg-orange-50/40 text-sm text-slate">
          <strong className="text-navy">Review rules for this challenge:</strong>
          <ul className="mt-1 space-y-0.5">
            {ch.rules.filter((r) => r.required).map((r) => <li key={r.id}>· {r.label}</li>)}
          </ul>
        </div>
      )}

      <div className="t-card p-5 space-y-4">
        <div>
          <label className="t-label">Linked listing (the project appears under its Projects tab)</label>
          <select className="t-input" value={productId} onChange={(e) => setProductId(e.target.value)}>
            <option value="">— No link —</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
          {prod && <p className="t-hint">↳ Will link to /product/{prod.slug}</p>}
        </div>
        <div>
          <label className="t-label">Title</label>
          <input className="t-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. A LIN bus decoder built on the PLA" />
        </div>
        <div>
          <label className="t-label">Summary (one paragraph: what you built and why it's worth reading)</label>
          <textarea className="t-input min-h-[70px]" value={summary} onChange={(e) => setSummary(e.target.value)} />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="t-label">GitHub repo</label>
            <input className="t-input" value={github} onChange={(e) => setGithub(e.target.value)} placeholder="https://github.com/…" />
          </div>
          <div>
            <label className="t-label">Demo video {ch && <span className="text-cta">* (hard requirement for challenges)</span>}</label>
            <input className="t-input" value={youtube} onChange={(e) => setYoutube(e.target.value)} placeholder="https://youtube.com/…" />
          </div>
        </div>
      </div>

      <div className="t-card p-5">
        <h2 className="font-semibold text-navy mb-1">Things used in this project</h2>
        <p className="t-hint mb-3">
          Tick the Tindie listings you used — the project will appear on each product&apos;s Projects tab, and
          listings with a reward program pay out on approval.
        </p>
        <div className="grid sm:grid-cols-2 gap-2">
          {products.map((x) => {
            const program = rewardPrograms.find((rp) => rp.productId === x.id && rp.status === "active");
            return (
              <label key={x.id} className={`flex items-start gap-2 border rounded-md p-2.5 text-sm cursor-pointer transition ${compSel[x.id] ? "border-teal bg-teal-light/30" : "border-line hover:border-teal/40"}`}>
                <input type="checkbox" className="accent-teal mt-0.5" checked={!!compSel[x.id]}
                  onChange={(e) => setCompSel((m) => ({ ...m, [x.id]: e.target.checked }))} />
                <span className="min-w-0">
                  <span className="text-navy font-medium line-clamp-1">{x.title}</span>
                  {program && (
                    <span className="t-tag bg-emerald-100 text-emerald-700 mt-1 inline-block">
                      🎁 {program.type === "credit" ? `$${program.creditUsd} credit` : `${program.couponPct}% coupon`} for approved projects
                    </span>
                  )}
                </span>
              </label>
            );
          })}
        </div>
        <div className="flex gap-2 mt-3">
          <input className="t-input flex-1" placeholder="Other part (e.g. OBD-II breakout cable)" value={extName}
            onChange={(e) => setExtName(e.target.value)} />
          <button className="t-btn-ghost" disabled={!extName.trim()}
            onClick={() => { setExternals((a) => [...a, { name: extName.trim(), qty: 1 }]); setExtName(""); }}>
            + Add
          </button>
        </div>
        {externals.length > 0 && (
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {externals.map((e, i) => (
              <span key={i} className="t-tag bg-panel text-slate">
                {e.name}
                <button className="ml-1 text-muted hover:text-cta" onClick={() => setExternals((a) => a.filter((_, j) => j !== i))}>×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="t-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-navy">Sections {ch && <span className="text-xs text-cta font-normal">(challenges require ≥2: approach + pitfalls)</span>}</h2>
          <button className="t-btn-ghost" onClick={() => setSections((s) => [...s, { heading: "", body: "" }])}>+ Add section</button>
        </div>
        <div className="space-y-4">
          {sections.map((s, i) => (
            <div key={i} className="border border-line rounded-lg p-3 space-y-2">
              <input
                className="t-input"
                placeholder={i === 0 ? "Section heading, e.g. Approach & architecture" : "Section heading, e.g. Pitfalls"}
                value={s.heading}
                onChange={(e) => setSections((arr) => arr.map((x, j) => (j === i ? { ...x, heading: e.target.value } : x)))}
              />
              <textarea
                className="t-input min-h-[90px]"
                placeholder="Write for the next person who builds this. Failures are more useful than successes."
                value={s.body}
                onChange={(e) => setSections((arr) => arr.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)))}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Link href={ch ? `/challenges/${ch.slug}` : "/projects"} className="text-sm text-muted hover:text-slate">← Back</Link>
        <button className="t-btn-cta disabled:opacity-40" disabled={!requiredOk} onClick={publish}>
          {ch ? "Publish & submit for review" : "Publish project"}
        </button>
      </div>
    </div>
  );
}

export default function NewProjectPage() {
  return (
    <Suspense fallback={null}>
      <NewProjectForm />
    </Suspense>
  );
}
