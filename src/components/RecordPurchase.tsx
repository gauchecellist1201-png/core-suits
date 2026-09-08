"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, inputClass } from "@/components/ui/primitives";

export function RecordPurchase({
  customerId, fabrics, looks, followUpId,
}: {
  customerId: string;
  fabrics: { id: string; name: string; price: number | null }[];
  looks: { id: string; lookNo: number; fabricName: string }[];
  followUpId: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {
      customer_id: customerId,
      product_name: String(fd.get("product_name") ?? ""),
      amount_jpy: Number(fd.get("amount_jpy") ?? 0),
    };
    const fabricId = String(fd.get("fabric_id") ?? "");
    if (fabricId) body.fabric_id = fabricId;
    const tryOnId = String(fd.get("influenced_by_try_on_id") ?? "");
    if (tryOnId) body.influenced_by_try_on_id = tryOnId;
    if (followUpId) body.follow_up_id = followUpId;

    try {
      const res = await fetch("/api/purchases", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
      });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) {
        setError(json.message ?? "保存できませんでした。");
        setBusy(false);
        return;
      }
      // 書けたことを確かめてから「保存しました」と言う
      setDone(true);
      setOpen(false);
      setBusy(false);
      router.refresh();
    } catch {
      setError("通信に失敗しました。");
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => { setOpen(true); setDone(false); }}>
          ご成約を記録
        </Button>
        {done ? <span className="text-[12px] text-success">記録しました。</span> : null}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="border border-line rounded p-4 space-y-4 bg-sunken/50">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="商品名（必須）">
          <input name="product_name" className={inputClass} required maxLength={80} defaultValue="オーダースーツ" />
        </Field>
        <Field label="金額（円・必須）">
          <input name="amount_jpy" type="number" min={0} max={10000000} className={inputClass} required />
        </Field>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="生地">
          <select name="fabric_id" className={inputClass} defaultValue="">
            <option value="">選択しない</option>
            {fabrics.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </Field>
        <Field label="きっかけになった試着" hint="ROAI の計算に使われます">
          <select name="influenced_by_try_on_id" className={inputClass} defaultValue="">
            <option value="">なし</option>
            {looks.map((l) => (
              <option key={l.id} value={l.id}>LOOK {String(l.lookNo).padStart(2, "0")} / {l.fabricName}</option>
            ))}
          </select>
        </Field>
      </div>
      {error ? <p role="alert" className="text-[13px] text-danger">{error}</p> : null}
      <div className="flex gap-3">
        <Button type="submit" size="sm" disabled={busy}>{busy ? "保存中…" : "保存"}</Button>
        <Button type="button" size="sm" variant="quiet" onClick={() => setOpen(false)}>やめる</Button>
      </div>
    </form>
  );
}
