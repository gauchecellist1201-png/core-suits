"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Button, Card, SectionTitle, inputClass, yen } from "@/components/ui/primitives";
import { DISCLAIMER_JA } from "@/lib/ai/tryOnPrompt";

interface CustomerOpt { id: string; name: string; photoId: string | null }
interface FabricOpt { id: string; name: string; color: string; pattern: string; imageId: string | null; brand: string }

interface Look {
  tryOnId: string;
  lookNo: number;
  mediaId: string;
  fabricId: string;
  fabricName: string;
  usedFabricReference: boolean;
}

const SCENES = [
  ["business", "ビジネス"], ["executive_meeting", "経営者の会談"], ["sales", "営業"],
  ["wedding", "結婚式"], ["formal", "フォーマル"], ["casual", "カジュアル"],
] as const;
const STYLES = [
  ["classic", "クラシック"], ["modern", "モダン"], ["british", "ブリティッシュ"],
  ["italian", "イタリアン"], ["minimal", "ミニマル"],
] as const;
const TIES = [["none", "ノーネクタイ"], ["navy", "ネイビータイ"], ["burgundy", "エンジのタイ"]] as const;

export function Studio({
  customers, fabrics, initialCustomerId, initialFabricId, usage, providerConfigured, estimateJpy, modelName,
}: {
  customers: CustomerOpt[];
  fabrics: FabricOpt[];
  initialCustomerId: string | null;
  initialFabricId: string | null;
  usage: { used: number; limit: number };
  providerConfigured: boolean;
  estimateJpy: number;
  modelName: string;
}) {
  const [customerId, setCustomerId] = useState(initialCustomerId ?? customers[0]?.id ?? "");
  const [fabricId, setFabricId] = useState(initialFabricId ?? fabrics[0]?.id ?? "");
  const [fabricQuery, setFabricQuery] = useState("");
  const [scene, setScene] = useState<string>("business");
  const [style, setStyle] = useState<string>("classic");
  const [tie, setTie] = useState<string>("none");
  const [threePiece, setThreePiece] = useState(false);

  const [looks, setLooks] = useState<Look[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usedCount, setUsedCount] = useState(usage.used);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const customer = customers.find((c) => c.id === customerId) ?? null;
  const fabric = fabrics.find((f) => f.id === fabricId) ?? null;
  const remaining = Math.max(0, usage.limit - usedCount);

  const fabricMatches = useMemo(() => {
    const k = fabricQuery.trim().toLowerCase();
    if (!k) return fabrics.slice(0, 24);
    return fabrics.filter((f) => [f.name, f.brand, f.color].join(" ").toLowerCase().includes(k)).slice(0, 24);
  }, [fabricQuery, fabrics]);

  async function generate() {
    // 二重押しはここで止める（確認より前・見た目より前）
    if (busy) return;
    if (!customerId || !fabricId) return;
    setBusy(true);
    setError(null);
    setShareUrl(null);
    try {
      const res = await fetch("/api/tryons", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          customer_id: customerId,
          fabric_id: fabricId,
          garment: {
            style, scene, tie,
            piece: threePiece ? "three_piece" : "two_piece",
            lapel: "notch", buttons: 2, shirt: "white",
          },
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean; message?: string;
        try_on?: { id: string; look_no: number; result_media_id?: string; fabric_media_id?: string };
      };
      if (!res.ok || !json.ok || !json.try_on?.result_media_id) {
        setError(json.message ?? "生成できませんでした。");
      } else {
        setLooks((v) => [
          ...v,
          {
            tryOnId: json.try_on!.id,
            lookNo: json.try_on!.look_no,
            mediaId: json.try_on!.result_media_id!,
            fabricId,
            fabricName: fabric?.name ?? "",
            usedFabricReference: Boolean(json.try_on!.fabric_media_id),
          },
        ]);
        setUsedCount((n) => n + 1);
      }
    } catch {
      setError("通信に失敗しました。生成に時間がかかっている場合もあります。顧客ページで履歴をご確認ください。");
    }
    setBusy(false);
  }

  async function share() {
    if (busy || looks.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/shares", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ customer_id: customerId, try_on_ids: looks.map((l) => l.tryOnId).slice(0, 6), days: 14 }),
      });
      const json = (await res.json()) as { ok?: boolean; message?: string; token?: string };
      if (!res.ok || !json.ok || !json.token) setError(json.message ?? "共有リンクを作れませんでした。");
      else setShareUrl(`${window.location.origin}/share/${json.token}`);
    } catch {
      setError("通信に失敗しました。");
    }
    setBusy(false);
  }

  if (customers.length === 0 || fabrics.length === 0) {
    return (
      <Card className="p-8">
        <p className="font-display text-lg">はじめる前に</p>
        <p className="mt-2 text-sm text-muted leading-relaxed">
          {customers.length === 0 ? "お客様を1名、" : ""}
          {fabrics.length === 0 ? "生地を1点、" : ""}
          登録すると試着をつくれます。
        </p>
        <div className="mt-5 flex gap-3">
          {customers.length === 0 ? <Link href="/customers/new" className="text-navy hover:underline text-sm">顧客を登録 →</Link> : null}
          {fabrics.length === 0 ? <Link href="/fabrics/new" className="text-navy hover:underline text-sm">生地を登録 →</Link> : null}
        </div>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr] items-start">
      {/* 設定 */}
      <Card className="p-5 space-y-5">
        <div>
          <span className="block text-[12px] text-muted mb-1.5">お客様</span>
          <select className={inputClass} value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {customer && !customer.photoId ? (
            <p className="mt-2 text-[12px] text-danger">
              このお客様の写真が未登録です。
              <Link href={`/customers/${customer.id}`} className="underline ml-1">写真を登録</Link>
            </p>
          ) : null}
        </div>

        <div>
          <span className="block text-[12px] text-muted mb-1.5">生地</span>
          <input
            className={`${inputClass} mb-2`} placeholder="生地を探す"
            value={fabricQuery} onChange={(e) => setFabricQuery(e.target.value)} aria-label="生地を探す"
          />
          <ul className="grid grid-cols-4 gap-2 max-h-[220px] overflow-y-auto pr-1">
            {fabricMatches.map((f) => (
              <li key={f.id}>
                <button
                  type="button" onClick={() => setFabricId(f.id)} aria-pressed={f.id === fabricId}
                  title={`${f.name} / ${f.color}`}
                  className={`block w-full aspect-square rounded-sm overflow-hidden border t-color ${
                    f.id === fabricId ? "border-navy ring-1 ring-navy" : "border-line hover:border-stone"
                  }`}
                >
                  {f.imageId ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/api/media/${f.imageId}`} alt={f.name} loading="lazy" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[9px] text-faint grid place-items-center h-full">画像なし</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
          {fabric ? (
            <p className="mt-2 text-[12px]">
              <span className="text-ink">{fabric.name}</span>
              <span className="text-faint"> ・ {fabric.color}</span>
              {!fabric.imageId ? <span className="block text-danger mt-1">生地写真が未登録です。色と柄の再現度が大きく落ちます。</span> : null}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-[12px] text-muted mb-1.5">ご用途</span>
            <select className={inputClass} value={scene} onChange={(e) => setScene(e.target.value)}>
              {SCENES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="block text-[12px] text-muted mb-1.5">仕立ての印象</span>
            <select className={inputClass} value={style} onChange={(e) => setStyle(e.target.value)}>
              {STYLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3 items-end">
          <label className="block">
            <span className="block text-[12px] text-muted mb-1.5">ネクタイ</span>
            <select className={inputClass} value={tie} onChange={(e) => setTie(e.target.value)}>
              {TIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 h-11 text-[13px]">
            <input type="checkbox" className="w-4 h-4" checked={threePiece} onChange={(e) => setThreePiece(e.target.checked)} />
            スリーピース
          </label>
        </div>

        {!providerConfigured ? (
          <p className="text-[12px] text-danger bg-danger/[0.06] border border-danger/25 rounded px-3 py-2.5 leading-relaxed">
            画像生成の接続が未設定です。設定 → AI 接続 をご確認ください。
          </p>
        ) : null}

        <Button
          onClick={generate}
          disabled={busy || !providerConfigured || !customer?.photoId || remaining <= 0}
          className="w-full"
        >
          {busy ? "仕立てています… 20秒ほど" : looks.length ? "別のルックをつくる" : "試着をつくる"}
        </Button>

        <p className="text-[11px] text-faint leading-relaxed">
          今月あと {remaining} 回
          {providerConfigured && estimateJpy > 0 ? ` ・ 1枚あたりの原価 約${yen(estimateJpy)}（${modelName}）` : ""}
        </p>

        {error ? (
          <p role="alert" className="text-[13px] text-danger bg-danger/[0.06] border border-danger/25 rounded px-3 py-2.5 leading-relaxed">
            {error}
          </p>
        ) : null}
      </Card>

      {/* 結果 */}
      <div className="space-y-6">
        <Card className="p-6">
          <SectionTitle
            action={looks.length ? <span className="text-[12px] text-muted">{looks.length} ルック</span> : undefined}
          >
            仕上がり
          </SectionTitle>

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {/* Before */}
            <figure>
              <div className="aspect-[3/4] rounded overflow-hidden border border-line bg-sunken">
                {customer?.photoId ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/media/${customer.photoId}`} alt="ご来店時のお写真" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full grid place-items-center text-[12px] text-faint">写真なし</div>
                )}
              </div>
              <figcaption className="mt-2 text-[11px] tracking-widest uppercase text-faint">Before</figcaption>
            </figure>

            {/* After */}
            {looks.map((l) => (
              <figure key={l.tryOnId}>
                <div className="aspect-[3/4] rounded overflow-hidden border border-line bg-sunken">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/media/${l.mediaId}`} alt={`ルック ${l.lookNo} ${l.fabricName}`} className="w-full h-full object-cover" />
                </div>
                <figcaption className="mt-2">
                  <span className="font-display text-[11px] tracking-widest text-brass">
                    LOOK {String(l.lookNo).padStart(2, "0")}
                  </span>
                  <span className="block text-[13px] mt-0.5 truncate">{l.fabricName}</span>
                  {!l.usedFabricReference ? <Badge tone="danger">生地画像なし</Badge> : null}
                  <a
                    href={`/api/media/${l.mediaId}`} download={`look-${String(l.lookNo).padStart(2, "0")}.png`}
                    className="inline-flex items-center min-h-11 sm:min-h-0 mt-1 text-[12px] text-navy hover:underline"
                  >
                    画像を保存
                  </a>
                </figcaption>
              </figure>
            ))}

            {busy ? (
              <figure>
                <div className="aspect-[3/4] rounded border border-dashed border-line grid place-items-center bg-sunken/50">
                  <span className="text-[12px] text-muted">仕立て中…</span>
                </div>
              </figure>
            ) : null}
          </div>

          {looks.length > 0 ? (
            <>
              <p className="mt-5 text-[11px] text-faint leading-relaxed">{DISCLAIMER_JA}</p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button variant="ghost" size="sm" onClick={share} disabled={busy}>お客様へ共有</Button>
                {customer ? (
                  <Link href={`/customers/${customer.id}`} className="text-[13px] text-navy hover:underline">
                    顧客ページで履歴を見る →
                  </Link>
                ) : null}
              </div>
              {shareUrl ? (
                <div className="mt-3 flex flex-wrap gap-2 items-center">
                  <input readOnly value={shareUrl} className="flex-1 min-w-[220px] h-9 px-3 text-[12px] border border-line rounded bg-sunken" />
                  <Button
                    size="sm"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(shareUrl);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      } catch {
                        setError("コピーできませんでした。リンクを長押しして選択してください。");
                      }
                    }}
                  >
                    {copied ? "コピーしました" : "リンクをコピー"}
                  </Button>
                </div>
              ) : null}
            </>
          ) : (
            <p className="mt-5 text-sm text-muted">
              左でお客様と生地を選び、「試着をつくる」を押してください。20秒ほどで仕上がります。
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
