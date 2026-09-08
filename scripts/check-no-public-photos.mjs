/**
 * 顧客写真が公開の場所に出ていないか
 * ---------------------------------------------------------------------------
 * ・public/ に画像を置かない（静的配信は認証を通らない）
 * ・Supabase Storage の公開URL（getPublicUrl）を使わない
 * ・画像の配り口 /api/media/[id] が、ログインか共有トークンのどちらかを必ず確認している
 */
import fs from "node:fs";
import { walk, read, done } from "./_lib.mjs";

const problems = [];

if (fs.existsSync("public")) {
  const imgs = walk("public", [".jpg", ".jpeg", ".png", ".webp"]);
  if (imgs.length) problems.push(`public/ に画像があります: ${imgs.join(", ")}`);
}

for (const file of walk("src")) {
  const src = read(file);
  if (src.includes("getPublicUrl")) problems.push(`${file}: getPublicUrl は使えません（公開URLになります）`);
  if (/public:\s*true/.test(src)) problems.push(`${file}: 公開バケットの指定があります`);
}

const route = read("src/app/api/media/[id]/route.ts");
for (const need of ["currentSession", "findShareLinkByToken", "revoked", "expires_at"]) {
  if (!route.includes(need)) problems.push(`media ルートに ${need} の確認がありません`);
}
if (!route.includes('"private')) problems.push("media ルートの cache-control が private ではありません");
// 共有トークンで見られる範囲が、そのリンクの試着に限られているか
if (!route.includes("allowed.has(id)")) problems.push("共有トークンで任意の画像が取れる恐れがあります（許可リストの確認がありません）");

done("顧客写真の配り方", problems);
