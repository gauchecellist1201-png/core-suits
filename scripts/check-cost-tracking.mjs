/**
 * AI を呼んだら必ず原価が残るか
 * ---------------------------------------------------------------------------
 * ・成功でも失敗でも ai_jobs に1行残す
 * ・生成の前に必ず上限を確認する
 * ・料金表に無いモデルを 0 円として扱っていない
 */
import { read, done, walk } from "./_lib.mjs";

const problems = [];
const tryon = read("src/lib/server/tryon.ts");

// ★ import 行に名前があるだけでは「呼んでいる」ことにならない。呼び出しの形で数える。
const body = tryon.slice(Math.max(0, tryon.indexOf("export async function generateTryOn")));
const gate = body.indexOf("await assertCanGenerate(");
const provider = body.indexOf("await provider.generateTryOn(");
const record = body.indexOf("await recordAiJob(");
const failBranch = body.indexOf("if (!result.ok");

if (gate < 0) problems.push("tryon.ts: 生成前に assertCanGenerate() を呼んでいません");
if (!body.includes("if (!verdict.allowed) return")) problems.push("tryon.ts: 上限に達したときに止めていません");
if (provider < 0) problems.push("tryon.ts: 生成の呼び出しが見つかりません");
if (gate >= 0 && provider >= 0 && gate > provider) problems.push("tryon.ts: 上限の確認が生成より後になっています");
if (record < 0) problems.push("tryon.ts: 原価の記録 recordAiJob() を呼んでいません");
if (record >= 0 && failBranch >= 0 && record > failBranch) {
  problems.push("tryon.ts: 失敗時に原価が記録されない順序になっています");
}

const stylist = read("src/lib/server/stylist.ts");
if (!stylist.includes("await recordAiJob(")) problems.push("stylist.ts: 文章生成の原価が記録されていません");

const pricing = read("src/lib/ai/pricing.ts");
if (!pricing.includes("return null")) problems.push("pricing.ts: 未知のモデルを不明として扱っていません");
if (!pricing.includes("RATES_CHECKED_ON")) problems.push("pricing.ts: 料金を確認した日付がありません");

// プランに無制限が紛れ込んでいないか
// ★ 以前は tryOnsPerMonth だけを見ていた。原価の上限（costLimitJpy）を Infinity に
//   しても緑のままで、回数は残っていても青天井に課金される穴が空いていた
//   （変異試験: enterprise の costLimitJpy: Infinity が素通りした）。
const plans = read("src/lib/domain/plans.ts");
if (/(tryOnsPerMonth|costLimitJpy):\s*(Infinity|-1|0\b)/.test(plans)) {
  problems.push("plans.ts: 実質無制限（または実質停止）のプランがあります");
}

// 上限確認をすり抜ける生成経路がないか
for (const file of walk("src/app/api")) {
  const src = read(file);
  // ★ 「generateTryOn が書いてあれば見逃す」という逃げ道があった。同じファイルに
  //   generateTryOn 経由の入り口と、プロバイダ直叩きの入り口が並ぶと素通りする
  //   （変異試験: 同じ route.ts に上限確認を通さない PUT を足しても緑だった）。
  //   API の下でプロバイダを直に掴むこと自体を禁じる。
  if (src.includes("getImageProvider(")) {
    problems.push(`${file}: 画像プロバイダを直接呼んでいます（上限確認と原価記録を通してください）`);
  }
}

done("AI 原価の記録と上限", problems);
