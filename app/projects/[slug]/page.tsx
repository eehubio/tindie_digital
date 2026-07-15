"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useApp } from "@/lib/store";

export default function ProjectDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { projects, likeProject, challenges } = useApp();
  const products = useApp((st) => st.allProducts)();
  const p = projects.find((x) => x.slug === slug);

  if (!p) return <div className="t-card p-10 text-center text-muted">项目不存在。</div>;

  const prod = products.find((x) => x.id === p.productId);
  const ch = challenges.find((c) => c.id === p.challengeId);
  const entry = ch?.entries.find((e) => e.projectId === p.id);

  return (
    <div className="max-w-3xl space-y-5">
      <div className={`rounded-lg h-40 bg-gradient-to-br ${p.coverGradient}`} />

      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="t-tag bg-navy text-white">
            {p.kind === "product_intro" ? "产品设计走读" : p.kind === "build_log" ? "装机记录" : "挑战作品"}
          </span>
          <span className="text-sm text-muted">
            by <strong className={p.authorRole === "seller" ? "text-teal-dark" : "text-navy"}>{p.authorName}</strong>
            （{p.authorRole === "seller" ? "卖家" : "买家"}） · 更新于 {p.updatedAt}
          </span>
          <button className="ml-auto t-btn-ghost" onClick={() => likeProject(p.id)}>♥ {p.likes}</button>
        </div>
        <h1 className="text-2xl font-bold text-navy mt-2">{p.title}</h1>
        <p className="text-slate mt-2">{p.summary}</p>
        <div className="flex gap-1.5 mt-3 flex-wrap">
          {p.tags.map((t) => <span key={t} className="t-tag bg-panel text-slate">{t}</span>)}
        </div>
      </div>

      {/* Links row — the URL enrichment the listing gains credibility from */}
      <div className="flex gap-2 flex-wrap">
        {p.githubUrl && (
          <a href={p.githubUrl} target="_blank" rel="noreferrer" className="t-btn-ghost">⌥ GitHub 仓库</a>
        )}
        {p.youtubeUrl && (
          <a href={p.youtubeUrl} target="_blank" rel="noreferrer" className="t-btn-ghost">▶ 演示视频</a>
        )}
        {prod && (
          <Link href={`/product/${prod.slug}`} className="t-btn-primary">查看关联商品：{prod.title} →</Link>
        )}
      </div>

      {/* Challenge context */}
      {ch && (
        <div className="t-card p-4 border-tag/40 bg-orange-50/40">
          <div className="text-sm text-slate">
            本项目是 <Link href={`/challenges/${ch.slug}`} className="text-link font-semibold hover:underline">{ch.title}</Link> 的参赛作品
            {entry?.status === "approved" && (
              <span className="t-tag bg-emerald-100 text-emerald-700 ml-2">✓ 已通过审核 · 押金 ${ch.depositUsd} 已退还</span>
            )}
          </div>
        </div>
      )}

      {/* Sections — the hackaday.io body */}
      <div className="space-y-4">
        {p.sections.map((s, i) => (
          <div key={i} className="t-card p-5 bg-white">
            <h2 className="font-bold text-navy mb-2">{s.heading}</h2>
            <p className="text-sm text-slate leading-relaxed whitespace-pre-wrap">{s.body}</p>
          </div>
        ))}
      </div>

      {prod && (
        <p className="t-hint">
          这个项目页同时出现在商品「{prod.title}」的 Projects 标签下——技术内容留在商品旁边，才能把可信度变成转化率。
        </p>
      )}
    </div>
  );
}
