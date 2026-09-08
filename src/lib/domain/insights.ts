/**
 * 顧客ページの「分かっていること」
 * ---------------------------------------------------------------------------
 * 台帳に入っている事実だけを短くまとめる。推測・見込み・作り話は書かない。
 */
export function buildInsights(x: {
  age?: number;
  occupation?: string;
  style?: string;
  purchases: { name: string; amount: number; colorFamily?: string }[];
  months: number | null;
}): string[] {
  const out: string[] = [];
  if (x.purchases.length > 0) {
    const total = x.purchases.reduce((s, p) => s + p.amount, 0);
    const avg = Math.round(total / x.purchases.length);
    out.push(`これまでに ${x.purchases.length} 着ご購入。平均 ${avg.toLocaleString("ja-JP")} 円のご予算帯です。`);
    const families = x.purchases.map((p) => p.colorFamily).filter(Boolean) as string[];
    if (families.length) {
      const uniq = Array.from(new Set(families));
      out.push(
        uniq.length === 1
          ? `お手持ちは ${jaColor(uniq[0]!)} 系に寄っています。別系統をご提案すると着回しが広がります。`
          : `お手持ちは ${uniq.map(jaColor).join("・")} 系。重ならない色をご提案できます。`,
      );
    }
  }
  if (x.months !== null && x.months >= 6) {
    out.push(`前回のご購入から ${x.months} ヶ月が経過しています。`);
  }
  if (x.occupation && x.age) {
    out.push(`${x.age}歳・${x.occupation}。人前に立つ機会の多さを前提にご提案します。`);
  }
  return out;
}

function jaColor(f: string): string {
  return ({
    navy: "ネイビー", charcoal: "チャコール", grey: "グレー", brown: "ブラウン",
    black: "ブラック", blue: "ブルー", beige: "ベージュ", green: "グリーン", other: "その他",
  } as Record<string, string>)[f] ?? f;
}
