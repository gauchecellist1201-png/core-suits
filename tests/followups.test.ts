import { describe, expect, it } from "vitest";
import { findOpportunities, monthsBetween } from "@/lib/domain/followups";
import type { Customer, FollowUp, Purchase } from "@/lib/domain/types";

const now = new Date("2026-09-08T00:00:00.000Z");
const ago = (m: number) => { const d = new Date(now); d.setMonth(d.getMonth() - m); return d.toISOString(); };

const customer = (id: string, over: Partial<Customer> = {}): Customer => ({
  id, organization_id: "org1", name: id, preferred_colors: [], favorite_fabric_ids: [],
  created_at: ago(24), updated_at: ago(1), ...over,
});

const purchase = (id: string, customerId: string, months: number): Purchase => ({
  id, organization_id: "org1", customer_id: customerId, product_name: "スーツ", amount_jpy: 120000,
  purchased_at: ago(months), created_at: ago(months),
});

describe("再来店の機会", () => {
  it("6ヶ月未満のお客様は出さない", () => {
    const out = findOpportunities([customer("c1")], [purchase("p1", "c1", 3)], [], now);
    expect(out).toHaveLength(0);
  });

  it("6ヶ月以上のお客様を、経過が長い順に出す", () => {
    const out = findOpportunities(
      [customer("c1"), customer("c2")],
      [purchase("p1", "c1", 7), purchase("p2", "c2", 12)],
      [], now,
    );
    expect(out.map((o) => o.customer.id)).toEqual(["c2", "c1"]);
    expect(out[0]?.monthsSincePurchase).toBe(12);
  });

  it("購入が無くても、来店から時間が経っていれば出す", () => {
    const out = findOpportunities([customer("c1", { last_visit_at: ago(9) })], [], [], now);
    expect(out).toHaveLength(1);
    expect(out[0]?.monthsSincePurchase).toBeUndefined();
  });

  it("来店も購入も記録が無いお客様は出さない（推測で追わない）", () => {
    const out = findOpportunities([customer("c1", { last_visit_at: undefined })], [], [], now);
    expect(out).toHaveLength(0);
  });

  it("すでに開いている追客があることが分かる", () => {
    const f: FollowUp = {
      id: "f1", organization_id: "org1", customer_id: "c1", reason: "…",
      due_at: ago(0), status: "open", created_at: ago(1), updated_at: ago(1),
    };
    const out = findOpportunities([customer("c1")], [purchase("p1", "c1", 8)], [f], now);
    expect(out[0]?.existingFollowUpId).toBe("f1");
  });

  it("複数回の購入では最新のものを見る", () => {
    const out = findOpportunities(
      [customer("c1")],
      [purchase("p1", "c1", 20), purchase("p2", "c1", 2)],
      [], now,
    );
    expect(out).toHaveLength(0);
  });
});

describe("月数の計算", () => {
  it("月をまたぐ差を数える", () => {
    expect(monthsBetween(new Date("2026-01-15"), new Date("2026-09-08"))).toBe(8);
  });
});
