import { describe, expect, it } from "vitest";
import { buildTryOnPrompt, DISCLAIMER_JA } from "@/lib/ai/tryOnPrompt";
import type { GarmentSpec } from "@/lib/domain/types";

const garment: GarmentSpec = {
  style: "classic", lapel: "notch", buttons: 2, piece: "two_piece",
  shirt: "white", tie: "none", scene: "business",
};

describe("試着の撮影指示書", () => {
  it("人を変えない指示が必ず入る", () => {
    const p = buildTryOnPrompt(garment, "navy solid", true);
    expect(p.text).toContain("same face");
    expect(p.text).toContain("same hairstyle");
    expect(p.text).toContain("same skin tone");
    expect(p.text).toContain("same body build");
    expect(p.text).toContain("Change ONLY the clothing");
    expect(p.text).toMatch(/Do NOT beautify, slim, de-age/);
  });

  it("生地画像があるときは、画像を言葉より優先させる", () => {
    const p = buildTryOnPrompt(garment, "charcoal herringbone", true);
    expect(p.usesFabricReference).toBe(true);
    expect(p.text).toContain("IMAGE 2");
    expect(p.text).toContain("The IMAGE takes priority over these words");
    expect(p.text).toContain("Do not substitute a similar colour");
  });

  it("生地画像が無いときは、画像を参照させる文言を出さない", () => {
    const p = buildTryOnPrompt(garment, "charcoal herringbone", false);
    expect(p.usesFabricReference).toBe(false);
    expect(p.text).not.toContain("IMAGE 2");
    expect(p.text).toContain("No fabric photograph is available");
  });

  it("スリーピースの指定が指示書に出る", () => {
    const p = buildTryOnPrompt({ ...garment, piece: "three_piece" }, "navy", true);
    expect(p.text).toContain("Three-piece");
  });

  it("お客様への注意書きが用意されている", () => {
    expect(DISCLAIMER_JA).toContain("実物の色");
  });
});
