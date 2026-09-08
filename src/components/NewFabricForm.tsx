"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Field, inputClass, textareaClass } from "@/components/ui/primitives";

const COLOR_FAMILY = [
  ["navy", "ネイビー"], ["charcoal", "チャコール"], ["grey", "グレー"], ["brown", "ブラウン"],
  ["black", "ブラック"], ["blue", "ブルー"], ["beige", "ベージュ"], ["green", "グリーン"], ["other", "その他"],
] as const;
const PATTERN = [
  ["solid", "無地"], ["stripe", "ストライプ"], ["pinstripe", "ピンストライプ"], ["check", "チェック"],
  ["glen_check", "グレンチェック"], ["herringbone", "ヘリンボーン"], ["birdseye", "バーズアイ"], ["windowpane", "ウィンドウペン"],
] as const;
const SEASON = [["autumn_winter", "秋冬"], ["spring_summer", "春夏"], ["all_season", "通年"]] as const;
const TIER = [["entry", "エントリー"], ["standard", "スタンダード"], ["premium", "プレミアム"], ["luxury", "ラグジュアリー"]] as const;
const GLOSS = [["matte", "マット"], ["semi", "セミ"], ["high", "光沢あり"]] as const;

export function NewFabricForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/fabrics", { method: "POST", body: new FormData(e.currentTarget) });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) {
        setError(json.message ?? "登録できませんでした。");
        setBusy(false);
        return;
      }
      router.push("/fabrics");
      router.refresh();
    } catch {
      setError("通信に失敗しました。");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-3xl grid gap-6 lg:grid-cols-[260px_1fr] items-start">
      <Card className="p-5">
        <div className="aspect-square rounded-sm bg-sunken border border-line overflow-hidden mb-4">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="登録する生地の写真" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full grid place-items-center text-[11px] text-faint">写真を選ぶと表示されます</div>
          )}
        </div>
        <input
          name="file" type="file" accept="image/jpeg,image/png,image/webp" required
          onChange={(e) => {
            const f = e.target.files?.[0];
            setPreview(f ? URL.createObjectURL(f) : null);
          }}
          className="block w-full text-sm file:mr-3 file:h-10 file:px-4 file:rounded file:border-0 file:bg-sunken file:text-ink file:text-sm"
        />
        <div className="mt-4 text-[11px] text-muted leading-relaxed border-t border-line pt-4">
          <p className="font-medium text-ink mb-1.5">撮り方の目安</p>
          <ul className="space-y-1 list-disc pl-4">
            <li>同じ照明（自然光か、いつも同じ電球）</li>
            <li>同じ距離・真上から・生地で画面いっぱい</li>
            <li>影とテカリを入れない</li>
          </ul>
          <label className="flex items-center gap-2 mt-3 text-[12px] text-ink">
            <input type="checkbox" name="capture_ok" className="w-4 h-4" />
            この条件で撮影した
          </label>
        </div>
      </Card>

      <Card className="p-6 space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="生地名（必須）"><input name="name" className={inputClass} required maxLength={80} /></Field>
          <Field label="ブランド"><input name="brand" className={inputClass} maxLength={60} /></Field>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="コレクション"><input name="collection" className={inputClass} maxLength={60} /></Field>
          <Field label="品番"><input name="product_code" className={inputClass} maxLength={40} /></Field>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="色の呼び名（必須）" hint="例: チャコールグレー"><input name="color" className={inputClass} required maxLength={40} /></Field>
          <Field label="色の系統（必須）"><Select name="color_family" options={COLOR_FAMILY} required /></Field>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="柄（必須）"><Select name="pattern" options={PATTERN} required /></Field>
          <Field label="季節（必須）"><Select name="season" options={SEASON} required /></Field>
          <Field label="価格帯（必須）"><Select name="price_tier" options={TIER} required /></Field>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="素材"><input name="material" className={inputClass} maxLength={60} placeholder="ウール" /></Field>
          <Field label="混率"><input name="composition" className={inputClass} maxLength={80} placeholder="Wool 100%" /></Field>
          <Field label="目付 (g)"><input name="weight_g" type="number" min={100} max={900} className={inputClass} /></Field>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="光沢"><Select name="gloss" options={GLOSS} /></Field>
          <Field label="上代 (円)"><input name="price_jpy" type="number" min={0} className={inputClass} /></Field>
          <Field label="在庫 (m)"><input name="stock_m" type="number" min={0} step="0.1" className={inputClass} /></Field>
        </div>
        <Field label="メモ"><textarea name="notes" rows={2} className={textareaClass} maxLength={1000} /></Field>

        {error ? (
          <p role="alert" className="text-[13px] text-danger bg-danger/[0.06] border border-danger/25 rounded px-3 py-2.5">{error}</p>
        ) : null}
        <Button type="submit" disabled={busy}>{busy ? "登録しています…" : "登録する"}</Button>
      </Card>
    </form>
  );
}

function Select({
  name, options, required,
}: { name: string; options: readonly (readonly [string, string])[]; required?: boolean }) {
  return (
    <select name={name} className={inputClass} required={required} defaultValue={required ? options[0]![0] : ""}>
      {required ? null : <option value="">未選択</option>}
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}
