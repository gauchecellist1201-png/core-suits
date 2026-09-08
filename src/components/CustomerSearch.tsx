"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Card, inputClass } from "@/components/ui/primitives";

export interface CustomerRow {
  id: string;
  name: string;
  photoId: string | null;
  occupation: string;
  age: number | null;
  colors: string;
  lastPurchaseAt: string | null;
  lastVisitAt: string | null;
}

export function CustomerSearch({ rows }: { rows: CustomerRow[] }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return rows;
    return rows.filter((r) =>
      [r.name, r.occupation, r.colors].join(" ").toLowerCase().includes(k),
    );
  }, [q, rows]);

  return (
    <>
      <input
        className={`${inputClass} max-w-sm mb-6`}
        placeholder="お名前・ご職業で探す"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="顧客を探す"
      />
      {filtered.length === 0 ? (
        <p className="text-sm text-muted py-10">「{q}」に当てはまるお客様はいません。</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((r) => (
            <li key={r.id}>
              <Link href={`/customers/${r.id}`} className="block h-full">
                <Card className="h-full p-4 flex gap-4 items-center t-lift hover:shadow-card">
                  <div className="w-14 h-14 rounded-sm bg-sunken border border-line overflow-hidden shrink-0">
                    {r.photoId ? (
                      // 顧客写真は認証付きルートからのみ配られる
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/api/media/${r.photoId}`} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-[10px] text-faint">写真なし</div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-display text-[17px] truncate">{r.name}</div>
                    <div className="text-[12px] text-muted truncate">
                      {[r.occupation, r.age ? `${r.age}歳` : null].filter(Boolean).join(" ・ ") || "詳細未登録"}
                    </div>
                    <div className="text-[11px] text-faint mt-1 truncate">
                      {r.lastPurchaseAt
                        ? `最終ご購入 ${r.lastPurchaseAt.slice(0, 10)}`
                        : r.lastVisitAt
                          ? `最終ご来店 ${r.lastVisitAt.slice(0, 10)}`
                          : "履歴なし"}
                    </div>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
