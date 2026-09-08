/**
 * 実データを見本が覆い隠さないか
 * ---------------------------------------------------------------------------
 * ・Supabase の設定があるときは必ず Supabase を使う（ローカル保管に落ちない）
 * ・本番でローカル保管に落ちたら例外で止める
 * ・seed は Supabase が設定されている環境では動かない
 */
import { read, done } from "./_lib.mjs";

const problems = [];
const idx = read("src/lib/db/index.ts");

// ★ getStore() の中だけを見る。ファイル全体で探すと、上の hasSupabase 定義に当たって
//   「Supabase が先」と誤って合格してしまう（実際にこの検査は最初それで見逃した）。
const getStoreBody = idx.slice(Math.max(0, idx.indexOf("export function getStore")));
const firstReturn = getStoreBody.match(/return\s+(\w+)/);
if (!firstReturn || firstReturn[1] !== "supabaseStore") {
  problems.push("db/index.ts: getStore() が最初に返すのが supabaseStore ではありません（見本が実データを覆い隠します）");
}
if (!getStoreBody.includes("if (hasSupabase()) return supabaseStore;")) {
  problems.push("db/index.ts: Supabase を最優先する分岐がありません");
}
if (!getStoreBody.includes("VERCEL_ENV") || !getStoreBody.includes("throw new Error")) {
  problems.push("db/index.ts: 本番でローカル保管に落ちたときに止める処理がありません");
}
// ★ getStore() の中だけを見ると、その判断のもとになる hasSupabase() の中身が
//   すり替わっても気づけない。変異試験で hasSupabase() に環境変数の条件を1つ
//   足したところ（SUITS_USE_SUPABASE が無ければ false）、Supabase を設定した
//   本番でもローカル保管＝見本データに落ちるのに、この検査は緑のままだった。
const hasBody = idx.slice(
  Math.max(0, idx.indexOf("export function hasSupabase")),
  Math.max(0, idx.indexOf("export function getStore")),
);
if (!/return Boolean\(\s*process\.env\.SUPABASE_URL && process\.env\.SUPABASE_SERVICE_ROLE_KEY\s*\);/.test(hasBody)) {
  problems.push("db/index.ts: hasSupabase() の条件に、接続情報以外のものが混ざっています");
}

const seed = read("scripts/seed.mjs");
if (!seed.includes("process.env.SUPABASE_URL")) {
  problems.push("seed.mjs: Supabase 環境での実行を止めていません");
}

done("見本が実データを覆い隠さない", problems);
