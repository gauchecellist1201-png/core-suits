import { costJpy } from "../pricing";
import type { TextProvider, TextResult } from "../types";

/** Claude（スタイリストの理由づけ担当）。生成そのものではなく「なぜ似合うか」を書く。 */
export function createAnthropicTextProvider(model?: string): TextProvider {
  const m = model || process.env.SUITS_TEXT_MODEL || "claude-haiku-4-5-20251001";
  return {
    name: "anthropic",
    model: m,
    async complete(system: string, user: string, maxTokens: number): Promise<TextResult> {
      const started = Date.now();
      const key = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
      const base = { provider: "anthropic", model: m, inputTokens: 0, outputTokens: 0, costJpy: 0 };
      if (!key) {
        return { ...base, ok: false, text: "", latencyMs: 0, errorMessage: "ANTHROPIC_API_KEY が未設定です。" };
      }
      try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-api-key": key,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: m, max_tokens: maxTokens, system,
            messages: [{ role: "user", content: user }],
          }),
          signal: AbortSignal.timeout(60_000),
        });
        const latencyMs = Date.now() - started;
        const json = (await res.json()) as {
          content?: { type: string; text?: string }[];
          usage?: { input_tokens?: number; output_tokens?: number };
          error?: { message?: string };
        };
        const inputTokens = json.usage?.input_tokens ?? 0;
        const outputTokens = json.usage?.output_tokens ?? 0;
        const cost = costJpy(m, inputTokens, outputTokens) ?? 0;
        if (!res.ok) {
          return { provider: "anthropic", model: m, ok: false, text: "", latencyMs, inputTokens, outputTokens, costJpy: cost, errorMessage: json.error?.message ?? `HTTP ${res.status}` };
        }
        const text = (json.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("").trim();
        return { provider: "anthropic", model: m, ok: true, text, latencyMs, inputTokens, outputTokens, costJpy: cost };
      } catch (e) {
        return { ...base, ok: false, text: "", latencyMs: Date.now() - started, errorMessage: e instanceof Error ? e.message : "通信エラー" };
      }
    },
  };
}
