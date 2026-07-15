"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useApp } from "@/lib/store";
import { escrowTotal, declineStats } from "@/lib/projects";

const STATUS_TONE: Record<string, string> = {
  building: "bg-panel text-slate",
  submitted: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  forfeited: "bg-panel text-muted",
};
const STATUS_LABEL: Record<string, string> = {
  building: "制作中",
  submitted: "待审核",
  approved: "已通过 · 押金已退",
  rejected: "已驳回（可修复重提）",
  forfeited: "逾期未交",
};

export default function ChallengeDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { challenges, joinChallenge, projects } = useApp();
  const products = useApp((st) => st.allProducts)();
  const c = challenges.find((x) => x.slug === slug);

  if (!c) return <div className="t-card p-10 text-center text-muted">挑战不存在。</div>;

  const prod = products.find((x) => x.id === c.productId);
  const stats = declineStats(c);
  const approved = c.entries.filter((e) => e.status === "approved").length;
  const mine = c.entries.find((e) => e.buyerName === "you (demo)");
  const seatsLeft = c.seats - c.seatsTaken;

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="t-tag bg-tag text-white">挑战活动</span>
          <span className={`t-tag ${c.status === "open" ? "bg-teal-light text-teal-dark" : "bg-panel text-slate"}`}>
            {c.status === "open" ? "报名进行中" : c.status === "judging" ? "评审中" : "已结束"}
          </span>
          {c.escalated && <span className="t-tag bg-red-600 text-white">⚠ 熔断触发 — 平台复核中</span>}
        </div>
        <h1 className="text-2xl font-bold text-navy mt-2">{c.title}</h1>
        <p className="text-sm text-muted mt-1">
          由 <strong className="text-teal-dark">{c.sellerName}</strong> 发起 · {c.opensAt} 开始 · <strong className="text-navy">{c.deadline}</strong> 截止
        </p>
      </div>

      {/* -------- The deal, stated as arithmetic -------- */}
      <div className="grid sm:grid-cols-4 gap-3">
        <div className="t-card p-4 text-center">
          <div className="text-2xl font-bold text-navy">${c.depositUsd}</div>
          <div className="text-xs text-muted mt-1">押金（= 板卡价格）<br />完成即全额退还</div>
        </div>
        <div className="t-card p-4 text-center">
          <div className="text-2xl font-bold text-navy">{c.seatsTaken}<span className="text-muted text-base">/{c.seats}</span></div>
          <div className="text-xs text-muted mt-1">名额</div>
        </div>
        <div className="t-card p-4 text-center">
          <div className="text-2xl font-bold text-ok">{approved}</div>
          <div className="text-xs text-muted mt-1">已通过 · 已退款</div>
        </div>
        <div className="t-card p-4 text-center">
          <div className="text-2xl font-bold text-navy">${escrowTotal(c)}</div>
          <div className="text-xs text-muted mt-1">平台托管中<br />（未决作品的押金）</div>
        </div>
      </div>

      {/* -------- Sponsors -------- */}
      {c.sponsors.length > 0 && (
        <div className="t-card p-4 flex items-center gap-4 flex-wrap">
          {c.sponsors.map((sp) => (
            <div key={sp.name} className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-md bg-red-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                {sp.logoToken}
              </span>
              <div>
                <div className="font-bold text-navy text-sm">{sp.name} 赞助</div>
                <div className="text-xs text-muted">{sp.contribution}</div>
              </div>
            </div>
          ))}
          <p className="text-xs text-muted basis-full">
            赞助商承担名额押金或提供奖励，换取活动页与所有参赛项目页上的品牌露出——流量跟着开源作品走。
          </p>
        </div>
      )}

      {/* -------- Task + rules -------- */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="t-card p-5">
          <h2 className="font-bold text-navy mb-2">任务</h2>
          <p className="text-sm text-slate leading-relaxed">{c.task}</p>
          {prod && (
            <Link href={`/product/${prod.slug}`} className="t-btn-ghost mt-3 inline-block">
              使用的硬件：{prod.title} →
            </Link>
          )}
        </div>
        <div className="t-card p-5">
          <h2 className="font-bold text-navy mb-2">通过规则（审核以此为准，不接受临时加码）</h2>
          <ul className="space-y-2">
            {c.rules.map((r) => (
              <li key={r.id} className="flex items-start gap-2 text-sm">
                <span className={`t-tag shrink-0 ${r.required ? "bg-navy text-white" : "bg-panel text-slate"}`}>
                  {r.required ? "必须" : "加分"}
                </span>
                <span className="text-slate">{r.label}</span>
              </li>
            ))}
          </ul>
          <p className="t-hint mt-3">
            规则在报名那一刻快照固定——卖家不能在收到作品之后再改判分标准，这和授权条款哈希是同一个原则。
          </p>
        </div>
      </div>

      {/* -------- How the money moves -------- */}
      <div className="t-card p-4 bg-panel/60 text-sm text-slate leading-relaxed">
        <strong className="text-navy">钱怎么走：</strong>报名时支付 ${c.depositUsd} 押金 →
        押金进入<strong className="text-navy">平台托管</strong>（不打给卖家）→ 截止日期前提交作品 →
        卖家按上方规则审核 → <strong className="text-ok">通过：押金原路全额退还</strong>（Stripe 托管退款，可追溯通道）；
        驳回：附理由，截止前可修复重提；逾期未交：押金释放给卖家（等于按原价买了板子）。
        <span className="text-muted">托管的意义：审核期间钱不在任何一方手里，双方都没有拖延的动机。</span>
      </div>

      {/* -------- Circuit breaker status -------- */}
      <div className={`t-card p-4 ${c.escalated ? "border-red-300 bg-red-50/50" : ""}`}>
        <div className="flex items-center gap-3 flex-wrap text-sm">
          <strong className="text-navy">争议熔断器</strong>
          <span className="text-muted">
            判定 {stats.decisions} 次 · 驳回 {stats.rejections} 次 · 驳回率 {(stats.rate * 100).toFixed(0)}%
          </span>
          <span className={`t-tag ml-auto ${stats.tripped ? "bg-red-600 text-white" : "bg-emerald-100 text-emerald-700"}`}>
            {stats.tripped ? "已熔断" : "正常"}
          </span>
        </div>
        <p className="text-xs text-muted mt-2">
          规则（Projects PRD v1.0 §11）：判定 ≥5 次且驳回率 &gt;40% 时，卖家的「驳回」操作被锁定，整个挑战升级平台复核（「通过」不受影响）。
          一个驳回大多数作品的挑战，是换了包装的骗局——熔断器让它在结构上不可行。
        </p>
      </div>

      {/* -------- Join / my entry -------- */}
      {mine ? (
        <div className="t-card p-4 border-teal/40 bg-teal-light/30">
          <div className="flex items-center gap-3 flex-wrap">
            <strong className="text-navy text-sm">我的参赛状态</strong>
            <span className={`t-tag ${STATUS_TONE[mine.status]}`}>{STATUS_LABEL[mine.status]}</span>
            {mine.status === "building" && (
              <Link href={`/projects/new?challenge=${c.id}&entry=${mine.id}&product=${c.productId}`} className="t-btn-cta ml-auto">
                发布作品并提交审核 →
              </Link>
            )}
          </div>
        </div>
      ) : c.status === "open" && seatsLeft > 0 ? (
        <button className="t-btn-cta w-full py-3" onClick={() => joinChallenge(c.id)}>
          支付 ${c.depositUsd} 押金加入挑战（剩 {seatsLeft} 个名额）— 完成即免费
        </button>
      ) : (
        <div className="t-card p-4 text-center text-muted text-sm">名额已满或报名已截止。</div>
      )}

      {/* -------- Entries board -------- */}
      <div>
        <h2 className="font-bold text-navy mb-2">参赛榜（{c.entries.length}）</h2>
        <div className="t-card overflow-hidden">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-line">
              {c.entries.map((e) => {
                const pj = projects.find((p) => p.id === e.projectId);
                return (
                  <tr key={e.id}>
                    <td className="px-4 py-2.5 font-semibold text-navy">{e.buyerName}</td>
                    <td className="px-4 py-2.5">
                      {pj ? (
                        <Link href={`/projects/${pj.slug}`} className="text-link hover:underline">{pj.title}</Link>
                      ) : (
                        <span className="text-muted text-xs">尚未提交</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={`t-tag ${STATUS_TONE[e.status]}`}>{STATUS_LABEL[e.status]}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {c.entries.some((e) => e.status === "rejected") && (
          <p className="t-hint mt-2">
            被驳回的作品能看到具体理由，截止日期前可以修复后重新提交——驳回是一次修改要求，不是终审。
          </p>
        )}
      </div>
    </div>
  );
}
