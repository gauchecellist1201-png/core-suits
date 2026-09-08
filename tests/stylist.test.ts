import { describe, expect, it } from "vitest";
import { rankFabrics, rankNextSuit, scoreFabric, seasonForMonth, normalizeColor } from "@/lib/domain/stylist";
import type { Customer, Fabric, Purchase, SalesKnowledge } from "@/lib/domain/types";

const baseFabric = (over: Partial<Fabric>): Fabric => ({
  id: "f1", organization_id: "org1", name: "生地", color: "ネイビー", color_family: "navy",
  pattern: "solid", season: "all_season", price_tier: "standard", archived: false,
  created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z",
  ...over,
});

const baseCustomer = (over: Partial<Customer> = {}): Customer => ({
  id: "c1", organization_id: "org1", name: "テスト", preferred_colors: [], favorite_fabric_ids: [],
  created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z",
  ...over,
});

const ctx = (over: Partial<{ customer: Customer; purchases: Purchase[]; knowledge: SalesKnowledge[]; now: Date }> = {}) => ({
  customer: over.customer ?? baseCustomer(),
  purchases: over.purchases ?? [],
  knowledge: over.knowledge ?? [],
  now: over.now ?? new Date("2026-10-01T00:00:00.000Z"),
});

describe("季節", () => {
  it("3〜8月は春夏、9〜2月は秋冬", () => {
    expect(seasonForMonth(3)).toBe("spring_summer");
    expect(seasonForMonth(8)).toBe("spring_summer");
    expect(seasonForMonth(9)).toBe("autumn_winter");
    expect(seasonForMonth(2)).toBe("autumn_winter");
  });
});

describe("相性の点数", () => {
  it("在庫がない生地は大きく下がる", () => {
    const withStock = scoreFabric(baseFabric({ stock_m: 10 }), ctx());
    const noStock = scoreFabric(baseFabric({ stock_m: 0 }), ctx());
    expect(noStock.score).toBeLessThan(withStock.score);
    expect(noStock.factors.some((f) => f.label === "在庫切れ")).toBe(true);
  });

  it("取り扱い終了の生地は 0 点になり、候補から外れる", () => {
    const s = scoreFabric(baseFabric({ archived: true }), ctx());
    expect(s.score).toBe(0);
    expect(rankFabrics([baseFabric({ archived: true })], ctx())).toHaveLength(0);
  });

  it("式典用途では柄物が下がる", () => {
    const c = baseCustomer({ primary_use_case: "ceremony" });
    const solid = scoreFabric(baseFabric({ color_family: "black", pattern: "solid" }), ctx({ customer: c }));
    const check = scoreFabric(baseFabric({ color_family: "black", pattern: "check" }), ctx({ customer: c }));
    expect(check.score).toBeLessThan(solid.score);
  });

  it("すでに買った生地そのものは強く下がる", () => {
    const purchases: Purchase[] = [{
      id: "p1", organization_id: "org1", customer_id: "c1", fabric_id: "f1",
      product_name: "スーツ", amount_jpy: 120000, purchased_at: "2026-01-01T00:00:00.000Z",
      created_at: "2026-01-01T00:00:00.000Z",
    }];
    const s = scoreFabric(baseFabric({ id: "f1" }), ctx({ purchases }));
    const other = scoreFabric(baseFabric({ id: "f2" }), ctx({ purchases }));
    expect(s.score).toBeLessThan(other.score);
  });

  it("条件のない店舗ノウハウは点数を動かさない", () => {
    const k: SalesKnowledge = {
      id: "k1", organization_id: "org1", title: "何にでも効く", body: "…",
      applies_to: {}, created_by: "u1", created_at: "2026-01-01T00:00:00.000Z",
    };
    const withK = scoreFabric(baseFabric({}), ctx({ knowledge: [k] }));
    const withoutK = scoreFabric(baseFabric({}), ctx());
    expect(withK.score).toBe(withoutK.score);
  });

  it("条件つきの店舗ノウハウは合致したときだけ加点する", () => {
    const k: SalesKnowledge = {
      id: "k1", organization_id: "org1", title: "経営者にはプレミアム", body: "…",
      applies_to: { use_cases: ["executive_meeting"], age_min: 40, price_tiers: ["premium"] },
      created_by: "u1", created_at: "2026-01-01T00:00:00.000Z",
    };
    const c = baseCustomer({ age: 45, primary_use_case: "executive_meeting" });
    const hit = scoreFabric(baseFabric({ price_tier: "premium" }), ctx({ customer: c, knowledge: [k] }));
    const miss = scoreFabric(baseFabric({ price_tier: "entry" }), ctx({ customer: c, knowledge: [k] }));
    expect(hit.knowledgeIds).toContain("k1");
    expect(miss.knowledgeIds).toHaveLength(0);
  });
});

describe("次の1着", () => {
  it("お手持ちと同じ色の系統は下がり、違う系統が上がる", () => {
    const fabrics = [baseFabric({ id: "navy", color_family: "navy" }), baseFabric({ id: "brown", color_family: "brown" })];
    const ranked = rankNextSuit(fabrics, ctx(), ["navy"], 2);
    expect(ranked[0]?.fabric.id).toBe("brown");
    expect(ranked[1]?.fabric.id).toBe("navy");
  });

  it("お手持ちの記録が無いときは、色の重なりで上下させない", () => {
    const fabrics = [baseFabric({ id: "navy", color_family: "navy" })];
    const withHistory = rankNextSuit(fabrics, ctx(), [], 1);
    const plain = rankFabrics(fabrics, ctx(), 1);
    expect(withHistory[0]?.score).toBe(plain[0]?.score);
  });
});

describe("色の正規化", () => {
  it("日本語と英語のどちらでも同じ系統になる", () => {
    expect(normalizeColor("ネイビー")).toBe("navy");
    expect(normalizeColor("Navy")).toBe("navy");
    expect(normalizeColor("チャコールグレー")).toBe("charcoal");
    expect(normalizeColor("紺")).toBe("navy");
    expect(normalizeColor("よく分からない色")).toBe("other");
  });
});
