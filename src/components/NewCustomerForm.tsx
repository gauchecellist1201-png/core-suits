"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Field, inputClass, textareaClass } from "@/components/ui/primitives";

const STYLES = [
  ["classic", "クラシック"], ["modern", "モダン"], ["british", "ブリティッシュ"],
  ["italian", "イタリアン"], ["minimal", "ミニマル"],
] as const;
const BODY = [
  ["slim", "細身"], ["standard", "標準"], ["athletic", "がっしり（筋肉質）"],
  ["sturdy", "がっしり（体格良い）"], ["tall_slim", "長身細身"],
] as const;
const SKIN = [["fair", "色白"], ["light", "明るめ"], ["medium", "標準"], ["olive", "オリーブ"], ["dark", "濃いめ"]] as const;
const USE = [
  ["business", "ビジネス"], ["executive_meeting", "経営者の会談"], ["sales", "営業"],
  ["wedding", "結婚式"], ["formal", "フォーマル"], ["ceremony", "式典"],
  ["party", "パーティー"], ["casual", "カジュアル"],
] as const;
const COLORS = ["ネイビー", "チャコール", "グレー", "ブラウン", "ブラック", "ブルー", "ベージュ", "グリーン"];

export function NewCustomerForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [colors, setColors] = useState<string[]>([]);
  const [photo, setPhoto] = useState<File | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const body: Record<string, unknown> = { preferred_colors: colors };
    for (const [k, v] of fd.entries()) {
      if (typeof v === "string" && v.trim() !== "" && k !== "file") body[k] = v;
    }

    try {
      const res = await fetch("/api/customers", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
      });
      const json = (await res.json()) as { ok?: boolean; message?: string; customer?: { id: string } };
      if (!res.ok || !json.ok || !json.customer) {
        setError(json.message ?? "登録できませんでした。");
        setBusy(false);
        return;
      }
      // 写真があれば続けて送る。写真の失敗で顧客登録まで失われないよう、順番はこの向き。
      if (photo) {
        const pf = new FormData();
        pf.append("file", photo);
        const pr = await fetch(`/api/customers/${json.customer.id}/photos`, { method: "POST", body: pf });
        if (!pr.ok) {
          const pj = (await pr.json().catch(() => ({}))) as { message?: string };
          setError(`顧客は登録しましたが、写真は保存できませんでした（${pj.message ?? "エラー"}）。顧客ページから追加できます。`);
          setBusy(false);
          setTimeout(() => router.push(`/customers/${json.customer!.id}`), 2500);
          return;
        }
      }
      router.push(`/customers/${json.customer.id}`);
      router.refresh();
    } catch {
      setError("通信に失敗しました。");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-2xl">
      <Card className="p-6 space-y-5">
        <Field label="お名前（必須）">
          <input name="name" className={inputClass} required maxLength={60} />
        </Field>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="年齢"><input name="age" type="number" min={10} max={110} className={inputClass} /></Field>
          <Field label="身長 (cm)"><input name="height_cm" type="number" min={120} max={230} className={inputClass} /></Field>
          <Field label="ご職業"><input name="occupation" className={inputClass} maxLength={60} /></Field>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="体型"><Select name="body_type" options={BODY} /></Field>
          <Field label="肌の色" hint="生地の色の相性判定に使います"><Select name="skin_tone" options={SKIN} /></Field>
          <Field label="お好みのスタイル"><Select name="preferred_style" options={STYLES} /></Field>
        </div>
        <Field label="主な用途"><Select name="primary_use_case" options={USE} /></Field>

        <div>
          <span className="block text-[12px] text-muted mb-2">お好みの色（複数可）</span>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => {
              const on = colors.includes(c);
              return (
                <button
                  key={c} type="button"
                  onClick={() => setColors((v) => (on ? v.filter((x) => x !== c) : [...v, c]))}
                  aria-pressed={on}
                  className={`h-11 sm:h-9 px-3 rounded-sm border text-[13px] t-color ${
                    on ? "border-navy bg-navy text-canvas" : "border-line bg-surface text-ink hover:bg-sunken"
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        <Field label="メモ" hint="ご要望・体型のお悩み・前回の会話など">
          <textarea name="notes" rows={3} className={textareaClass} maxLength={2000} />
        </Field>

        <Field label="お写真" hint="正面・全身または上半身。明るい場所で。試着イメージの土台になります。">
          <input
            type="file" accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
            className="block w-full text-sm file:mr-4 file:h-10 file:px-4 file:rounded file:border-0 file:bg-sunken file:text-ink file:text-sm"
          />
        </Field>
      </Card>

      {error ? (
        <p role="alert" className="mt-4 text-[13px] text-danger bg-danger/[0.06] border border-danger/25 rounded px-3 py-2.5">
          {error}
        </p>
      ) : null}

      <div className="mt-6">
        <Button type="submit" disabled={busy}>{busy ? "登録しています…" : "登録する"}</Button>
      </div>
    </form>
  );
}

function Select({ name, options }: { name: string; options: readonly (readonly [string, string])[] }) {
  return (
    <select name={name} className={inputClass} defaultValue="">
      <option value="">未選択</option>
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}
