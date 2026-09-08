import type { AiJob, AnalyticsEvent, FollowUp, Purchase, TryOn } from "./types";

/**
 * ROAI（Return on AI）
 * ---------------------------------------------------------------------------
 * 「AI を何回使ったか」ではなく「AI がいくらの売上に効いたか」を出す。
 *
 * ★ 数字の決まり ★
 *   ・実額と見込みを足さない。ここに出るのは台帳に入った実額だけ。
 *   ・「AI が効いた売上」= 試着に紐づいた購入（influenced_by_try_on_id がある購入）のみ。
 *     試着してから買った、を店舗が記録した分だけ数える。推測で広げない。
 *   ・母数が小さいときは率を出さない（0件を 0% と書かない）。
 */

export interface Kpis {
  customers: number;
  tryOnsGenerated: number;
  tryOnsFailed: number;
  recommendations: number;
  sharedLooks: number;
  shareViews: number;
  sales: number;
  salesAmountJpy: number;
  /** 試着に紐づいた売上（ROAI の分子） */
  aiAssistedRevenueJpy: number;
  /** 試着した顧客のうち購入に至った割合。母数が5未満なら null */
  tryOnConversionRate: number | null;
  averageOrderValueJpy: number | null;
  repeatOpportunities: number;
  repeatWon: number;
  /** AI 原価の実測合計（円） */
  aiCostJpy: number;
  /** AI 効果売上 ÷ AI 原価。原価0なら null */
  roai: number | null;
}

export interface KpiInput {
  customerCount: number;
  tryOns: TryOn[];
  purchases: Purchase[];
  followUps: FollowUp[];
  events: AnalyticsEvent[];
  aiJobs: AiJob[];
}

export function computeKpis(i: KpiInput): Kpis {
  const succeeded = i.tryOns.filter((t) => t.status === "succeeded");
  const failed = i.tryOns.filter((t) => t.status === "failed");
  const salesAmount = i.purchases.reduce((s, p) => s + p.amount_jpy, 0);
  const assisted = i.purchases.filter((p) => p.influenced_by_try_on_id);
  const assistedAmount = assisted.reduce((s, p) => s + p.amount_jpy, 0);

  const triedCustomers = new Set(succeeded.map((t) => t.customer_id));
  const boughtAfterTryOn = new Set(assisted.map((p) => p.customer_id));
  const conv = triedCustomers.size >= 5
    ? Math.round((boughtAfterTryOn.size / triedCustomers.size) * 1000) / 10
    : null;

  const aiCost = i.aiJobs.reduce((s, j) => s + (j.actual_cost_jpy || 0), 0);

  return {
    customers: i.customerCount,
    tryOnsGenerated: succeeded.length,
    tryOnsFailed: failed.length,
    recommendations: i.events.filter((e) => e.name === "recommendation_generated").length,
    sharedLooks: i.events.filter((e) => e.name === "look_shared").length,
    shareViews: i.events.filter((e) => e.name === "share_viewed").length,
    sales: i.purchases.length,
    salesAmountJpy: salesAmount,
    aiAssistedRevenueJpy: assistedAmount,
    tryOnConversionRate: conv,
    averageOrderValueJpy: i.purchases.length ? Math.round(salesAmount / i.purchases.length) : null,
    repeatOpportunities: i.followUps.length,
    repeatWon: i.followUps.filter((f) => f.status === "won").length,
    aiCostJpy: Math.round(aiCost * 100) / 100,
    roai: aiCost > 0 ? Math.round((assistedAmount / aiCost) * 10) / 10 : null,
  };
}

export function inMonth(iso: string, year: number, month0: number): boolean {
  const d = new Date(iso);
  return d.getFullYear() === year && d.getMonth() === month0;
}
