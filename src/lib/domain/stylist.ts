import type {
  Customer, Fabric, Purchase, SalesKnowledge, UseCase,
} from "./types";

/**
 * 相性のルール（AI を呼ぶ前に必ず通る、店舗の判断ロジック）
 * ---------------------------------------------------------------------------
 * ここが CORE Suits の差別化の中心。汎用 AI が持っていないもの＝
 *   ・その店に「実際にある」生地だけを候補にする
 *   ・その顧客が「すでに持っている」ものを避ける
 *   ・その店の接客ノウハウを効かせる
 * を、点数として先に決める。AI は理由を日本語にする係であって、候補を決める係ではない。
 * こうすると AI が落ちても提案は出るし、原価も上がらない。
 */

export interface ScoreFactor {
  label: string;
  delta: number;
}

export interface ScoredFabric {
  fabric: Fabric;
  score: number;
  factors: ScoreFactor[];
  /** 効いた店舗ノウハウ */
  knowledgeIds: string[];
}

const COLOR_BY_USE: Record<UseCase, string[]> = {
  business: ["navy", "charcoal", "grey"],
  wedding: ["navy", "grey", "charcoal"],
  executive_meeting: ["charcoal", "navy"],
  sales: ["navy", "blue", "grey"],
  formal: ["black", "charcoal", "navy"],
  casual: ["brown", "beige", "green", "blue"],
  party: ["navy", "charcoal", "black"],
  ceremony: ["black", "charcoal"],
};

const PATTERN_BY_STYLE: Record<string, string[]> = {
  classic: ["solid", "pinstripe", "herringbone"],
  modern: ["solid", "birdseye", "check"],
  british: ["glen_check", "stripe", "herringbone", "windowpane"],
  italian: ["solid", "birdseye", "check"],
  minimal: ["solid", "birdseye"],
};

/** 肌の色と相性がよい色の系統（強い断定はしない。加点は控えめ） */
const COLOR_BY_SKIN: Record<string, string[]> = {
  fair: ["navy", "grey", "blue"],
  light: ["navy", "charcoal", "grey"],
  medium: ["navy", "charcoal", "brown"],
  olive: ["charcoal", "brown", "green"],
  dark: ["charcoal", "navy", "brown"],
};

export function seasonForMonth(month: number): "spring_summer" | "autumn_winter" {
  // 3〜8月＝春夏、9〜2月＝秋冬（日本の実売の切り替わりに合わせる）
  return month >= 3 && month <= 8 ? "spring_summer" : "autumn_winter";
}

export interface ScoreContext {
  customer: Customer;
  purchases: Purchase[];
  knowledge: SalesKnowledge[];
  /** 用途を上書きしたいとき（「結婚式なら？」など） */
  useCase?: UseCase;
  now?: Date;
}

export function scoreFabric(fabric: Fabric, ctx: ScoreContext): ScoredFabric {
  const { customer, purchases, knowledge } = ctx;
  const now = ctx.now ?? new Date();
  const factors: ScoreFactor[] = [];
  const knowledgeIds: string[] = [];
  let score = 50;

  const add = (label: string, delta: number) => {
    if (delta === 0) return;
    factors.push({ label, delta });
    score += delta;
  };

  // 1. 在庫。無い生地は勧めない（店頭で「それは今ありません」は最悪の体験）
  if (fabric.archived) add("取り扱い終了", -100);
  else if (fabric.stock_m !== undefined && fabric.stock_m <= 0) add("在庫切れ", -40);

  // 2. 季節
  const season = seasonForMonth(now.getMonth() + 1);
  if (fabric.season === season) add(season === "autumn_winter" ? "今の季節（秋冬）に合う" : "今の季節（春夏）に合う", 12);
  else if (fabric.season === "all_season") add("通年で着られる", 6);
  else add("季節が今と逆", -10);

  // 3. 用途
  const use = ctx.useCase ?? customer.primary_use_case;
  if (use) {
    const ok = COLOR_BY_USE[use] ?? [];
    if (ok.includes(fabric.color_family)) add(`${useCaseLabel(use)}に向く色`, 12);
    if ((use === "formal" || use === "ceremony") && fabric.pattern !== "solid") add("式典には柄が強い", -12);
    if (use === "casual" && fabric.pattern === "solid" && fabric.color_family === "charcoal") add("カジュアルには硬い", -6);
  }

  // 4. すでに持っているもの（＝次の1着の考え方。ここが再購入提案の核）
  const ownedFabricIds = new Set(purchases.map((p) => p.fabric_id).filter(Boolean) as string[]);
  if (ownedFabricIds.has(fabric.id)) add("すでに同じ生地をご購入済み", -35);

  // 5. 好みの色・スタイル
  if (customer.preferred_colors.some((c) => normalizeColor(c) === fabric.color_family)) {
    add("お好みの色", 10);
  }
  if (customer.preferred_style) {
    const patterns = PATTERN_BY_STYLE[customer.preferred_style] ?? [];
    if (patterns.includes(fabric.pattern)) add(`${styleLabel(customer.preferred_style)}の好みに合う柄`, 8);
  }

  // 6. 肌の色（控えめな加点のみ。減点はしない）
  if (customer.skin_tone) {
    const ok = COLOR_BY_SKIN[customer.skin_tone] ?? [];
    if (ok.includes(fabric.color_family)) add("肌の色となじむ", 6);
  }

  // 7. 体型（大柄な柄は体格を強調する）
  if (customer.body_type === "sturdy" && (fabric.pattern === "windowpane" || fabric.pattern === "check")) {
    add("大きい柄は体格を強調しやすい", -8);
  }
  if ((customer.body_type === "slim" || customer.body_type === "tall_slim") && fabric.pattern === "pinstripe") {
    add("縦の線が身長を活かす", 6);
  }

  // 8. 価格帯（過去の購入額に近い帯を上に）
  const avg = purchases.length ? purchases.reduce((s, p) => s + p.amount_jpy, 0) / purchases.length : 0;
  if (avg > 0) {
    const tier = tierForAmount(avg);
    if (fabric.price_tier === tier) add("これまでのご予算帯に近い", 8);
    else if (tierRank(fabric.price_tier) > tierRank(tier) + 1) add("ご予算帯より上", -10);
  }

  // 9. 店舗のノウハウ
  for (const k of knowledge) {
    if (matchesKnowledge(k, customer, fabric, use)) {
      add(`店舗ノウハウ: ${k.title}`, 12);
      knowledgeIds.push(k.id);
    }
  }

  return { fabric, score: clamp(score), factors, knowledgeIds };
}

export function rankFabrics(fabrics: Fabric[], ctx: ScoreContext, limit = 3): ScoredFabric[] {
  return fabrics
    .map((f) => scoreFabric(f, ctx))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.fabric.name.localeCompare(b.fabric.name))
    .slice(0, limit);
}

/**
 * 「次の1着」用の並べ替え。過去に買った色は下げ、着回しが広がる色を上げる。
 * 台帳に色の系統が残っていない購入は無視する（推測で下げない）。
 */
export function rankNextSuit(
  fabrics: Fabric[], ctx: ScoreContext, ownedColorFamilies: string[], limit = 3,
): ScoredFabric[] {
  const owned = new Set(ownedColorFamilies);
  return fabrics
    .map((f) => {
      const s = scoreFabric(f, ctx);
      if (owned.has(f.color_family)) {
        s.factors.push({ label: "同系色をすでにお持ち", delta: -18 });
        s.score = clamp(s.score - 18);
      } else if (owned.size > 0) {
        s.factors.push({ label: "お手持ちと重ならない", delta: 10 });
        s.score = clamp(s.score + 10);
      }
      return s;
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.fabric.name.localeCompare(b.fabric.name))
    .slice(0, limit);
}

function matchesKnowledge(k: SalesKnowledge, c: Customer, f: Fabric, use?: UseCase): boolean {
  const a = k.applies_to ?? {};
  const empty = !a.use_cases?.length && a.age_min === undefined && a.age_max === undefined
    && !a.price_tiers?.length && !a.color_families?.length;
  if (empty) return false; // 条件のないノウハウは全件に加点しない（順位が動かず意味がないため）
  if (a.use_cases?.length && (!use || !a.use_cases.includes(use))) return false;
  if (a.age_min !== undefined && (c.age === undefined || c.age < a.age_min)) return false;
  if (a.age_max !== undefined && (c.age === undefined || c.age > a.age_max)) return false;
  if (a.price_tiers?.length && !a.price_tiers.includes(f.price_tier)) return false;
  if (a.color_families?.length && !a.color_families.includes(f.color_family)) return false;
  return true;
}

export function normalizeColor(name: string): string {
  const s = name.toLowerCase();
  if (/navy|ネイビー|紺/.test(s)) return "navy";
  if (/charcoal|チャコール/.test(s)) return "charcoal";
  if (/grey|gray|グレ/.test(s)) return "grey";
  if (/brown|ブラウン|茶/.test(s)) return "brown";
  if (/black|ブラック|黒/.test(s)) return "black";
  if (/beige|ベージュ/.test(s)) return "beige";
  if (/green|グリーン|緑/.test(s)) return "green";
  if (/blue|ブルー|青/.test(s)) return "blue";
  return "other";
}

function tierForAmount(jpy: number): "entry" | "standard" | "premium" | "luxury" {
  if (jpy < 80_000) return "entry";
  if (jpy < 150_000) return "standard";
  if (jpy < 300_000) return "premium";
  return "luxury";
}
function tierRank(t: string): number {
  return ["entry", "standard", "premium", "luxury"].indexOf(t);
}
function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function useCaseLabel(u: UseCase): string {
  return {
    business: "ビジネス", wedding: "結婚式", executive_meeting: "経営者の会談",
    sales: "営業", formal: "フォーマル", casual: "カジュアル", party: "パーティー", ceremony: "式典",
  }[u];
}
export function styleLabel(s: string): string {
  return ({ classic: "クラシック", modern: "モダン", british: "ブリティッシュ", italian: "イタリアン", minimal: "ミニマル" } as Record<string, string>)[s] ?? s;
}
