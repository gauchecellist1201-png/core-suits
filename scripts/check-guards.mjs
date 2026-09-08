/**
 * 検査そのものが忘れられていないか
 * ---------------------------------------------------------------------------
 * scripts/check-*.mjs を置いただけで npm run check に入れ忘れると、
 * 「緑だから安心」が嘘になる。ここでその忘れを見張る。
 */
import fs from "node:fs";
import { done } from "./_lib.mjs";

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const check = pkg.scripts.check ?? "";
const problems = [];

// ★ 名前が書いてあるだけでは足りない。落ちても check 全体が落ちない書き方
//   （`|| true` を付ける、`&&` を `;` に変える）にすると、検査は動いているのに
//   赤が握り潰される。変異試験でどちらも緑のまま素通りした。
//   そこで `&&` で区切った各段が、ちょうど `node scripts/<名前>` であることまで見る。
const steps = check.split("&&").map((s) => s.trim());

for (const f of fs.readdirSync("scripts")) {
  if (!f.startsWith("check-") || !f.endsWith(".mjs")) continue;
  if (f === "check-guards.mjs") continue;
  if (!check.includes(f)) {
    problems.push(`scripts/${f} が npm run check に入っていません`);
  } else if (!steps.includes(`node scripts/${f}`)) {
    problems.push(`scripts/${f} は書かれていますが、失敗しても check が止まらない形です`);
  }
}
if (!check.includes("npm run test")) problems.push("npm run check にテストが入っていません");
else if (!steps.includes("npm run test")) problems.push("npm run check のテストは、失敗しても check が止まらない形です");
if (!check.includes("npm run typecheck")) problems.push("npm run check に typecheck が入っていません");
else if (!steps.includes("npm run typecheck")) problems.push("npm run check の typecheck は、失敗しても check が止まらない形です");

done("検査の入れ忘れ", problems);
