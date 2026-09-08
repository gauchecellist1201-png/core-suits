import { costJpy, estimateImageCostJpy } from "../pricing";
import { buildTryOnPrompt } from "../tryOnPrompt";
import type { ImageProvider, TryOnInput, TryOnResult } from "../types";

/**
 * Gemini 画像編集プロバイダ
 * 入力: 顧客写真 ＋ 生地画像 ＋ 撮影指示書 → 出力: 試着画像1枚
 */
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

interface InlinePart { inlineData?: { data: string; mimeType: string }; inline_data?: { data: string; mime_type: string }; text?: string }
interface GeminiResponse {
  candidates?: { content?: { parts?: InlinePart[] }; finishReason?: string }[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  error?: { message?: string };
}

export function createGeminiImageProvider(model?: string): ImageProvider {
  const m = model || process.env.SUITS_IMAGE_MODEL || "gemini-3.1-flash-image";
  return {
    name: "gemini",
    model: m,
    estimateJpy: () => estimateImageCostJpy(m),

    async generateTryOn(input: TryOnInput): Promise<TryOnResult> {
      const started = Date.now();
      const key = process.env.GEMINI_API_KEY;
      const base = {
        provider: "gemini", model: m, usedFabricReference: Boolean(input.fabricImage),
      };
      if (!key) {
        return {
          ...base, ok: false, latencyMs: 0, costJpy: 0,
          errorMessage: "GEMINI_API_KEY が未設定です。設定 → AI 接続 から登録してください。",
        };
      }

      const prompt = buildTryOnPrompt(input.garment, input.fabricDescription, Boolean(input.fabricImage));
      const parts: InlinePart[] = [{ text: prompt.text }];
      parts.push({ inlineData: { mimeType: input.customerPhoto.mime, data: input.customerPhoto.bytes.toString("base64") } });
      if (input.fabricImage) {
        parts.push({ inlineData: { mimeType: input.fabricImage.mime, data: input.fabricImage.bytes.toString("base64") } });
      }

      let res: Response;
      try {
        res = await fetch(`${ENDPOINT}/${m}:generateContent?key=${key}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ contents: [{ role: "user", parts }] }),
          signal: AbortSignal.timeout(120_000),
        });
      } catch (e) {
        return {
          ...base, ok: false, latencyMs: Date.now() - started, costJpy: 0,
          errorMessage: `画像の生成に届きませんでした（${e instanceof Error ? e.message : "通信エラー"}）`,
        };
      }

      const latencyMs = Date.now() - started;
      let json: GeminiResponse;
      try {
        json = (await res.json()) as GeminiResponse;
      } catch {
        return { ...base, ok: false, latencyMs, costJpy: 0, errorMessage: `生成結果を読み取れませんでした（HTTP ${res.status}）` };
      }

      const inputTokens = json.usageMetadata?.promptTokenCount ?? 0;
      const outputTokens = json.usageMetadata?.candidatesTokenCount ?? 0;
      // 失敗しても呼んだ分の原価は発生しうる。0 と書かず、分かる範囲で残す。
      const cost = costJpy(m, inputTokens, outputTokens) ?? 0;

      if (!res.ok) {
        return {
          ...base, ok: false, latencyMs, inputTokens, outputTokens, costJpy: cost,
          errorMessage: json.error?.message ?? `画像の生成に失敗しました（HTTP ${res.status}）`,
        };
      }

      const part = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData || p.inline_data);
      const inline = part?.inlineData ?? (part?.inline_data ? { data: part.inline_data.data, mimeType: part.inline_data.mime_type } : undefined);
      if (!inline?.data) {
        const reason = json.candidates?.[0]?.finishReason;
        return {
          ...base, ok: false, latencyMs, inputTokens, outputTokens, costJpy: cost,
          errorMessage:
            reason === "SAFETY" || reason === "PROHIBITED_CONTENT"
              ? "この写真では生成できませんでした。人物が正面から写った、明るい別の写真でお試しください。"
              : "画像が返ってきませんでした。もう一度お試しください。",
        };
      }

      return {
        ...base, ok: true, latencyMs, inputTokens, outputTokens, costJpy: cost,
        image: { bytes: Buffer.from(inline.data, "base64"), mime: inline.mimeType || "image/png" },
      };
    },
  };
}
