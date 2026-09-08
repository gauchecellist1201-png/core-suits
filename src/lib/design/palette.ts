/**
 * CORE Suits の色（正本）
 * ---------------------------------------------------------------------------
 * 世界観: Luxury Tailoring × Modern Technology × Japanese Minimalism。
 * 暖かい白・炭・濃紺・石の4系統＋真鍮のアクセント1色だけ。
 * 派手なグラデーション / 意味のないガラス風 / AIっぽい紫は使わない。
 *
 * ★ 文字色は canvas の上で 4.5:1 以上あること。tests/contrast.test.ts が固定している。
 */
export const PALETTE = {
  canvas: "#FAF8F5",   // 暖かい白（地）
  surface: "#FFFFFF",  // カード
  sunken: "#F2EEE8",   // 一段沈んだ面
  line: "#E4DED4",     // 罫
  ink: "#1A1917",      // 文字（炭）
  muted: "#6E6860",    // 補助文字
  faint: "#6F685F",    // 最小の補助文字（沈んだ面の上でも 4.5:1 を満たす濃さ）
  navy: "#172A45",     // 濃紺（主要アクション）
  navyHover: "#0F1D31",
  brass: "#8A6E42",    // 真鍮（強調線・数値）
  stone: "#D9D2C6",
  success: "#2F5D42",
  danger: "#8C3A2E",
} as const;

export type ColorName = keyof typeof PALETTE;

/** sRGB の相対輝度（WCAG 2.1） */
export function luminance(hex: string): number {
  const v = hex.replace("#", "");
  const ch = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) / 255);
  const lin = ch.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * lin[0]! + 0.7152 * lin[1]! + 0.0722 * lin[2]!;
}

/** 2色のコントラスト比（1〜21） */
export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}
