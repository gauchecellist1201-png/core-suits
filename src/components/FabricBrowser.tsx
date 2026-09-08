"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, inputAutoClass, inputClass } from "@/components/ui/primitives";

export interface FabricRow {
  id: string; name: string; brand: string; color: string; colorFamily: string;
  pattern: string; season: string; priceTier: string; imageId: string | null;
  stock: number | null; code: string;
}

const COLOR_LABEL: Record<string, string> = {
  navy: "ネイビー", charcoal: "チャコール", grey: "グレー", brown: "ブラウン",
  black: "ブラック", blue: "ブルー", beige: "ベージュ", green: "グリーン", other: "その他",
};
const PATTERN_LABEL: Record<string, string> = {
  solid: "無地", stripe: "ストライプ", pinstripe: "ピンストライプ", check: "チェック",
  glen_check: "グレンチェック", herringbone: "ヘリンボーン", birdseye: "バーズアイ", windowpane: "ウィンドウペン",
};
const SEASON_LABEL: Record<string, string> = {
  spring_summer: "春夏", autumn_winter: "秋冬", all_season: "通年",
};

const PAGE = 60;

/** 生地は将来 100〜1000 点になる。検索と絞り込みを先に置き、描くのは 60 点ずつ。 */
export function FabricBrowser({ rows }: { rows: FabricRow[] }) {
  const [q, setQ] = useState("");
  const [color, setColor] = useState("");
  const [pattern, setPattern] = useState("");
  const [season, setSeason] = useState("");
  const [shown, setShown] = useState(PAGE);

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    return rows.filter((r) =>
      (!k || [r.name, r.brand, r.color, r.code].join(" ").toLowerCase().includes(k)) &&
      (!color || r.colorFamily === color) &&
      (!pattern || r.pattern === pattern) &&
      (!season || r.season === season),
    );
  }, [rows, q, color, pattern, season]);

  const page = filtered.slice(0, shown);

  return (
    <>
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          className={`${inputClass} max-w-xs`} placeholder="生地名・ブランド・品番"
          value={q} onChange={(e) => { setQ(e.target.value); setShown(PAGE); }} aria-label="生地を探す"
        />
        <Select value={color} onChange={(v) => { setColor(v); setShown(PAGE); }} label="色" options={COLOR_LABEL} />
        <Select value={pattern} onChange={(v) => { setPattern(v); setShown(PAGE); }} label="柄" options={PATTERN_LABEL} />
        <Select value={season} onChange={(v) => { setSeason(v); setShown(PAGE); }} label="季節" options={SEASON_LABEL} />
      </div>

      <p className="text-[12px] text-muted mb-4">{filtered.length} 点</p>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted py-10">条件に合う生地がありません。</p>
      ) : (
        <>
          <ul className="grid gap-4 grid-cols-2 sm:grid-cols-3 xl:grid-cols-4">
            {page.map((f) => (
              <li key={f.id}>
                <Link href={`/studio?fabric=${f.id}`} className="block group">
                  <div className="aspect-square rounded overflow-hidden border border-line bg-sunken">
                    {f.imageId ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/api/media/${f.imageId}`} alt={f.name} loading="lazy" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-[11px] text-faint">画像なし</div>
                    )}
                  </div>
                  <div className="mt-2">
                    <div className="text-[13px] truncate group-hover:underline">{f.name}</div>
                    <div className="text-[11px] text-faint truncate">
                      {[f.brand, f.color, PATTERN_LABEL[f.pattern]].filter(Boolean).join(" ・ ")}
                    </div>
                    {f.stock !== null && f.stock <= 0 ? (
                      <div className="mt-1"><Badge tone="danger">在庫なし</Badge></div>
                    ) : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          {shown < filtered.length ? (
            <div className="mt-8 text-center">
              <button
                onClick={() => setShown((v) => v + PAGE)}
                className="h-11 px-6 border border-line rounded bg-surface text-sm hover:bg-sunken t-color"
              >
                さらに {Math.min(PAGE, filtered.length - shown)} 点を表示
              </button>
            </div>
          ) : null}
        </>
      )}
    </>
  );
}

function Select({
  value, onChange, label, options,
}: { value: string; onChange: (v: string) => void; label: string; options: Record<string, string> }) {
  return (
    <select
      className={`${inputAutoClass} max-w-[13rem]`} value={value} aria-label={label}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{label}: すべて</option>
      {Object.entries(options).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}
