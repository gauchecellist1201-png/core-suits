import type { PlanId } from "./types";

/**
 * プランと使用量の上限
 * ---------------------------------------------------------------------------
 * ★ 無制限の AI 利用を前提にしない。上限はサーバー側で必ず確認してから生成する。
 */
export interface Plan {
  id: PlanId;
  name: string;
  priceJpy: number;
  users: number | "unlimited";
  tryOnsPerMonth: number;
  features: string[];
  /** 月間 AI 原価の上限（円）。ここを超えたら止める */
  costLimitJpy: number;
}

export const PLANS: Record<PlanId, Plan> = {
  starter: {
    id: "starter", name: "Starter", priceJpy: 9_800, users: 1, tryOnsPerMonth: 50,
    costLimitJpy: 2_000,
    features: ["1店舗 / 1ユーザー", "月50回の試着生成", "顧客CRM（基本）", "生地データベース", "AI おすすめ提案"],
  },
  pro: {
    id: "pro", name: "Pro", priceJpy: 29_800, users: 5, tryOnsPerMonth: 300,
    costLimitJpy: 9_000,
    features: ["5ユーザー", "月300回の試着生成", "顧客CRM（購入履歴・好み）", "AI スタイリスト", "再来店の機会", "アナリティクス"],
  },
  enterprise: {
    id: "enterprise", name: "Enterprise", priceJpy: 98_000, users: "unlimited", tryOnsPerMonth: 1_500,
    costLimitJpy: 40_000,
    features: ["複数店舗", "スタッフ無制限", "LINE 連携", "詳細アナリティクス", "店舗ノウハウの学習", "API", "個別サポート"],
  },
};

export interface UsageState {
  used: number;
  limit: number;
  costJpy: number;
  costLimitJpy: number;
}

export type UsageVerdict =
  | { allowed: true }
  | { allowed: false; reason: "tryon_limit" | "cost_limit"; message: string };

/** 生成してよいか。押す前・押した直後の両方でここを通す。 */
export function checkUsage(u: UsageState): UsageVerdict {
  if (u.used >= u.limit) {
    return {
      allowed: false, reason: "tryon_limit",
      message: `今月の試着生成が上限（${u.limit}回）に達しました。プランの変更でご利用いただけます。`,
    };
  }
  if (u.costJpy >= u.costLimitJpy) {
    return {
      allowed: false, reason: "cost_limit",
      message: `今月の AI 利用額が上限（${u.costLimitJpy.toLocaleString("ja-JP")}円）に達しました。設定から上限を変更できます。`,
    };
  }
  return { allowed: true };
}
