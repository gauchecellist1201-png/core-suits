import "server-only";
import { getStore } from "@/lib/db";
import type { Customer, Fabric, Id, Organization, Recommendation, UseCase } from "@/lib/domain/types";
import { rankNextSuit, useCaseLabel, type ScoredFabric } from "@/lib/domain/stylist";
import { getTextProvider, textProviderConfigured } from "@/lib/ai/providers";
import { newId, nowIso } from "@/lib/util/ids";
import { parseJsonArray } from "@/lib/util/json";
import { track } from "./events";
import { recordAiJob } from "./usage";

export interface StylistOutput {
  items: { fabric: Fabric; score: number; reason: string; factors: { label: string; delta: number }[] }[];
  /** 理由づけを AI が書いたか。false のときは相性ルールの要約であることを画面に出す */
  reasonsByAi: boolean;
  note?: string;
}

/**
 * AI スタイリスト
 * ---------------------------------------------------------------------------
 * 候補を決めるのは店舗のルール（在庫・履歴・好み・季節・用途・ノウハウ）。
 * AI がするのは「なぜ似合うのか」を短い日本語にすること。
 * AI が使えないときも提案は出す。ただし「AI が書いた」とは言わない。
 */
export async function recommend(params: {
  organization: Organization;
  customer: Customer;
  useCase?: UseCase;
  /** 自由入力（「結婚式なら？」など）。指定時は source=chat で残す */
  question?: string;
  limit?: number;
}): Promise<StylistOutput> {
  const store = getStore();
  const orgId = params.organization.id;
  const limit = params.limit ?? 3;

  const [fabrics, purchases, knowledge] = await Promise.all([
    store.list("fabrics", orgId),
    store.list("purchases", orgId, { customer_id: params.customer.id }),
    store.list("sales_knowledge", orgId),
  ]);

  const available = fabrics.filter((f) => !f.archived);
  if (available.length === 0) {
    return { items: [], reasonsByAi: false, note: "生地がまだ登録されていません。" };
  }

  // お手持ちの色（購入に生地が紐づいている分だけ。推測しない）
  const byId = new Map(fabrics.map((f) => [f.id, f]));
  const ownedColors = purchases
    .map((p) => (p.fabric_id ? byId.get(p.fabric_id)?.color_family : undefined))
    .filter(Boolean) as string[];

  const ranked = rankNextSuit(
    available,
    { customer: params.customer, purchases, knowledge, useCase: params.useCase },
    ownedColors,
    limit,
  );

  const { reasons, byAi } = await writeReasons(params.organization, params.customer, ranked, params.useCase, params.question);

  const items = ranked.map((r, i) => ({
    fabric: r.fabric,
    score: r.score,
    reason: reasons[i] ?? summarizeFactors(r),
    factors: r.factors,
  }));

  // 提案を台帳に残す（顧客ページの履歴になる）
  const now = nowIso();
  for (const [i, it] of items.entries()) {
    const rec: Recommendation = {
      id: newId("rec"),
      organization_id: orgId,
      customer_id: params.customer.id,
      fabric_id: it.fabric.id,
      rank: i + 1,
      reason: it.reason,
      score: it.score,
      prompt: params.question,
      source: params.question ? "chat" : "auto",
      created_at: now,
    };
    await store.insert("recommendations", rec);
  }
  await track(orgId, "recommendation_generated", { customer_id: params.customer.id });

  return { items, reasonsByAi: byAi };
}

async function writeReasons(
  org: Organization,
  customer: Customer,
  ranked: ScoredFabric[],
  useCase?: UseCase,
  question?: string,
): Promise<{ reasons: string[]; byAi: boolean }> {
  if (!textProviderConfigured() || ranked.length === 0) {
    return { reasons: ranked.map(summarizeFactors), byAi: false };
  }

  const provider = getTextProvider();
  const system = [
    "あなたは日本のオーダースーツ店のベテラン販売員です。接客中のスタッフに向けて、",
    "お客様へそのまま話せる短い提案理由を書きます。",
    "決まり: 1案につき日本語で1〜2文、60〜90字。誇張しない。似合う根拠を具体的に述べる。",
    "生地名や色はこちらが渡したものだけを使い、勝手に別の商品名・価格・在庫を作らない。",
    "「AIが」「システムが」とは書かない。医学的・断定的な表現は避ける。",
    "出力は JSON 配列のみ。例: [\"…\", \"…\", \"…\"]",
  ].join("\n");

  const profile = [
    `年齢: ${customer.age ?? "不明"}`,
    `職業: ${customer.occupation ?? "不明"}`,
    `体型: ${customer.body_type ?? "不明"}`,
    `好み: ${customer.preferred_style ?? "不明"} / ${customer.preferred_colors.join("・") || "指定なし"}`,
    `主な用途: ${useCase ? useCaseLabel(useCase) : customer.primary_use_case ? useCaseLabel(customer.primary_use_case) : "不明"}`,
  ].join(" / ");

  const candidates = ranked
    .map((r, i) => `${i + 1}. ${r.fabric.name}（${r.fabric.color} / ${r.fabric.pattern}）根拠: ${r.factors.filter((f) => f.delta > 0).map((f) => f.label).join("、") || "なし"}`)
    .join("\n");

  const user = [
    `お客様: ${profile}`,
    question ? `スタッフからの相談: ${question}` : "",
    "",
    "候補（この順番で理由を返してください）:",
    candidates,
  ].filter(Boolean).join("\n");

  const res = await provider.complete(system, user, 700);
  await recordAiJob({
    organizationId: org.id,
    kind: "text",
    provider: res.provider,
    model: res.model,
    estimatedCostJpy: res.costJpy,
    actualCostJpy: res.costJpy,
    inputTokens: res.inputTokens,
    outputTokens: res.outputTokens,
    latencyMs: res.latencyMs,
    ok: res.ok,
    errorMessage: res.errorMessage,
  });

  if (!res.ok) return { reasons: ranked.map(summarizeFactors), byAi: false };

  const parsed = parseJsonArray(res.text);
  if (!parsed || parsed.length < ranked.length) {
    return { reasons: ranked.map(summarizeFactors), byAi: false };
  }
  return { reasons: parsed.slice(0, ranked.length), byAi: true };
}

/** AI を使わないときの理由文。加点された事実をそのまま並べる（作り話をしない）。 */
export function summarizeFactors(r: ScoredFabric): string {
  const pos = r.factors.filter((f) => f.delta > 0).map((f) => f.label);
  if (pos.length === 0) return "在庫があり、今回のご用途に大きな不都合はありません。";
  return `${pos.slice(0, 3).join("、")}。`;
}

export async function ownedColorFamilies(orgId: Id, customerId: Id): Promise<string[]> {
  const store = getStore();
  const [purchases, fabrics] = await Promise.all([
    store.list("purchases", orgId, { customer_id: customerId }),
    store.list("fabrics", orgId),
  ]);
  const byId = new Map(fabrics.map((f) => [f.id, f]));
  return purchases.map((p) => (p.fabric_id ? byId.get(p.fabric_id)?.color_family : undefined)).filter(Boolean) as string[];
}
