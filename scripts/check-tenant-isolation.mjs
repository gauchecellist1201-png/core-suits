/**
 * 店舗の分離が破れていないか
 * ---------------------------------------------------------------------------
 * Supabase への問い合わせは、店舗スコープの表なら必ず organization_id で絞る。
 * 絞らないのは organizations / users(ログイン) / share_links(トークン) の3つだけ。
 *
 * ★注意★ 判定は「その1文の中」だけを見る。前後の行に organization_id があるからと
 *   通してしまうと、絞り忘れを見逃す（実際にこの検査は最初その作りで見逃した）。
 */
import { walk, read, done } from "./_lib.mjs";

const EXEMPT_TABLES = new Set(["organizations", "users", "share_links"]);
const problems = [];

/** `.from("x")` から、その文が終わる `;` までを1文として切り出す */
function statementAt(src, idx) {
  const end = src.indexOf(";", idx);
  return src.slice(idx, end < 0 ? src.length : end);
}

for (const file of walk("src")) {
  const src = read(file);
  // ★ 文字列リテラルだけを見ると、共通実装の .from(table)（変数渡し）を丸ごと見逃す。
  //   実際にこの検査は最初その作りで、絞り込みを消しても合格していた。
  const re = /\.from\(\s*(?:(["'`])([a-z_]+)\1|([A-Za-z_$][\w$]*))\s*\)/g;
  let m;
  while ((m = re.exec(src))) {
    // Buffer.from / storage.from は DB の問い合わせではない
    // 改行やインデントを挟むことがあるので、空白を落としてから判定する
    const before = src.slice(Math.max(0, m.index - 40), m.index).replace(/\s+/g, "");
    if (/Buffer$|storage$/.test(before)) continue;
    const table = m[2] ?? `<変数 ${m[3]}>`;
    if (m[2] && EXEMPT_TABLES.has(m[2])) continue;
    const stmt = statementAt(src, m.index);
    // insert は行の中に organization_id を持つ行データを渡すので対象外
    if (/^\.from\([^)]*\)\.insert\(/.test(stmt)) continue;
    if (!stmt.includes('"organization_id"')) {
      problems.push(`${file}: .from("${table}") の1文に organization_id の絞り込みがありません`);
    }
  }
}

// Store の口が organizationId を要求し続けているか（引数を落とすと分離が消える）
// ★ 以前は i+220 文字という固定長の窓で見ていた。宣言はそれより短いので窓が
//   次のメソッドの宣言まで届き、そちらの organizationId を見て合格していた。
//   （変異試験: list< / update< から organizationId を消しても緑のままだった）
//   窓はその宣言を閉じる ";" までに限る。
const store = read("src/lib/db/store.ts");
for (const sig of ["list<", "get<", "update<", "remove<"]) {
  const i = store.indexOf(sig);
  if (i < 0) { problems.push(`store.ts: ${sig} が見つかりません`); continue; }
  const end = store.indexOf(";", i);
  const decl = store.slice(i, end < 0 ? store.length : end);
  if (!decl.includes("organizationId")) {
    problems.push(`store.ts: ${sig} が organizationId を要求していません`);
  }
}

// ローカル保管でも同じ約束が守られているか
// ★ 短い部分文字列で探すと、別の行の長い条件に一致して見逃す。
//   一覧・単体それぞれに固有の形で確かめる。
const local = read("src/lib/db/local.ts");
const localNeeds = [
  ["一覧", "(r) => r.organization_id === organizationId && (!where", 1],
  ["単体", "rows.find((r) => r.id === id && r.organization_id === organizationId)", 1],
  // 更新と削除の2か所。1つに減っていたら片方が絞られていない
  ["更新・削除", "rows.findIndex((r) => r.id === id && r.organization_id === organizationId)", 2],
];
for (const [label, need, times] of localNeeds) {
  const found = local.split(need).length - 1;
  if (found < times) problems.push(`local.ts: ${label}が店舗で絞られていません（${times}か所必要／${found}か所）`);
}

done("店舗の分離（organization_id）", problems);
