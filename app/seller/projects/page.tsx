"use client";

import { useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { declineStats, escrowTotal, ChallengeRule } from "@/lib/projects";

/**
 * Seller console for Projects & Challenges.
 *   1. Publish a product-intro project (before / during / without a preorder).
 *   2. Launch a FunPack-style challenge: N seats × deposit, a task, rules.
 *   3. Review submitted entries: approve → escrowed deposit refunds to the
 *      buyer; reject → reason required, buyer may fix and resubmit.
 * The circuit breaker is enforced in the store; this page makes it VISIBLE
 * to the seller before they hit it.
 */
export default function SellerProjectsPage() {
  const { projects, challenges, reviewEntry, showToast } = useApp();
  const products = useApp((st) => st.allProducts)().filter((p) => p.sellerName === "SuLab");
  const myProjects = projects.filter((p) => p.authorName === "SuLab");

  const [showLaunch, setShowLaunch] = useState(false);
  const [rejectDrafts, setRejectDrafts] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    productId: products[0]?.id ?? "",
    seats: 20,
    deposit: 79,
    deadline: "2026-09-30",
    task: "",
    ruleRepo: true,
    ruleProject: true,
    ruleVideo: true,
    ruleLicense: true,
  });

  function launch() {
    showToast("挑战已创建（原型演示）— 正式版会在此处冻结规则快照并开启押金托管");
    setShowLaunch(false);
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-navy">Projects · 项目与挑战</h1>
          <p className="text-sm text-muted mt-1">
            预售前、预售中、或者根本不预售——都可以用一个设计走读项目介绍产品。技术内容摊得越开，商品页越可信。
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/projects/new?as=seller&product=${products[0]?.id ?? ""}`} className="t-btn-primary">
            + 发布产品设计走读
          </Link>
          <button className="t-btn-cta" onClick={() => setShowLaunch((v) => !v)}>+ 发起挑战活动</button>
        </div>
      </div>

      {/* -------- Launch challenge form -------- */}
      {showLaunch && (
        <div className="t-card p-5 border-tag/40">
          <h2 className="font-bold text-navy mb-1">发起挑战（FunPack 模式）</h2>
          <p className="text-xs text-muted mb-4">
            拿出 N 个名额 × 押金 = 板卡价，设一个题目。买家按时完成、在 Tindie 开源发布并通过规则审核 → 押金全退，板子等于白送。
            你得到 N 份公开的真实作品，它们会卖出下一批。
          </p>
          <div className="grid sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="t-label">挑战用的商品</label>
              <select className="t-input" value={form.productId} onChange={(e) => setForm((f) => ({ ...f, productId: e.target.value }))}>
                {products.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>
            <div>
              <label className="t-label">名额</label>
              <input className="t-input" type="number" min={5} value={form.seats} onChange={(e) => setForm((f) => ({ ...f, seats: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="t-label">押金（= 板卡价，USD）</label>
              <input className="t-input" type="number" value={form.deposit} onChange={(e) => setForm((f) => ({ ...f, deposit: Number(e.target.value) }))} />
            </div>
            <div className="sm:col-span-3">
              <label className="t-label">任务 / 题目</label>
              <textarea className="t-input min-h-[70px]" value={form.task} onChange={(e) => setForm((f) => ({ ...f, task: e.target.value }))}
                placeholder="例：用本板实现任意一种串行协议解码器，越冷门越好。" />
            </div>
            <div>
              <label className="t-label">截止日期</label>
              <input className="t-input" type="date" value={form.deadline} onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))} />
            </div>
          </div>
          <div className="mt-4">
            <label className="t-label">通过规则（报名那一刻快照固定，之后不可加码）</label>
            <div className="grid sm:grid-cols-2 gap-2 text-sm">
              {[
                ["ruleRepo", "开源仓库：完整源码 + README"],
                ["ruleProject", "Tindie 项目页并关联商品（≥2 章节）"],
                ["ruleVideo", "演示视频（YouTube / Bilibili，≥2 分钟）"],
                ["ruleLicense", "开源协议（MIT / Apache-2.0 / CERN-OHL）"],
              ].map(([k, label]) => (
                <label key={k} className="flex items-center gap-2">
                  <input type="checkbox" className="accent-teal" checked={form[k as keyof typeof form] as boolean}
                    onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.checked }))} />
                  <span className="text-slate">{label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="mt-4 rounded-md bg-panel border border-line p-3 text-xs text-slate leading-relaxed">
            <strong className="text-navy">你在签署的三件事：</strong>
            ① 押金进平台托管，审核期间你拿不到；② 规则快照固定，收到作品后不能改判分标准；
            ③ 判定 ≥5 次且驳回率 &gt;40% 触发熔断——驳回锁定、整个挑战升级平台复核。
            <strong className="text-navy">一个驳回大多数作品的挑战是换了包装的骗局，结构上我们让它做不成。</strong>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button className="t-btn-ghost" onClick={() => setShowLaunch(false)}>取消</button>
            <button className="t-btn-cta disabled:opacity-40" disabled={!form.task.trim()} onClick={launch}>创建挑战</button>
          </div>
        </div>
      )}

      {/* -------- Entry review queue -------- */}
      {challenges.map((c) => {
        const stats = declineStats(c);
        const submitted = c.entries.filter((e) => e.status === "submitted");
        return (
          <div key={c.id}>
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h2 className="font-bold text-navy">{c.title}</h2>
              <span className="text-xs text-muted">托管 ${escrowTotal(c)} · 驳回率 {(stats.rate * 100).toFixed(0)}%</span>
              {c.escalated && <span className="t-tag bg-red-600 text-white">熔断 — 驳回已锁定</span>}
              <Link href={`/challenges/${c.slug}`} className="text-xs text-link hover:underline ml-auto">买家视角 →</Link>
            </div>

            {submitted.length === 0 ? (
              <div className="t-card p-5 text-center text-muted text-sm">暂无待审核作品。</div>
            ) : (
              <div className="space-y-3">
                {submitted.map((e) => {
                  const pj = projects.find((p) => p.id === e.projectId);
                  return (
                    <div key={e.id} className="t-card p-4">
                      <div className="flex items-start gap-3 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-navy">{e.buyerName}</div>
                          {pj ? (
                            <Link href={`/projects/${pj.slug}`} className="text-sm text-link hover:underline">{pj.title}</Link>
                          ) : (
                            <span className="text-sm text-muted">作品链接缺失</span>
                          )}
                          <div className="flex gap-1.5 mt-2 text-xs flex-wrap">
                            {c.rules.filter((r) => r.required).map((r: ChallengeRule) => (
                              <span key={r.id} className="t-tag bg-panel text-slate">☐ {r.label}</span>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 items-end shrink-0">
                          <button className="t-btn-primary" onClick={() => reviewEntry(c.id, e.id, true)}>
                            ✓ 通过 — 退还 ${c.depositUsd}
                          </button>
                          <div className="flex gap-1">
                            <input
                              className="t-input !w-56 !text-xs"
                              placeholder="驳回理由（买家会原文读到）"
                              value={rejectDrafts[e.id] ?? ""}
                              onChange={(ev) => setRejectDrafts((m) => ({ ...m, [e.id]: ev.target.value }))}
                              disabled={c.escalated}
                            />
                            <button
                              className="t-btn-ghost disabled:opacity-40"
                              disabled={c.escalated || !(rejectDrafts[e.id] ?? "").trim()}
                              title={c.escalated ? "熔断已触发——驳回锁定，等待平台复核" : ""}
                              onClick={() => reviewEntry(c.id, e.id, false, rejectDrafts[e.id].trim())}
                            >
                              驳回
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* -------- My projects -------- */}
      <div>
        <h2 className="font-bold text-navy mb-2">我发布的项目（{myProjects.length}）</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {myProjects.map((p) => (
            <Link key={p.id} href={`/projects/${p.slug}`} className="t-card p-4 hover:shadow-card transition block">
              <div className="font-semibold text-navy line-clamp-1">{p.title}</div>
              <div className="text-xs text-muted mt-1">♥ {p.likes} · 更新于 {p.updatedAt}</div>
            </Link>
          ))}
        </div>
        <p className="t-hint mt-2">
          设计走读发布后自动出现在商品页的 Projects 标签下。预售前发它是在攒可信度，预售中发它是在回答犹豫者的问题。
        </p>
      </div>
    </div>
  );
}
