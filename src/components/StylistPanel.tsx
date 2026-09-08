"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge, Button, Card, SectionTitle, inputAutoClass, inputClass } from "@/components/ui/primitives";

interface Item {
  fabric_id: string;
  fabric_name: string;
  color: string;
  pattern: string;
  image_id: string | null;
  score: number;
  reason: string;
  factors: { label: string; delta: number }[];
}

const QUICK = ["結婚式なら？", "もう少し若く見える感じ", "経営者らしく", "営業で印象がいいもの", "派手すぎないもの"];

const USE = [
  ["business", "ビジネス"], ["executive_meeting", "経営者の会談"], ["sales", "営業"],
  ["wedding", "結婚式"], ["formal", "フォーマル"], ["casual", "カジュアル"],
] as const;

export function StylistPanel({
  customerId, defaultUseCase, hasPhoto,
}: { customerId: string; defaultUseCase: string; hasPhoto: boolean }) {
  const [useCase, setUseCase] = useState(defaultUseCase);
  const [question, setQuestion] = useState("");
  const [items, setItems] = useState<Item[] | null>(null);
  const [byAi, setByAi] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(q?: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ customer_id: customerId, use_case: useCase, question: q || undefined }),
      });
      const json = (await res.json()) as {
        ok?: boolean; message?: string; items?: Item[]; reasons_by_ai?: boolean; note?: string;
      };
      if (!res.ok || !json.ok) {
        setError(json.message ?? "提案を出せませんでした。");
      } else {
        setItems(json.items ?? []);
        setByAi(Boolean(json.reasons_by_ai));
        setNote(json.note ?? null);
      }
    } catch {
      setError("通信に失敗しました。");
    }
    setBusy(false);
  }

  return (
    <Card className="p-6">
      <SectionTitle action={items ? <Badge tone={byAi ? "navy" : "neutral"}>{byAi ? "AI が理由づけ" : "相性ルールによる要約"}</Badge> : undefined}>
        AI スタイリスト
      </SectionTitle>

      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="block text-[12px] text-muted mb-1.5">ご用途</span>
          <select className={`${inputAutoClass} min-w-[180px]`} value={useCase} onChange={(e) => setUseCase(e.target.value)}>
            {USE.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <Button onClick={() => run()} disabled={busy}>{busy ? "考えています…" : "おすすめを出す"}</Button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {QUICK.map((q) => (
          <button
            key={q} type="button" disabled={busy}
            onClick={() => { setQuestion(q); void run(q); }}
            className="h-11 sm:h-8 px-3 rounded-sm border border-line bg-surface text-[12px] text-ink hover:bg-sunken t-color disabled:opacity-45"
          >
            {q}
          </button>
        ))}
      </div>

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => { e.preventDefault(); if (question.trim()) void run(question.trim()); }}
      >
        <input
          className={`${inputClass} flex-1`} value={question} maxLength={200}
          placeholder="ご要望を入力（例: 秋の会食で落ち着いて見えるもの）"
          onChange={(e) => setQuestion(e.target.value)}
        />
        <Button type="submit" variant="ghost" disabled={busy || !question.trim()}>聞く</Button>
      </form>

      {error ? <p role="alert" className="mt-4 text-[13px] text-danger">{error}</p> : null}
      {note ? <p className="mt-4 text-[13px] text-muted">{note}</p> : null}

      {items && items.length > 0 ? (
        <ol className="mt-6 space-y-3">
          {items.map((it, i) => (
            <li key={it.fabric_id}>
              <div className="border border-line rounded p-4 flex gap-4">
                <div className="w-16 h-16 rounded-sm bg-sunken border border-line overflow-hidden shrink-0">
                  {it.image_id ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/api/media/${it.image_id}`} alt="" className="w-full h-full object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-display text-[11px] text-brass tracking-widest">{String(i + 1).padStart(2, "0")}</span>
                    <span className="font-display text-[17px]">{it.fabric_name}</span>
                    <span className="text-[12px] text-muted">{it.color}</span>
                    <span className="ml-auto text-[11px] text-faint">相性 {it.score}</span>
                  </div>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-ink/85">{it.reason}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {it.factors.filter((f) => f.delta > 0).slice(0, 4).map((f) => (
                      <span key={f.label} className="text-[11px] text-muted bg-sunken border border-line rounded-sm px-1.5 py-0.5">
                        {f.label}
                      </span>
                    ))}
                  </div>
                  <div className="mt-3">
                    <Link
                      href={`/studio?customer=${customerId}&fabric=${it.fabric_id}`}
                      className="inline-flex items-center min-h-11 sm:min-h-0 text-[13px] text-navy hover:underline"
                    >
                      {hasPhoto ? "この生地で試着をつくる →" : "この生地をスタジオで開く →"}
                    </Link>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
      ) : null}

      {items && items.length === 0 && !note ? (
        <p className="mt-6 text-sm text-muted">条件に合う生地が見つかりませんでした。ご用途を変えるか、生地を登録してください。</p>
      ) : null}
    </Card>
  );
}
