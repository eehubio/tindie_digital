"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useApp } from "@/lib/store";

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

  const prod = products.find((p) => p.id === productId);
  const requiredOk =
    title.trim() && summary.trim() && sections.filter((s) => s.heading.trim() && s.body.trim()).length >= (ch ? 2 : 1)
    && (!ch || youtube.trim()); // challenge rules: video is hard-required

  function publish() {
    const id = "pj_" + Math.random().toString(36).slice(2, 7);
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
      tags: ch ? ["挑战作品"] : [],
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
        <h1 className="text-xl font-bold text-navy">发布开源项目</h1>
        <p className="text-sm text-muted mt-1">
          {ch
            ? `作为挑战「${ch.title}」的参赛作品发布 — 发布后自动提交审核。`
            : asSeller
            ? "以设计走读的方式介绍你的产品 — 把架构取舍和踩坑记录摊开，是建立可信度的最短路径。"
            : "在你买到的硬件上发布装机记录或改造项目。"}
        </p>
      </div>

      {ch && (
        <div className="t-card p-4 border-tag/40 bg-orange-50/40 text-sm text-slate">
          <strong className="text-navy">审核规则提醒：</strong>
          <ul className="mt-1 space-y-0.5">
            {ch.rules.filter((r) => r.required).map((r) => <li key={r.id}>· {r.label}</li>)}
          </ul>
        </div>
      )}

      <div className="t-card p-5 space-y-4">
        <div>
          <label className="t-label">关联商品（项目会出现在该商品页的 Projects 标签下）</label>
          <select className="t-input" value={productId} onChange={(e) => setProductId(e.target.value)}>
            <option value="">— 不关联 —</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
          {prod && <p className="t-hint">↳ 将链接到 /product/{prod.slug}</p>}
        </div>
        <div>
          <label className="t-label">标题</label>
          <input className="t-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例：用 PLA 做了一个 LIN 总线解码器" />
        </div>
        <div>
          <label className="t-label">摘要（一段话说清做了什么、为什么值得看）</label>
          <textarea className="t-input min-h-[70px]" value={summary} onChange={(e) => setSummary(e.target.value)} />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="t-label">GitHub 仓库</label>
            <input className="t-input" value={github} onChange={(e) => setGithub(e.target.value)} placeholder="https://github.com/…" />
          </div>
          <div>
            <label className="t-label">演示视频 {ch && <span className="text-cta">*（挑战硬性要求）</span>}</label>
            <input className="t-input" value={youtube} onChange={(e) => setYoutube(e.target.value)} placeholder="https://youtube.com/…" />
          </div>
        </div>
      </div>

      <div className="t-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-navy">正文章节 {ch && <span className="text-xs text-cta font-normal">（挑战要求 ≥2 节：方案 + 踩坑）</span>}</h2>
          <button className="t-btn-ghost" onClick={() => setSections((s) => [...s, { heading: "", body: "" }])}>+ 加一节</button>
        </div>
        <div className="space-y-4">
          {sections.map((s, i) => (
            <div key={i} className="border border-line rounded-lg p-3 space-y-2">
              <input
                className="t-input"
                placeholder={i === 0 ? "章节标题，例：方案与架构取舍" : "章节标题，例：踩坑记录"}
                value={s.heading}
                onChange={(e) => setSections((arr) => arr.map((x, j) => (j === i ? { ...x, heading: e.target.value } : x)))}
              />
              <textarea
                className="t-input min-h-[90px]"
                placeholder="正文——写给下一个复现的人看。失败记录比成功更有用。"
                value={s.body}
                onChange={(e) => setSections((arr) => arr.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)))}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Link href={ch ? `/challenges/${ch.slug}` : "/projects"} className="text-sm text-muted hover:text-slate">← 返回</Link>
        <button className="t-btn-cta disabled:opacity-40" disabled={!requiredOk} onClick={publish}>
          {ch ? "发布并提交审核" : "发布项目"}
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
