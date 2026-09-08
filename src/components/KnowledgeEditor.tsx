"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Field, inputClass, textareaClass } from "@/components/ui/primitives";

const USE = [
  ["business", "ビジネス"], ["executive_meeting", "経営者の会談"], ["sales", "営業"],
  ["wedding", "結婚式"], ["formal", "フォーマル"], ["casual", "カジュアル"],
] as const;
const TIER = [["entry", "エントリー"], ["standard", "スタンダード"], ["premium", "プレミアム"], ["luxury", "ラグジュアリー"]] as const;

export function KnowledgeEditor({
  canEdit, items,
}: { canEdit: boolean; items: { id: string; title: string; body: string; applies: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useCases, setUseCases] = useState<string[]>([]);
  const [tiers, setTiers] = useState<string[]>([]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {
      title: String(fd.get("title") ?? ""),
      body: String(fd.get("body") ?? ""),
    };
    if (useCases.length) body.use_cases = useCases;
    if (tiers.length) body.price_tiers = tiers;
    const min = String(fd.get("age_min") ?? "");
    const max = String(fd.get("age_max") ?? "");
    if (min) body.age_min = Number(min);
    if (max) body.age_max = Number(max);

    try {
      const res = await fetch("/api/knowledge", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
      });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) {
        setError(json.message ?? "保存できませんでした。");
        setBusy(false);
        return;
      }
      setOpen(false);
      setUseCases([]);
      setTiers([]);
      setBusy(false);
      router.refresh();
    } catch {
      setError("通信に失敗しました。");
      setBusy(false);
    }
  }

  return (
    <>
      {items.length > 0 ? (
        <ul className="space-y-3 mb-5">
          {items.map((k) => (
            <li key={k.id}>
              <Card className="p-4">
                <div className="font-display text-[16px]">{k.title}</div>
                <p className="mt-1 text-[13px] text-muted leading-relaxed whitespace-pre-wrap">{k.body}</p>
                <p className="mt-2 text-[11px] text-faint">{k.applies}</p>
              </Card>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted mb-5">まだ登録がありません。</p>
      )}

      {!canEdit ? (
        <p className="text-[12px] text-faint">登録できるのはオーナーのみです。</p>
      ) : !open ? (
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>ノウハウを追加</Button>
      ) : (
        <form onSubmit={submit} className="border border-line rounded p-5 space-y-4 max-w-2xl">
          <Field label="見出し"><input name="title" className={inputClass} required maxLength={80} placeholder="40代経営者はプレミアム帯が通る" /></Field>
          <Field label="内容"><textarea name="body" rows={3} className={textareaClass} required maxLength={2000} /></Field>
          <div>
            <span className="block text-[12px] text-muted mb-2">効かせる用途</span>
            <Chips values={USE} selected={useCases} onToggle={setUseCases} />
          </div>
          <div>
            <span className="block text-[12px] text-muted mb-2">効かせる価格帯</span>
            <Chips values={TIER} selected={tiers} onToggle={setTiers} />
          </div>
          <div className="grid grid-cols-2 gap-4 max-w-xs">
            <Field label="年齢 下限"><input name="age_min" type="number" min={10} max={110} className={inputClass} /></Field>
            <Field label="年齢 上限"><input name="age_max" type="number" min={10} max={110} className={inputClass} /></Field>
          </div>
          {error ? <p role="alert" className="text-[13px] text-danger">{error}</p> : null}
          <div className="flex gap-3">
            <Button type="submit" size="sm" disabled={busy}>{busy ? "保存中…" : "保存"}</Button>
            <Button type="button" size="sm" variant="quiet" onClick={() => setOpen(false)}>やめる</Button>
          </div>
        </form>
      )}
    </>
  );
}

function Chips({
  values, selected, onToggle,
}: { values: readonly (readonly [string, string])[]; selected: string[]; onToggle: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {values.map(([v, l]) => {
        const on = selected.includes(v);
        return (
          <button
            key={v} type="button" aria-pressed={on}
            onClick={() => onToggle(on ? selected.filter((x) => x !== v) : [...selected, v])}
            className={`h-11 sm:h-8 px-3 rounded-sm border text-[12px] t-color ${
              on ? "border-navy bg-navy text-canvas" : "border-line bg-surface hover:bg-sunken"
            }`}
          >
            {l}
          </button>
        );
      })}
    </div>
  );
}
