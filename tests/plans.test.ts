import { describe, expect, it } from "vitest";
import { checkUsage, PLANS } from "@/lib/domain/plans";

describe("使用量の上限", () => {
  it("枠が残っていれば通す", () => {
    expect(checkUsage({ used: 10, limit: 50, costJpy: 100, costLimitJpy: 2000 }).allowed).toBe(true);
  });
  it("回数の上限に達したら止める", () => {
    const v = checkUsage({ used: 50, limit: 50, costJpy: 0, costLimitJpy: 2000 });
    expect(v.allowed).toBe(false);
    if (!v.allowed) expect(v.reason).toBe("tryon_limit");
  });
  it("金額の上限に達したら、回数が残っていても止める", () => {
    const v = checkUsage({ used: 1, limit: 50, costJpy: 2000, costLimitJpy: 2000 });
    expect(v.allowed).toBe(false);
    if (!v.allowed) expect(v.reason).toBe("cost_limit");
  });
  it("どのプランも無制限にしない", () => {
    for (const p of Object.values(PLANS)) {
      expect(p.tryOnsPerMonth).toBeGreaterThan(0);
      expect(Number.isFinite(p.tryOnsPerMonth)).toBe(true);
      expect(p.costLimitJpy).toBeGreaterThan(0);
    }
  });
  it("上位プランほど枠が広い", () => {
    expect(PLANS.pro.tryOnsPerMonth).toBeGreaterThan(PLANS.starter.tryOnsPerMonth);
    expect(PLANS.enterprise.tryOnsPerMonth).toBeGreaterThan(PLANS.pro.tryOnsPerMonth);
  });
});
