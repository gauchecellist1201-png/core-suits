import { redirect } from "next/navigation";
import { currentSession } from "@/lib/auth/session";
import { getStore, hasSupabase } from "@/lib/db";
import { currentUsage } from "@/lib/server/usage";
import { PLANS } from "@/lib/domain/plans";
import { imageProviderConfigured, textProviderConfigured, getImageProvider } from "@/lib/ai/providers";
import { RATES_CHECKED_ON, usdJpy } from "@/lib/ai/pricing";
import { KnowledgeEditor } from "@/components/KnowledgeEditor";
import { Badge, Card, PageTitle, SectionTitle, ComingSoon, yen } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const s = await currentSession();
  if (!s) redirect("/login");
  const [usage, knowledge] = await Promise.all([
    currentUsage(s.organization),
    getStore().list("sales_knowledge", s.organization.id),
  ]);
  const plan = PLANS[s.organization.plan];
  const image = imageProviderConfigured();
  const text = textProviderConfigured();
  const model = image ? getImageProvider().model : "—";

  return (
    <>
      <PageTitle title="設定" lead={s.organization.display_name} />

      <div className="grid gap-6 lg:grid-cols-2 items-start">
        <Card className="p-6">
          <SectionTitle action={<Badge tone="navy">{plan.name}</Badge>}>ご契約</SectionTitle>
          <p className="font-display text-2xl">{yen(plan.priceJpy)}<span className="text-sm text-muted font-sans"> / 月</span></p>
          <ul className="mt-4 text-[13px] text-muted space-y-1.5">
            {plan.features.map((f) => <li key={f}>・{f}</li>)}
          </ul>
          <dl className="mt-6 pt-5 border-t border-line text-sm space-y-2.5">
            <Line k="今月の試着生成" v={`${usage.used} / ${usage.limit} 回`} />
            <Line k="今月の AI 原価" v={`${yen(usage.costJpy)} / 上限 ${yen(usage.costLimitJpy)}`} />
          </dl>
          <p className="mt-4 text-[11px] text-faint leading-relaxed">
            上限に達すると生成を止めます。無制限にはしません（原価が読めなくなるため）。
          </p>
          <div className="mt-5 flex items-center gap-2">
            <span className="text-[12px] text-muted">お支払い方法の変更</span>
            <ComingSoon>Coming soon</ComingSoon>
          </div>
        </Card>

        <Card className="p-6">
          <SectionTitle>AI 接続</SectionTitle>
          <dl className="text-sm space-y-2.5">
            <Line k="画像生成" v={image ? `接続済み（${model}）` : "未設定"} bad={!image} />
            <Line k="提案の理由づけ" v={text ? "接続済み" : "未設定（相性ルールの要約を表示します）"} bad={!text} />
            <Line k="データ保管" v={hasSupabase() ? "Supabase" : "この端末（開発用）"} bad={!hasSupabase()} />
            <Line k="為替（原価換算）" v={`1 USD = ${usdJpy()} 円`} />
          </dl>
          <p className="mt-4 text-[11px] text-faint leading-relaxed">
            原価は各社の公開料金（{RATES_CHECKED_ON} 時点）と実測トークンから計算しています。
            画像生成の会社は設定で差し替えられます（1社に固定していません）。
          </p>
        </Card>
      </div>

      <div className="mt-10">
        <SectionTitle>この店の接客ノウハウ</SectionTitle>
        <p className="text-sm text-muted mb-5 max-w-2xl leading-relaxed">
          「40代の経営者にはこの価格帯が通りやすい」といった、この店だけが持っている勘所を書いておくと、
          提案の順番に反映されます。条件を1つ以上つけたものだけが効きます。
        </p>
        <KnowledgeEditor
          canEdit={s.user.role === "owner"}
          items={knowledge.map((k) => ({ id: k.id, title: k.title, body: k.body, applies: describeApplies(k.applies_to) }))}
        />
      </div>

      <div className="mt-12">
        <SectionTitle>今後</SectionTitle>
        <ul className="text-sm text-muted space-y-2">
          <li className="flex items-center gap-2"><ComingSoon>Coming soon</ComingSoon> LINE 公式アカウント連携（自動でお客様へ提案を送る）</li>
          <li className="flex items-center gap-2"><ComingSoon>Coming soon</ComingSoon> 生地写真の色補正（照明差を揃える）</li>
          <li className="flex items-center gap-2"><ComingSoon>Coming soon</ComingSoon> 複数店舗・スタッフ権限</li>
        </ul>
      </div>

      <div className="mt-12 pt-8 border-t border-line">
        <SectionTitle>顧客写真の取り扱い</SectionTitle>
        <ul className="text-[13px] text-muted space-y-1.5 max-w-2xl leading-relaxed">
          <li>・写真は店舗ごとに分けて保管し、他店から見えることはありません。</li>
          <li>・公開の置き場には保存せず、ログイン済みの画面と、期限つきの共有リンクからのみ表示されます。</li>
          <li>・共有リンクは14日で失効します。</li>
          <li>・試着の生成では、写真と生地画像を生成事業者へ送ります。お客様への説明時にお伝えください。</li>
        </ul>
      </div>
    </>
  );
}

function Line({ k, v, bad }: { k: string; v: string; bad?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted shrink-0">{k}</dt>
      <dd className={`text-right ${bad ? "text-danger" : ""}`}>{v}</dd>
    </div>
  );
}

function describeApplies(a: Record<string, unknown>): string {
  const bits: string[] = [];
  const uc = a.use_cases as string[] | undefined;
  if (uc?.length) bits.push(`用途: ${uc.join("・")}`);
  if (a.age_min !== undefined || a.age_max !== undefined) bits.push(`年齢: ${a.age_min ?? ""}〜${a.age_max ?? ""}`);
  const pt = a.price_tiers as string[] | undefined;
  if (pt?.length) bits.push(`価格帯: ${pt.join("・")}`);
  const cf = a.color_families as string[] | undefined;
  if (cf?.length) bits.push(`色: ${cf.join("・")}`);
  return bits.join(" / ") || "条件なし（提案には効きません）";
}
