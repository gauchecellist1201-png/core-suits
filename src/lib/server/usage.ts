import "server-only";
import { getStore } from "@/lib/db";
import type { Id, Organization } from "@/lib/domain/types";
import { PLANS, checkUsage, type UsageState, type UsageVerdict } from "@/lib/domain/plans";

/**
 * 今月の使用量。試着の回数と AI 原価の両方を見る。
 * 月の境目は店舗の実感に合わせて日本時間で切る。
 */
export function monthKeyJst(d = new Date()): string {
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return `${jst.getUTCFullYear()}-${String(jst.getUTCMonth() + 1).padStart(2, "0")}`;
}

function isThisMonthJst(iso: string, key = monthKeyJst()): boolean {
  return monthKeyJst(new Date(iso)) === key;
}

export async function currentUsage(org: Organization): Promise<UsageState> {
  const store = getStore();
  const key = monthKeyJst();
  const [tryOns, jobs] = await Promise.all([
    store.list("try_ons", org.id),
    store.list("ai_jobs", org.id),
  ]);
  // 失敗した生成は回数に数えない（お客様の目の前で失敗した分まで枠を削らない）。
  // 一方、原価は発生した分をそのまま数える。
  const used = tryOns.filter((t) => isThisMonthJst(t.created_at, key) && t.status === "succeeded").length;
  const costJpy = jobs
    .filter((j) => isThisMonthJst(j.created_at, key))
    .reduce((s, j) => s + (j.actual_cost_jpy || 0), 0);

  const plan = PLANS[org.plan];
  return {
    used,
    limit: org.monthly_tryon_limit || plan.tryOnsPerMonth,
    costJpy: Math.round(costJpy * 100) / 100,
    costLimitJpy: org.monthly_cost_limit_jpy || plan.costLimitJpy,
  };
}

export async function assertCanGenerate(org: Organization): Promise<UsageVerdict> {
  return checkUsage(await currentUsage(org));
}

export async function recordAiJob(params: {
  organizationId: Id;
  kind: "image" | "text";
  provider: string;
  model: string;
  estimatedCostJpy: number;
  actualCostJpy: number;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs: number;
  ok: boolean;
  errorMessage?: string;
  tryOnId?: string;
}): Promise<void> {
  const { newId, nowIso } = await import("@/lib/util/ids");
  await getStore().insert("ai_jobs", {
    id: newId("job"),
    organization_id: params.organizationId,
    kind: params.kind,
    provider: params.provider,
    model: params.model,
    estimated_cost_jpy: params.estimatedCostJpy,
    actual_cost_jpy: params.actualCostJpy,
    input_tokens: params.inputTokens,
    output_tokens: params.outputTokens,
    latency_ms: params.latencyMs,
    ok: params.ok,
    error_message: params.errorMessage,
    try_on_id: params.tryOnId,
    created_at: nowIso(),
  });
}
