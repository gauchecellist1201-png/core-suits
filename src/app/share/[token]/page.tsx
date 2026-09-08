import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getStore } from "@/lib/db";
import { DISCLAIMER_JA } from "@/lib/ai/tryOnPrompt";
import { track } from "@/lib/server/events";

export const dynamic = "force-dynamic";

// 共有リンクは本人だけに渡すもの。検索にも SNS カードにも出さない。
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const store = getStore();
  const link = await store.findShareLinkByToken(token);
  if (!link || link.revoked || new Date(link.expires_at).getTime() < Date.now()) notFound();

  const [org, customer] = await Promise.all([
    store.getOrganization(link.organization_id),
    store.get("customers", link.organization_id, link.customer_id),
  ]);
  if (!org) notFound();

  const tryOns = (await Promise.all(link.try_on_ids.map((id) => store.get("try_ons", link.organization_id, id))))
    .filter((t) => t && t.status === "succeeded" && t.result_media_id)
    .sort((a, b) => (a!.look_no - b!.look_no));

  const fabrics = await store.list("fabrics", link.organization_id);
  const fabricById = new Map(fabrics.map((f) => [f.id, f]));

  // 閲覧を数える（表示は止めない）
  await store.update("share_links", link.organization_id, link.id, { view_count: link.view_count + 1 });
  await track(link.organization_id, "share_viewed", { customer_id: link.customer_id });

  return (
    <main className="min-h-screen bg-canvas">
      <header className="border-b border-line">
        <div className="max-w-3xl mx-auto px-6 py-6">
          <p className="font-display text-[13px] tracking-widest">{org.display_name}</p>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="font-display text-[26px] leading-snug tracking-wide">
          {customer ? `${customer.name} さまへのご提案` : "ご提案"}
        </h1>
        <p className="mt-3 text-sm text-muted leading-relaxed">
          本日ご覧いただいた生地で、お仕立てした場合のイメージです。
        </p>

        <div className="mt-10 space-y-12">
          {tryOns.map((t) => {
            const f = fabricById.get(t!.fabric_id);
            return (
              <figure key={t!.id}>
                <div className="rounded overflow-hidden border border-line bg-sunken">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/media/${t!.result_media_id}?share=${encodeURIComponent(token)}`}
                    alt={`ルック ${t!.look_no}`}
                    className="w-full h-auto"
                  />
                </div>
                <figcaption className="mt-4 flex items-start gap-4">
                  {f?.primary_image_id ? (
                    <span className="w-14 h-14 rounded-sm overflow-hidden border border-line shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/media/${f.primary_image_id}?share=${encodeURIComponent(token)}`}
                        alt="" className="w-full h-full object-cover"
                      />
                    </span>
                  ) : null}
                  <span>
                    <span className="block font-display text-[11px] tracking-widest text-brass">
                      LOOK {String(t!.look_no).padStart(2, "0")}
                    </span>
                    <span className="block font-display text-lg mt-0.5">{f?.name ?? "お選びいただいた生地"}</span>
                    <span className="block text-[13px] text-muted">
                      {[f?.brand, f?.color, f?.composition].filter(Boolean).join(" ・ ")}
                    </span>
                  </span>
                </figcaption>
              </figure>
            );
          })}
        </div>

        <p className="mt-14 text-[12px] text-muted leading-relaxed border-t border-line pt-6">
          {DISCLAIMER_JA}
        </p>
        <p className="mt-4 text-[11px] text-faint">
          このページは {new Date(link.expires_at).toLocaleDateString("ja-JP")} まで表示されます。
        </p>
      </div>
    </main>
  );
}
