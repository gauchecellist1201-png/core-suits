/**
 * AI 原価表
 * ---------------------------------------------------------------------------
 * 出典（2026-09-08 時点で確認）:
 *   Gemini API 料金 https://ai.google.dev/gemini-api/docs/pricing
 *   Claude API 料金 https://platform.claude.com/docs/en/about-claude/pricing
 *
 * ★ 料金は変わる。ここは「確認した日付つきの表」であって永遠の真実ではない。
 *   為替も動くので SUITS_USD_JPY で上書きできるようにしてある。
 *   実際の請求と突き合わせる手順は docs/core-suits/UNIT_ECONOMICS.md にある。
 */

export interface ModelRate {
  /** 入力 100万トークンあたり USD */
  inputUsdPerMTok: number;
  /** 出力 100万トークンあたり USD（画像出力もトークンで課金される） */
  outputUsdPerMTok: number;
  /** 各社が公表している1枚あたりの目安 USD（出力ぶんのみ。入力画像は含まない） */
  referencePerImageUsd?: number;
  /**
   * 実測の平均トークン数（顧客写真＋生地写真＋指示書を渡した1回ぶん）。
   * ★ 見積りはこちらから出す。公表の「1枚あたり」は出力ぶんだけなので、
   *   入力画像2枚を渡すこの用途では 3割ほど安く見えてしまう。
   */
  typicalTokens?: { input: number; output: number };
}

export const RATES: Record<string, ModelRate> = {
  // 画像（試着生成）
  "gemini-3.1-flash-image": {
    inputUsdPerMTok: 0.5, outputUsdPerMTok: 60, referencePerImageUsd: 0.067,
    typicalTokens: { input: 981, output: 1404 }, // 2026-09-08 実測4回の平均
  },
  "gemini-3-pro-image": { inputUsdPerMTok: 2, outputUsdPerMTok: 120, referencePerImageUsd: 0.134 },
  "gemini-2.5-flash-image": { inputUsdPerMTok: 0.3, outputUsdPerMTok: 30, referencePerImageUsd: 0.039 },
  // 文章（スタイリストの理由づけ）
  "claude-haiku-4-5-20251001": { inputUsdPerMTok: 1, outputUsdPerMTok: 5 },
  "claude-sonnet-5": { inputUsdPerMTok: 2, outputUsdPerMTok: 10 },
};

export const RATES_CHECKED_ON = "2026-09-08";

/** 円換算レート。動くので設定で上書きできる。 */
export function usdJpy(): number {
  const v = Number(process.env.SUITS_USD_JPY);
  return Number.isFinite(v) && v > 0 ? v : 155;
}

export function rateFor(model: string): ModelRate | null {
  return RATES[model] ?? null;
}

/** トークン実測から円の原価を出す。料金表に無いモデルは 0 ではなく null（＝不明）を返す。 */
export function costJpy(model: string, inputTokens: number, outputTokens: number): number | null {
  const r = rateFor(model);
  if (!r) return null;
  const usd = (inputTokens / 1e6) * r.inputUsdPerMTok + (outputTokens / 1e6) * r.outputUsdPerMTok;
  return round2(usd * usdJpy());
}

/**
 * 生成前の見積り。実測トークンがある型は必ずそちらを使う。
 * （安く見せる見積りは、原価を読み違えさせるので害がある）
 */
export function estimateImageCostJpy(model: string): number {
  const r = rateFor(model);
  if (!r) return 0;
  if (r.typicalTokens) {
    return costJpy(model, r.typicalTokens.input, r.typicalTokens.output) ?? 0;
  }
  if (!r.referencePerImageUsd) return 0;
  return round2(r.referencePerImageUsd * usdJpy());
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
