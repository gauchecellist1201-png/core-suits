/**
 * 偽物の AI・動かないボタンがないか
 * ---------------------------------------------------------------------------
 * ・「AI が書いた」と言えるのは、実際にモデルが返したときだけ
 * ・生成画像には必ず注意書きを添える
 * ・生地画像を渡さずに生成したときは、画面で分かるようにする
 * ・未実装は Coming Soon と明示する
 */
import { walk, read, done } from "./_lib.mjs";

const problems = [];

// 注意書きが、生成画像を出すすべての画面に添えられているか
const surfaces = [
  "src/components/Studio.tsx",
  "src/components/LookHistory.tsx",
  "src/app/share/[token]/page.tsx",
];
for (const f of surfaces) {
  if (!read(f).includes("{DISCLAIMER_JA}")) problems.push(`${f}: 生成画像の注意書きが画面に出ていません`);
}

// 理由づけの出どころを画面が区別しているか
const panel = read("src/components/StylistPanel.tsx");
if (!panel.includes("reasons_by_ai") || !panel.includes("相性ルール")) {
  problems.push("StylistPanel.tsx: AI が書いた場合とルール要約の区別を表示していません");
}
const stylist = read("src/lib/server/stylist.ts");
if (!stylist.includes("byAi: false")) problems.push("stylist.ts: AI が使えないときに byAi を false にしていません");
// ★ 「どこかに1つあれば合格」では足りない。AI に辿り着けない経路は3つある
//   （プロバイダ未設定・呼び出し失敗・返答を解釈できない）。変異試験で
//   「呼び出し失敗」の1つだけ byAi: true に変えたところ、AI が答えていないのに
//   画面が「AI が書いた」と言う状態になったのに、この検査は緑のままだった。
const FALLBACK = "reasons: ranked.map(summarizeFactors), byAi: false";
const fallbacks = stylist.split(FALLBACK).length - 1;
if (fallbacks < 3) {
  problems.push(`stylist.ts: AI に辿り着けなかったときの戻り値が byAi: true になっています（3か所必要／${fallbacks}か所）`);
}

// 生地画像なしの生成が黙って通っていないか
if (!read("src/lib/ai/types.ts").includes("usedFabricReference")) {
  problems.push("ai/types.ts: 生地画像を使えたかの印がありません");
}
for (const f of ["src/components/Studio.tsx", "src/components/LookHistory.tsx"]) {
  if (!read(f).includes("生地画像なし")) problems.push(`${f}: 生地画像なしの表示がありません`);
}

// onClick が空のボタン（押しても何も起きない）
for (const file of walk("src/components")) {
  const src = read(file);
  if (/onClick=\{\s*\(\)\s*=>\s*\{\s*\}\s*\}/.test(src)) problems.push(`${file}: 何もしないボタンがあります`);
  if (/href="#"/.test(src)) problems.push(`${file}: 行き先のないリンクがあります`);
}

done("偽物の AI・動かないボタンがない", problems);
