import type { ImageProvider, TextProvider } from "../types";
import { createGeminiImageProvider } from "./gemini";
import { createAnthropicTextProvider } from "./anthropic";

/**
 * プロバイダの差し替え口
 * ---------------------------------------------------------------------------
 * 画像生成の会社を1社に固定しない。価格・品質・速度で乗り換えられるよう、
 * 選択は環境変数 1つ（SUITS_IMAGE_PROVIDER）で切り替える。
 * 新しい会社を足すときは、ここに1行足して providers/<name>.ts を書くだけでよい。
 */
const IMAGE_FACTORIES: Record<string, () => ImageProvider> = {
  gemini: () => createGeminiImageProvider(),
};

export const IMAGE_PROVIDER_NAMES = Object.keys(IMAGE_FACTORIES);

export function getImageProvider(name?: string): ImageProvider {
  const n = name || process.env.SUITS_IMAGE_PROVIDER || "gemini";
  const f = IMAGE_FACTORIES[n];
  if (!f) throw new Error(`未知の画像プロバイダ: ${n}（使えるのは ${IMAGE_PROVIDER_NAMES.join(", ")}）`);
  return f();
}

export function getTextProvider(): TextProvider {
  return createAnthropicTextProvider();
}

export function imageProviderConfigured(): boolean {
  const n = process.env.SUITS_IMAGE_PROVIDER || "gemini";
  if (n === "gemini") return Boolean(process.env.GEMINI_API_KEY);
  return false;
}

export function textProviderConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY);
}
