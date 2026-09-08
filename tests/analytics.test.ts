import { describe, expect, it } from "vitest";
import { computeKpis } from "@/lib/domain/analytics";
import type { AiJob, Purchase, TryOn } from "@/lib/domain/types";

const tryOn = (id: string, customerId: string, status: TryOn["status"]): TryOn => ({
  id, organization_id: "org1", customer_id: customerId, fabric_id: "f1",
  source_media_id: "m1", status, look_no: 1,
  garment: { style: "classic", lapel: "notch", buttons: 2, piece: "two_piece", shirt: "white", tie: "none", scene: "business" },
  created_by: "u1", created_at: "2026-09-01T00:00:00.000Z",
});

const purchase = (id: string, customerId: string, amount: number, tryOnId?: string): Purchase => ({
  id, organization_id: "org1", customer_id: customerId, product_name: "スーツ", amount_jpy: amount,
  influenced_by_try_on_id: tryOnId, purchased_at: "2026-09-02T00:00:00.000Z", created_at: "2026-09-02T00:00:00.000Z",
});

const job = (cost: number): AiJob => ({
  id: `j${cost}`, organization_id: "org1", kind: "image", provider: "gemini", model: "m",
  estimated_cost_jpy: cost, actual_cost_jpy: cost, latency_ms: 1000, ok: true,
  created_at: "2026-09-01T00:00:00.000Z",
});

const base = { customerCount: 0, tryOns: [], purchases: [], followUps: [], events: [], aiJobs: [] };

describe("KPI", () => {
  it("試着に紐づいた売上だけを AI 効果売上に数える", () => {
    const k = computeKpis({
      ...base,
      purchases: [purchase("p1", "c1", 100000, "t1"), purchase("p2", "c2", 200000)],
    });
    expect(k.salesAmountJpy).toBe(300000);
    expect(k.aiAssistedRevenueJpy).toBe(100000);
  });

  it("母数が5名未満のとき、成約率は数字を出さない", () => {
    const k = computeKpis({
      ...base,
      tryOns: [tryOn("t1", "c1", "succeeded")],
      purchases: [purchase("p1", "c1", 100000, "t1")],
    });
    expect(k.tryOnConversionRate).toBeNull();
  });

  it("母数が5名以上なら成約率を出す", () => {
    const tryOns = ["c1", "c2", "c3", "c4", "c5"].map((c, i) => tryOn(`t${i}`, c, "succeeded"));
    const k = computeKpis({ ...base, tryOns, purchases: [purchase("p1", "c1", 100000, "t0")] });
    expect(k.tryOnConversionRate).toBe(20);
  });

  it("AI 原価が 0 のとき ROAI は 0 ではなく未算出になる", () => {
    const k = computeKpis({ ...base, purchases: [purchase("p1", "c1", 100000, "t1")] });
    expect(k.roai).toBeNull();
  });

  it("ROAI = 試着に紐づいた売上 ÷ AI 原価", () => {
    const k = computeKpis({
      ...base,
      purchases: [purchase("p1", "c1", 10000, "t1")],
      aiJobs: [job(100)],
    });
    expect(k.roai).toBe(100);
  });

  it("失敗した試着は生成数に数えない", () => {
    const k = computeKpis({ ...base, tryOns: [tryOn("t1", "c1", "succeeded"), tryOn("t2", "c1", "failed")] });
    expect(k.tryOnsGenerated).toBe(1);
    expect(k.tryOnsFailed).toBe(1);
  });
});
