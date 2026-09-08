"use client";

import { useState } from "react";
import { Badge, Button, Card, SectionTitle } from "@/components/ui/primitives";
import { DISCLAIMER_JA } from "@/lib/ai/tryOnPrompt";

export interface Look {
  id: string;
  lookNo: number;
  resultMediaId: string | null;
  fabricName: string;
  fabricColor: string;
  createdAt: string;
  usedFabricReference: boolean;
}

export function LookHistory({
  customerId, looks, failedCount,
}: { customerId: string; looks: Look[]; failedCount: number }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function toggle(id: string) {
    setShareUrl(null);
    setSelected((v) => (v.includes(id) ? v.filter((x) => x !== id) : v.length >= 6 ? v : [...v, id]));
  }

  async function share() {
    // 二重に作らないよう、関数の頭で止める（確認ダイアログより前）
    if (busy || selected.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/shares", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ customer_id: customerId, try_on_ids: selected, days: 14 }),
      });
      const json = (await res.json()) as { ok?: boolean; message?: string; token?: string };
      if (!res.ok || !json.ok || !json.token) {
        setError(json.message ?? "共有リンクを作れませんでした。");
      } else {
        setShareUrl(`${window.location.origin}/share/${json.token}`);
      }
    } catch {
      setError("通信に失敗しました。");
    }
    setBusy(false);
  }

  async function copy() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("コピーできませんでした。リンクを長押しして選択してください。");
    }
  }

  return (
    <Card className="p-6">
      <SectionTitle
        action={
          looks.length > 1 ? (
            <span className="text-[12px] text-muted">
              {selected.length ? `${selected.length} 点を選択中` : "選んで比較・共有できます"}
            </span>
          ) : undefined
        }
      >
        試着の履歴
      </SectionTitle>

      {looks.length === 0 ? (
        <p className="text-sm text-muted">
          まだありません。{failedCount > 0 ? `（生成に失敗した回が ${failedCount} 回あります）` : ""}
        </p>
      ) : (
        <>
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {looks.map((l) => {
              const on = selected.includes(l.id);
              return (
                <li key={l.id}>
                  <button
                    type="button"
                    onClick={() => toggle(l.id)}
                    aria-pressed={on}
                    className={`block w-full text-left border rounded overflow-hidden t-color ${
                      on ? "border-navy ring-1 ring-navy" : "border-line hover:border-stone"
                    }`}
                  >
                    <div className="aspect-[3/4] bg-sunken">
                      {l.resultMediaId ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={`/api/media/${l.resultMediaId}`} alt={`ルック ${l.lookNo}`} className="w-full h-full object-cover" />
                      ) : null}
                    </div>
                    <div className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="font-display text-[11px] tracking-widest text-brass">
                          LOOK {String(l.lookNo).padStart(2, "0")}
                        </span>
                        {!l.usedFabricReference ? <Badge tone="danger">生地画像なし</Badge> : null}
                      </div>
                      <div className="mt-1 text-[13px] truncate">{l.fabricName}</div>
                      <div className="text-[11px] text-faint">{l.fabricColor} ・ {l.createdAt.slice(0, 10)}</div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          <p className="mt-4 text-[11px] text-faint leading-relaxed">{DISCLAIMER_JA}</p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button onClick={share} disabled={busy || selected.length === 0} variant="ghost" size="sm">
              {busy ? "作成中…" : "選んだルックを共有"}
            </Button>
            {shareUrl ? (
              <>
                <input readOnly value={shareUrl} className="flex-1 min-w-[220px] h-9 px-3 text-[12px] border border-line rounded bg-sunken" />
                <Button onClick={copy} size="sm">{copied ? "コピーしました" : "リンクをコピー"}</Button>
              </>
            ) : null}
          </div>
          {shareUrl ? (
            <p className="mt-2 text-[11px] text-faint">14日で見られなくなります。LINE やメールに貼ってお送りください。</p>
          ) : null}
          {error ? <p role="alert" className="mt-3 text-[13px] text-danger">{error}</p> : null}
        </>
      )}
    </Card>
  );
}
