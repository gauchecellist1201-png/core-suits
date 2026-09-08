import { describe, expect, it } from "vitest";
import { costJpy, estimateImageCostJpy, rateFor, usdJpy } from "@/lib/ai/pricing";

describe("AI 原価", () => {
  it("料金表にあるモデルは、実測トークンから円を出せる", () => {
    // gemini-3.1-flash-image: 入力 $0.5/M, 出力 $60/M
    const jpy = costJpy("gemini-3.1-flash-image", 1_000_000, 0);
    expect(jpy).toBe(Math.round(0.5 * usdJpy() * 100) / 100);
  });

  it("画像1枚ぶんの原価が現実的な範囲に収まる", () => {
    const jpy = costJpy("gemini-3.1-flash-image", 770, 1389);
    expect(jpy).not.toBeNull();
    expect(jpy!).toBeGreaterThan(1);
    expect(jpy!).toBeLessThan(50);
  });

  it("見積りは実測トークンから出す（公表の1枚単価より安く見せない）", () => {
    // 公表値 $0.067/枚 は出力ぶんのみ。入力画像2枚を渡すこの用途では実測のほうが高い。
    const est = estimateImageCostJpy("gemini-3.1-flash-image");
    const reference = 0.067 * usdJpy();
    expect(est).toBeGreaterThan(reference);
    // 実測（¥13.2前後）に近いこと
    expect(est).toBeGreaterThan(12);
    expect(est).toBeLessThan(15);
  });

  it("料金表に無いモデルは 0 円と言わず「不明」を返す", () => {
    expect(costJpy("unknown-model", 1000, 1000)).toBeNull();
    expect(rateFor("unknown-model")).toBeNull();
    expect(estimateImageCostJpy("unknown-model")).toBe(0);
  });

  it("為替は設定で上書きできる", () => {
    const before = usdJpy();
    process.env.SUITS_USD_JPY = "200";
    expect(usdJpy()).toBe(200);
    delete process.env.SUITS_USD_JPY;
    expect(usdJpy()).toBe(before);
  });

  it("おかしな為替設定は既定値に戻る", () => {
    process.env.SUITS_USD_JPY = "abc";
    expect(usdJpy()).toBe(155);
    process.env.SUITS_USD_JPY = "-3";
    expect(usdJpy()).toBe(155);
    delete process.env.SUITS_USD_JPY;
  });
});
