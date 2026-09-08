import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentSession } from "@/lib/auth/session";
import { customerPage } from "@/lib/server/queries";
import { monthsBetween } from "@/lib/domain/followups";
import { useCaseLabel, styleLabel } from "@/lib/domain/stylist";
import { buildInsights } from "@/lib/domain/insights";
import { StylistPanel } from "@/components/StylistPanel";
import { LookHistory } from "@/components/LookHistory";
import { RecordPurchase } from "@/components/RecordPurchase";
import { PhotoUploader } from "@/components/PhotoUploader";
import { Card, PageTitle, SectionTitle, Badge, LinkButton, yen } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export default async function CustomerProfile({ params }: { params: Promise<{ id: string }> }) {
  const s = await currentSession();
  if (!s) redirect("/login");
  const { id } = await params;
  const data = await customerPage(s.organization.id, id);
  if (!data) notFound();

  const { customer, photos, tryOns, purchases, fabrics, followUps } = data;
  const fabricById = new Map(fabrics.map((f) => [f.id, f]));
  const lastPurchase = purchases[0];
  const months = lastPurchase ? monthsBetween(new Date(lastPurchase.purchased_at), new Date()) : null;
  const openFollowUp = followUps.find((f) => f.status === "open");
  const succeeded = tryOns.filter((t) => t.status === "succeeded");

  const insights = buildInsights({
    age: customer.age,
    occupation: customer.occupation,
    style: customer.preferred_style,
    purchases: purchases.map((p) => ({
      name: p.product_name, amount: p.amount_jpy,
      colorFamily: p.fabric_id ? fabricById.get(p.fabric_id)?.color_family : undefined,
    })),
    months,
  });

  return (
    <>
      <PageTitle
        title={customer.name}
        lead={[customer.occupation, customer.age ? `${customer.age}歳` : null, customer.height_cm ? `${customer.height_cm}cm` : null]
          .filter(Boolean).join(" ・ ") || "詳細は未登録です"}
        action={<LinkButton href={`/studio?customer=${customer.id}`}>試着をつくる</LinkButton>}
      />

      <div className="grid gap-6 lg:grid-cols-[300px_1fr] items-start">
        {/* 左: お客様そのもの */}
        <div className="space-y-6">
          <Card className="overflow-hidden">
            {/* 画面が狭いときは写真で1画面を埋めない（提案と履歴に早く届くように） */}
            <div className="aspect-[3/4] max-h-[44vh] lg:max-h-none bg-sunken">
              {customer.primary_photo_id ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/media/${customer.primary_photo_id}`} alt={`${customer.name} さまのお写真`} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full grid place-items-center text-[12px] text-faint px-6 text-center">
                  お写真がまだありません
                </div>
              )}
            </div>
            <div className="p-4">
              <PhotoUploader customerId={customer.id} photos={photos.map((p) => p.media_id)} currentId={customer.primary_photo_id ?? null} />
            </div>
          </Card>

          <Card className="p-5">
            <SectionTitle>お好み</SectionTitle>
            <dl className="text-[13px] space-y-2.5">
              <Line k="スタイル" v={customer.preferred_style ? styleLabel(customer.preferred_style) : "未登録"} />
              <Line k="色" v={customer.preferred_colors.join("・") || "未登録"} />
              <Line k="主な用途" v={customer.primary_use_case ? useCaseLabel(customer.primary_use_case) : "未登録"} />
              <Line k="体型" v={customer.body_type ?? "未登録"} />
              <Line k="肌の色" v={customer.skin_tone ?? "未登録"} />
            </dl>
            {customer.notes ? (
              <p className="mt-4 pt-4 border-t border-line text-[13px] text-muted leading-relaxed whitespace-pre-wrap">
                {customer.notes}
              </p>
            ) : null}
          </Card>
        </div>

        {/* 右: 提案と履歴 */}
        <div className="space-y-6">
          {/* 次の機会 */}
          <Card className="p-6 border-brass/40 bg-brass/[0.04]">
            <SectionTitle>次のご提案の機会</SectionTitle>
            {months === null ? (
              <p className="text-sm text-muted">ご購入の記録がまだありません。ご成約を残すと、次の機会をお知らせします。</p>
            ) : months >= 6 ? (
              <div className="flex flex-wrap items-center gap-4">
                <p className="text-sm flex-1 min-w-[240px]">
                  前回のご購入（{lastPurchase?.product_name}）から <strong className="font-display text-brass">{months} ヶ月</strong>。
                  そろそろ次の1着をご提案できる時期です。
                </p>
                {openFollowUp ? <Badge tone="navy">追客中</Badge> : null}
              </div>
            ) : (
              <p className="text-sm text-muted">
                前回のご購入から {months} ヶ月。次のご提案は 6 ヶ月を目安にお知らせします。
              </p>
            )}
          </Card>

          {/* AI インサイト（事実の要約。作り話をしない） */}
          <Card className="p-6">
            <SectionTitle>この方について分かっていること</SectionTitle>
            {insights.length === 0 ? (
              <p className="text-sm text-muted">まだ十分な記録がありません。ご購入やお好みを残すほど具体的になります。</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {insights.map((t) => (
                  <li key={t} className="flex gap-2.5">
                    <span className="text-brass shrink-0">—</span>
                    <span className="text-ink/85 leading-relaxed">{t}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 text-[11px] text-faint">台帳に入っている記録だけをまとめています。推測は含みません。</p>
          </Card>

          {/* おすすめの生地 */}
          <StylistPanel
            customerId={customer.id}
            defaultUseCase={customer.primary_use_case ?? "business"}
            hasPhoto={Boolean(customer.primary_photo_id)}
          />

          {/* 試着の履歴 */}
          <LookHistory
            customerId={customer.id}
            looks={succeeded.map((t) => ({
              id: t.id,
              lookNo: t.look_no,
              resultMediaId: t.result_media_id ?? null,
              fabricName: fabricById.get(t.fabric_id)?.name ?? "生地不明",
              fabricColor: fabricById.get(t.fabric_id)?.color ?? "",
              createdAt: t.created_at,
              usedFabricReference: Boolean(t.fabric_media_id),
            }))}
            failedCount={tryOns.filter((t) => t.status === "failed").length}
          />

          {/* 購入履歴 */}
          <Card className="p-6">
            <SectionTitle>ご購入の履歴</SectionTitle>
            {purchases.length === 0 ? (
              <p className="text-sm text-muted mb-5">まだありません。</p>
            ) : (
              <ul className="text-sm divide-y divide-line mb-5">
                {purchases.map((p) => (
                  <li key={p.id} className="py-3 flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <span className="font-display text-[15px]">{p.product_name}</span>
                      {p.influenced_by_try_on_id ? <span className="ml-2"><Badge tone="brass">試着から</Badge></span> : null}
                      <div className="text-[12px] text-muted mt-0.5">
                        {p.purchased_at.slice(0, 10)}
                        {p.fabric_id ? ` ・ ${fabricById.get(p.fabric_id)?.name ?? ""}` : ""}
                      </div>
                    </div>
                    <span className="font-display">{yen(p.amount_jpy)}</span>
                  </li>
                ))}
              </ul>
            )}
            <RecordPurchase
              customerId={customer.id}
              fabrics={fabrics.filter((f) => !f.archived).map((f) => ({ id: f.id, name: f.name, price: f.price_jpy ?? null }))}
              looks={succeeded.map((t) => ({ id: t.id, lookNo: t.look_no, fabricName: fabricById.get(t.fabric_id)?.name ?? "" }))}
              followUpId={openFollowUp?.id ?? null}
            />
          </Card>
        </div>
      </div>

      <p className="mt-10 text-[12px]">
        <Link href="/customers" className="text-navy hover:underline">← 顧客一覧へ</Link>
      </p>
    </>
  );
}

function Line({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted shrink-0">{k}</dt>
      <dd className="text-right">{v}</dd>
    </div>
  );
}
