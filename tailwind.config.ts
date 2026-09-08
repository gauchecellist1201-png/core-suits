import type { Config } from "tailwindcss";
import { PALETTE } from "./src/lib/design/palette";

/**
 * CORE Suits デザイントークン
 * ---------------------------------------------------------------------------
 * 世界観: Luxury Tailoring × Modern Technology × Japanese Minimalism。
 * 禁止: 派手なグラデーション / 意味のないガラス風 / AIっぽい紫。
 * 色は「暖かい白・炭・濃紺・石」の4系統＋真鍮のアクセント1色のみ。
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // 色の正本は src/lib/design/palette.ts（コントラストをテストで固定している）
      colors: PALETTE,
      fontFamily: {
        // 外部フォントを読みに行かない（店舗の回線・オフラインでも崩れない）
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Helvetica Neue"', '"Hiragino Kaku Gothic ProN"', '"Noto Sans JP"', 'Meiryo', 'sans-serif'],
        display: ['"Hiragino Mincho ProN"', '"Yu Mincho"', '"Noto Serif JP"', 'Georgia', 'serif'],
      },
      letterSpacing: { wider: "0.08em", widest: "0.18em" },
      borderRadius: { xs: "2px", sm: "3px", DEFAULT: "4px", md: "6px", lg: "10px" },
      boxShadow: {
        card: "0 1px 2px rgba(26,25,23,0.04), 0 8px 24px -16px rgba(26,25,23,0.18)",
        lift: "0 2px 4px rgba(26,25,23,0.06), 0 18px 40px -22px rgba(26,25,23,0.30)",
      },
      maxWidth: { shell: "1240px" },
    },
  },
  plugins: [],
};
export default config;
