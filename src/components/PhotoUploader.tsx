"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/primitives";

export function PhotoUploader({
  customerId, photos, currentId,
}: { customerId: string; photos: string[]; currentId: string | null }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    if (busy) return;
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch(`/api/customers/${customerId}/photos`, { method: "POST", body: fd });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) setError(json.message ?? "保存できませんでした。");
      else router.refresh();
    } catch {
      setError("通信に失敗しました。");
    }
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function setPrimary(mediaId: string) {
    if (busy) return;
    setBusy(true);
    try {
      await fetch(`/api/customers/${customerId}`, {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ primary_photo_id: mediaId }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {photos.length > 1 ? (
        <div className="flex gap-2 mb-3 flex-wrap">
          {photos.map((id) => (
            <button
              key={id} type="button" onClick={() => setPrimary(id)} disabled={busy}
              aria-label="この写真を主写真にする"
              className={`w-12 h-12 rounded-sm overflow-hidden border t-color ${
                id === currentId ? "border-navy ring-1 ring-navy" : "border-line hover:border-stone"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/media/${id}`} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}

      <input
        ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }}
      />
      <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()} disabled={busy} className="w-full">
        {busy ? "保存中…" : photos.length ? "お写真を追加" : "お写真を登録"}
      </Button>
      {error ? <p role="alert" className="mt-2 text-[12px] text-danger">{error}</p> : null}
      <p className="mt-2 text-[11px] text-faint leading-relaxed">
        お客様の写真は店舗内でのみ使用し、共有リンク以外で外部に出ることはありません。
      </p>
    </div>
  );
}
