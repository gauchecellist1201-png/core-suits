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

for (const f of fs.readdirSync("scripts")) {
  if (!f.startsWith("check-") || !f.endsWith(".mjs")) continue;
  if (f === "check-guards.mjs") continue;
  if (!check.includes(f)) problems.push(`scripts/${f} が npm run check に入っていません`);
}
if (!check.includes("npm run test")) problems.push("npm run check にテストが入っていません");
if (!check.includes("npm run typecheck")) problems.push("npm run check に typecheck が入っていません");

done("検査の入れ忘れ", problems);
