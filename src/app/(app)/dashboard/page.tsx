import Link from "next/link";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/auth/session";
import { dashboardData } from "@/lib/server/queries";
import { Card, LinkButton, PageTitle, SectionTitle, Stat, Badge, Empty, yen } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const s = await currentSession();
  if (!s) redirect("/login");
  const { kpis, opportunities, fabricCount } = await dashboardData(s.organization);
  const open = opportunities.slice(0, 6);

  return (
    <>
      <PageTitle
        title="ダッシュボード"
        lead={`${s.organization.display_name}。今日の接客と、いま声をかけるべきお客様。`}
        action={<LinkButton href="/studio">試着をつくる</LinkButton>}
      />

      <Card className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-line">
        <Stat label="顧客" value={kpis.customers} sub={`生地 ${fabricCount} 点`} />
        <Stat label="試着生成" value={kpis.tryOnsGenerated} sub={kpis.tryOnsFailed ? `失敗 ${kpis.tryOnsFailed} 回` : "失敗なし"} />
        <Stat label="共有したルック" value={kpis.sharedLooks} sub={`閲覧 ${kpis.shareViews} 回`} />
        <Stat
          label="試着が効いた売上"
          value={yen(kpis.aiAssistedRevenueJpy)}
          tone="accent"
          sub={kpis.roai !== null ? `AI原価 ${yen(kpis.aiCostJpy)} に対して ${kpis.roai} 倍` : "AI原価はまだ発生していません"}
        />
      </Card>

      <div className="mt-12">
        <SectionTitle action={<Link href="/customers" className="text-[12px] text-navy hover:underline">顧客をすべて見る</Link>}>
          再来店の機会
        </SectionTitle>

        {open.length === 0 ? (
          <Empty
            title="いま追いかけるお客様はいません"
            body="前回のご購入から6ヶ月が過ぎたお客様が、ここに並びます。ご購入を台帳に残しておくと自動で見つかります。"
            action={<LinkButton href="/customers" variant="ghost">顧客を見る</LinkButton>}
          />
        ) : (
          <>
            <p className="text-sm text-muted mb-4">
              {opportunities.length} 名のお客様が、そろそろ次の1着を考える時期です。
            </p>
            <ul className="space-y-3">
              {open.map((o) => (
                <li key={o.customer.id}>
                  <Card className="p-5 flex flex-wrap items-center gap-x-6 gap-y-3 t-lift hover:shadow-card">
                    <div className="min-w-[160px]">
                      <div className="font-display text-lg">{o.customer.name}</div>
                      <div className="text-[12px] text-muted mt-0.5">
                        {o.customer.occupation ?? "ご職業未登録"}
                        {o.customer.age ? ` ・ ${o.customer.age}歳` : ""}
                      </div>
                    </div>
                    <div className="flex-1 min-w-[220px] text-[13px] text-muted">{o.reason}</div>
                    {o.existingFollowUpId ? <Badge tone="navy">追客中</Badge> : null}
                    <LinkButton href={`/customers/${o.customer.id}`} variant="ghost" size="sm">
                      提案をつくる
                    </LinkButton>
                  </Card>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <SectionTitle>これまでの実績</SectionTitle>
          <dl className="text-sm divide-y divide-line">
            <Row k="ご成約" v={`${kpis.sales} 件`} />
            <Row k="売上（台帳に入った実額）" v={yen(kpis.salesAmountJpy)} />
            <Row k="平均単価" v={kpis.averageOrderValueJpy === null ? "—" : yen(kpis.averageOrderValueJpy)} />
            <Row
              k="試着からの成約率"
              v={kpis.tryOnConversionRate === null ? "母数が少ないため未表示" : `${kpis.tryOnConversionRate}%`}
            />
          </dl>
        </Card>
        <Card className="p-6">
          <SectionTitle>AI の利用</SectionTitle>
          <dl className="text-sm divide-y divide-line">
            <Row k="生成した試着" v={`${kpis.tryOnsGenerated} 枚`} />
            <Row k="出した提案" v={`${kpis.recommendations} 件`} />
            <Row k="AI 原価（実測）" v={yen(kpis.aiCostJpy)} />
            <Row k="ROAI" v={kpis.roai === null ? "—" : `${kpis.roai} 倍`} />
          </dl>
          <p className="mt-4 text-[11px] text-faint leading-relaxed">
            ROAI は「試着に紐づいた売上 ÷ AI 原価」。見込みは含めず、台帳に入った実額だけで計算しています。
          </p>
        </Card>
      </div>
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between py-2.5">
      <dt className="text-muted">{k}</dt>
      <dd className="font-display text-[15px]">{v}</dd>
    </div>
  );
}
