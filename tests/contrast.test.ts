import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PALETTE, contrast } from "@/lib/design/palette";

/**
 * 文字が読めることを色の段階で固定する。
 * 「薄いほうが上品」で 11px の補助文字を薄くすると、店頭の明るい場所で読めなくなる。
 */
describe("文字のコントラスト", () => {
  const grounds = [["canvas", PALETTE.canvas], ["surface", PALETTE.surface], ["sunken", PALETTE.sunken]] as const;
  const texts = [["ink", PALETTE.ink], ["muted", PALETTE.muted], ["faint", PALETTE.faint]] as const;

  for (const [gName, g] of grounds) {
    for (const [tName, t] of texts) {
      it(`${tName} を ${gName} の上に置いて 4.5:1 以上`, () => {
        expect(contrast(t, g)).toBeGreaterThanOrEqual(4.5);
      });
    }
  }

  it("濃紺のボタンの上の文字（canvas）が 4.5:1 以上", () => {
    expect(contrast(PALETTE.canvas, PALETTE.navy)).toBeGreaterThanOrEqual(4.5);
  });

  it("真鍮の強調文字が canvas の上で 4.5:1 以上", () => {
    expect(contrast(PALETTE.brass, PALETTE.canvas)).toBeGreaterThanOrEqual(4.5);
  });

  it("エラーと成功の文字が canvas の上で 4.5:1 以上", () => {
    expect(contrast(PALETTE.danger, PALETTE.canvas)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(PALETTE.success, PALETTE.canvas)).toBeGreaterThanOrEqual(4.5);
  });

  it("罫は文字ではないので対象外だが、地との差はあること", () => {
    expect(contrast(PALETTE.line, PALETTE.canvas)).toBeGreaterThan(1.05);
  });

  // globals.css は Tailwind を通らないので、色を直に書いている。正本とずれると
  // 「body だけ別の白」という気づきにくい崩れになるので、ここで縛る。
  it("globals.css の地と文字の色が正本と一致している", () => {
    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
    expect(css).toContain(PALETTE.canvas);
    expect(css).toContain(PALETTE.ink);
    expect(css).toContain(PALETTE.navy);
  });
});
