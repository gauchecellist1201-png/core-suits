import "server-only";
import { localStore } from "./local";
import { supabaseStore } from "./supabase";
import type { Store } from "./store";

export type { Store } from "./store";
export type { Table, TenantTable, Tables } from "./schema";

/**
 * どちらの保管を使うかの判定
 * ---------------------------------------------------------------------------
 * ★ 決まり: Supabase の設定があれば、必ず Supabase。
 *   「デモ用のローカル保管」が本物のデータを覆い隠すことは、絶対に起こしてはいけない。
 *   （過去に「見本の面が本物より先に出て危険を隠す」事故を起こしている）
 * ★ 本番（NODE_ENV=production かつ Vercel）でローカル保管に落ちることは許さない。
 *   落ちるくらいなら起動時に落として気づかせる。
 */
export function hasSupabase(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function getStore(): Store {
  if (hasSupabase()) return supabaseStore;
  if (process.env.VERCEL_ENV === "production") {
    throw new Error(
      "本番で SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が未設定です。" +
        "ローカル保管にはフォールバックしません（データが消えるため）。",
    );
  }
  return localStore;
}
