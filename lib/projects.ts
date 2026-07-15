// ============================================================================
// Open Projects & Challenges (FunPack model)
//
// Two things live here, and the second is built on the first:
//
// 1. OPEN PROJECTS — hackaday.io-style project pages, publishable by SELLERS
//    (to introduce a product before/during/without a preorder: schematics
//    walkthrough, design decisions, firmware notes — the technical depth that
//    makes a listing credible) and by BUYERS (build logs on hardware they
//    bought, initiated directly from their library).
//
// 2. CHALLENGES — the 电子森林 FunPack mechanism: the seller (or a sponsor)
//    puts up N units at a deposit price and sets a task. Buy a seat, complete
//    the task before the deadline, publish an open project on Tindie that
//    meets the rules (completeness, format, video) — and the deposit comes
//    back. The buyer effectively gets the hardware free for shipping a real
//    project; the seller gets N public builds; the platform gets content that
//    sells the next batch.
//
// The money mechanics matter: deposits are held in ESCROW on the platform
// balance (never paid out to the seller while entries are pending), so the
// refund is always recoverable — this is a Stripe-corridor product by design.
//
// Governance: a challenge where the seller rejects most submissions is a scam
// with extra steps. The DISPUTE CIRCUIT BREAKER (from Projects PRD v1.0 §11):
// once a seller has made ≥5 decisions and their decline rate exceeds 40%,
// further rejections are blocked and the whole challenge escalates to
// platform review. The seller can still APPROVE while escalated.
// ============================================================================

export type ProjectKind = "product_intro" | "build_log" | "challenge_entry";

export interface ProjectSection {
  heading: string;
  body: string;
}

export interface OpenProject {
  id: string;
  slug: string;
  title: string;
  authorName: string;
  authorRole: "seller" | "buyer";
  kind: ProjectKind;
  /** The listing this project is attached to — the credibility link. */
  productId?: string;
  challengeId?: string;
  summary: string;
  sections: ProjectSection[];
  tags: string[];
  githubUrl?: string;
  youtubeUrl?: string;
  coverGradient: string;
  likes: number;
  createdAt: string;
  updatedAt: string;
}

export type EntryStatus =
  | "building" // seat claimed, work in progress
  | "submitted" // project published, awaiting seller review
  | "approved" // rules met → deposit refund issued
  | "rejected" // rules not met, reason attached, may resubmit before deadline
  | "forfeited"; // deadline passed without submission — deposit released to seller

export interface ChallengeEntry {
  id: string;
  challengeId: string;
  buyerName: string;
  projectId?: string;
  status: EntryStatus;
  decidedAt?: string;
  reason?: string;
}

export interface ChallengeSponsor {
  name: string;
  logoToken: string;
  contribution: string; // "承担 10 个名额的押金" / "提供元器件礼包"
}

export interface ChallengeRule {
  id: string;
  label: string;
  required: boolean;
}

export interface Challenge {
  id: string;
  slug: string;
  title: string;
  sellerName: string;
  productId: string;
  productTitle: string;
  /** Deposit per seat — refunded on an approved submission. */
  depositUsd: number;
  seats: number;
  seatsTaken: number;
  task: string;
  rules: ChallengeRule[];
  opensAt: string;
  deadline: string;
  status: "open" | "judging" | "completed";
  sponsors: ChallengeSponsor[];
  entries: ChallengeEntry[];
  /** Circuit breaker (PRD v1.0 §11): set true when decline rate > 40% over ≥5 decisions. */
  escalated: boolean;
}

// ---------------------------------------------------------------------------
// Seeds
// ---------------------------------------------------------------------------

export const seedProjects: OpenProject[] = [
  {
    id: "pj_pocket_intro",
    slug: "pocket-instrument-design-walkthrough",
    title: "Pocket Instrument：从需求到 4 层板的完整设计走读",
    authorName: "SuLab",
    authorRole: "seller",
    kind: "product_intro",
    productId: "dp_pocket_assembled",
    summary:
      "为什么选 RP2350 而不是 STM32H7、模拟前端如何做到 ±20V 输入、4 层板的叠层与阻抗控制、以及三次打样各自失败在哪里。把设计过程摊开，是让买家相信这块板子的最短路径。",
    sections: [
      {
        heading: "架构取舍：RP2350 的 PIO 就是这台仪器的灵魂",
        body: "示波器 + 逻辑分析仪 + 信号发生器塞进口袋，瓶颈从来不是主频而是采样通路。RP2350 的 12 个 PIO 状态机可以在不占用 CPU 的情况下做 100 MS/s 的采集编排——这是任何同价位 Cortex-M7 做不到的。代价是模拟性能完全靠外置 AFE，于是有了下一节。",
      },
      {
        heading: "模拟前端：±20V 输入范围的三次迭代",
        body: "v0.1 用继电器切换衰减，太贵且有寿命问题；v0.2 换成模拟开关，通道间串扰超标；v1.0 定稿为固定 20:1 衰减 + 可编程增益放大器，BOM 成本降了 $3.20，串扰 −68 dB。三版原理图都在仓库的 /hw/afe-history 目录里。",
      },
      {
        heading: "打样失败记录（这一节比成功更有用）",
        body: "第一次：USB-C CC 电阻画成了上拉，被有源线缆识别为 DFP，无法枚举。第二次：晶振离 PIO 采样时钟走线太近，100 MS/s 下出现 0.3% 的采样抖动。第三次通过。所有失败的 Gerber 也保留在仓库里——买这块板的人应该知道它踩过哪些坑。",
      },
    ],
    tags: ["RP2350", "测量仪器", "4层板", "KiCad 8"],
    githubUrl: "https://github.com/sulab/pocket-instrument",
    youtubeUrl: "https://youtube.com/watch?v=demo_pocket_intro",
    coverGradient: "from-teal-600 to-emerald-800",
    likes: 214,
    createdAt: "2026-06-18",
    updatedAt: "2026-07-10",
  },
  {
    id: "pj_can_sniffer",
    slug: "can-bus-decoder-on-pocket-logic-analyzer",
    title: "用 Pocket Logic Analyzer 做了一个 CAN 总线实时解码器",
    authorName: "hw_elena",
    authorRole: "buyer",
    kind: "challenge_entry",
    productId: "dp_logic_preorder",
    challengeId: "ch_pla_batch2",
    summary:
      "挑战任务是「用 PLA 实现一个协议解码器」。我选了 CAN 2.0B：PIO 捕获 + 上位机 Python 解码 + 一个把报文映射到 DBC 信号的小 GUI。视频里演示了在真车 OBD 口上的实时抓包。",
    sections: [
      {
        heading: "为什么不用现成的 candump",
        body: "candump 需要 CAN 收发器和 SocketCAN，而挑战的意义是证明 PLA 的原始采样能力。我直接在 CAN_H/CAN_L 差分信号上采样，用软件做位定时恢复——采样率 100 MS/s 对 500 kbps 的 CAN 来说奢侈到可以做 200 倍过采样。",
      },
      {
        heading: "踩坑：位填充（bit stuffing）",
        body: "解码器第一版在长报文上必然出错，查了两晚上发现是没处理 CAN 的 5 位填充规则。这类协议细节正是这种挑战活动的价值——datasheet 上一行字，实现起来一个晚上。",
      },
    ],
    tags: ["CAN", "逻辑分析仪", "Python", "挑战作品"],
    githubUrl: "https://github.com/elena-hw/pla-can-decoder",
    youtubeUrl: "https://youtube.com/watch?v=demo_can_decoder",
    coverGradient: "from-amber-500 to-orange-800",
    likes: 87,
    createdAt: "2026-07-09",
    updatedAt: "2026-07-12",
  },
  {
    id: "pj_kit_buildlog",
    slug: "pocket-instrument-kit-build-log",
    title: "Pocket Instrument 套件装机记录：两小时、一台热风枪、零返工",
    authorName: "mkr_jensen",
    authorRole: "buyer",
    kind: "build_log",
    productId: "dp_pocket_bundle",
    summary:
      "买的是套件+源文件的 bundle。这篇记录焊接顺序、QFN-60 的热风参数、以及固件首次点亮时的校准流程。给后来人一份可复制的装机清单。",
    sections: [
      {
        heading: "QFN-60 手工贴装参数",
        body: "锡膏 SAC305，热风 320°C / 风量 40%，预热 90 秒。诀窍是先固定对角两个引脚位置再整体回流——官方文档没写这一步，但它把我的成功率从 50% 提到了 100%（样本量 2，诚实声明）。",
      },
    ],
    tags: ["装机记录", "QFN", "热风返修"],
    githubUrl: "",
    youtubeUrl: "https://youtube.com/watch?v=demo_buildlog",
    coverGradient: "from-indigo-600 to-violet-900",
    likes: 41,
    createdAt: "2026-07-11",
    updatedAt: "2026-07-11",
  },
];

export const seedChallenges: Challenge[] = [
  {
    id: "ch_pla_batch2",
    slug: "pla-protocol-decoder-challenge",
    title: "Pocket Logic Analyzer 协议解码挑战 · 第 1 期",
    sellerName: "SuLab",
    productId: "dp_logic_preorder",
    productTitle: "Pocket Logic Analyzer — Batch 2",
    depositUsd: 79,
    seats: 20,
    seatsTaken: 14,
    task:
      "用 Pocket Logic Analyzer 实现任意一种串行协议的解码器（UART/SPI/I²C 之外：CAN、LIN、1-Wire、DALI、SWD……越冷门越好），在 Tindie 上开源发布完整项目，并附一段演示视频。按时完成且通过审核，$79 押金全额退还——相当于板子白送。",
    rules: [
      { id: "r_repo", label: "开源仓库：完整源码 + README（含复现步骤）", required: true },
      { id: "r_project", label: "在 Tindie 发布项目页并关联本产品（至少 2 个章节：方案 + 踩坑）", required: true },
      { id: "r_video", label: "YouTube / Bilibili 演示视频（≥2 分钟，展示实际解码过程）", required: true },
      { id: "r_license", label: "开源协议：MIT / Apache-2.0 / CERN-OHL 任选", required: true },
      { id: "r_bonus", label: "加分项：解码逻辑跑在 PIO 上而非上位机", required: false },
    ],
    opensAt: "2026-06-25",
    deadline: "2026-08-15",
    status: "open",
    sponsors: [
      {
        name: "DigiKey",
        logoToken: "DK",
        contribution: "赞助 10 个名额的押金，并为每位完成者提供 $25 元器件代金券",
      },
    ],
    entries: [
      { id: "en_1", challengeId: "ch_pla_batch2", buyerName: "hw_elena", projectId: "pj_can_sniffer", status: "approved", decidedAt: "2026-07-13" },
      { id: "en_2", challengeId: "ch_pla_batch2", buyerName: "probe_master", status: "building" },
      { id: "en_3", challengeId: "ch_pla_batch2", buyerName: "mkr_jensen", status: "building" },
      { id: "en_4", challengeId: "ch_pla_batch2", buyerName: "fpga_wanderer", status: "submitted" },
      { id: "en_5", challengeId: "ch_pla_batch2", buyerName: "uart_hermit", status: "rejected", decidedAt: "2026-07-12", reason: "视频缺失——规则 3 是硬性要求。截止日期前可修复后重新提交。" },
    ],
    escalated: false,
  },
];

// ---------------------------------------------------------------------------
// Circuit breaker (Projects PRD v1.0 §11)
// ---------------------------------------------------------------------------
export const CIRCUIT_BREAKER = { minDecisions: 5, maxDeclineRate: 0.4 };

export function declineStats(c: Challenge) {
  const decided = c.entries.filter((e) => e.status === "approved" || e.status === "rejected");
  const rejected = decided.filter((e) => e.status === "rejected");
  const rate = decided.length > 0 ? rejected.length / decided.length : 0;
  return {
    decisions: decided.length,
    rejections: rejected.length,
    rate,
    tripped: decided.length >= CIRCUIT_BREAKER.minDecisions && rate > CIRCUIT_BREAKER.maxDeclineRate,
  };
}

export function escrowTotal(c: Challenge) {
  // Deposits held until each entry resolves. Approved → refunded to buyer.
  // Forfeited → released to seller. Nothing pays out while pending.
  const pending = c.entries.filter((e) => e.status === "building" || e.status === "submitted").length;
  return pending * c.depositUsd;
}
