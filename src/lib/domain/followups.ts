import type { Customer, FollowUp, Purchase } from "./types";

/**
 * 再来店・再購入の機会を見つける
 * ---------------------------------------------------------------------------
 * 「試着ツール」と「売上を生むシステム」を分けるのはこの部分。
 * 台帳にある事実（最後の購入がいつか）だけから機会を出す。見込み額は作らない。
 */

export const DEFAULT_MONTHS_SINCE_PURCHASE = 6;

export interface Opportunity {
  customer: Customer;
  /** 最後の購入からの月数（購入が無ければ undefined） */
  monthsSincePurchase?: number;
  lastPurchase?: Purchase;
  reason: string;
  /** すでに開いている追客があるならその id */
  existingFollowUpId?: string;
}

export function monthsBetween(from: Date, to: Date): number {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
}

export function findOpportunities(
  customers: Customer[],
  purchases: Purchase[],
  followUps: FollowUp[],
  now = new Date(),
  monthsThreshold = DEFAULT_MONTHS_SINCE_PURCHASE,
): Opportunity[] {
  const byCustomer = new Map<string, Purchase[]>();
  for (const p of purchases) {
    const list = byCustomer.get(p.customer_id) ?? [];
    list.push(p);
    byCustomer.set(p.customer_id, list);
  }
  const openByCustomer = new Map<string, FollowUp>();
  for (const f of followUps) if (f.status === "open") openByCustomer.set(f.customer_id, f);

  const out: Opportunity[] = [];
  for (const c of customers) {
    const ps = (byCustomer.get(c.id) ?? []).slice().sort((a, b) => b.purchased_at.localeCompare(a.purchased_at));
    const last = ps[0];
    if (last) {
      const m = monthsBetween(new Date(last.purchased_at), now);
      if (m < monthsThreshold) continue;
      out.push({
        customer: c,
        monthsSincePurchase: m,
        lastPurchase: last,
        reason: `前回のご購入から ${m} ヶ月（${last.product_name}）`,
        existingFollowUpId: openByCustomer.get(c.id)?.id,
      });
    } else if (c.last_visit_at) {
      const m = monthsBetween(new Date(c.last_visit_at), now);
      if (m < monthsThreshold) continue;
      out.push({
        customer: c,
        reason: `ご来店から ${m} ヶ月、ご購入の記録はまだありません`,
        existingFollowUpId: openByCustomer.get(c.id)?.id,
      });
    }
  }
  return out.sort((a, b) => (b.monthsSincePurchase ?? 999) - (a.monthsSincePurchase ?? 999));
}
