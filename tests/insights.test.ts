import { describe, expect, it } from "vitest";
import { buildInsights } from "@/lib/domain/insights";

describe("顧客ページの気づき", () => {
  it("記録が無ければ何も書かない（推測しない）", () => {
    expect(buildInsights({ purchases: [], months: null })).toEqual([]);
  });

  it("購入があれば件数と平均額を出す", () => {
    const out = buildInsights({ purchases: [{ name: "A", amount: 100000 }, { name: "B", amount: 200000 }], months: null });
    expect(out[0]).toContain("2 着");
    expect(out[0]).toContain("150,000");
  });

  it("生地が紐づいていない購入からは色の話をしない", () => {
    const out = buildInsights({ purchases: [{ name: "A", amount: 100000 }], months: null });
    expect(out.join()).not.toContain("系");
  });

  it("同じ系統に偏っていれば、別系統を勧める根拠として書く", () => {
    const out = buildInsights({ purchases: [{ name: "A", amount: 100000, colorFamily: "navy" }], months: null });
    expect(out.join()).toContain("ネイビー");
    expect(out.join()).toContain("別系統");
  });

  it("6ヶ月未満の経過は書かない", () => {
    const a = buildInsights({ purchases: [], months: 3 });
    const b = buildInsights({ purchases: [], months: 8 });
    expect(a).toEqual([]);
    expect(b.join()).toContain("8 ヶ月");
  });
});
