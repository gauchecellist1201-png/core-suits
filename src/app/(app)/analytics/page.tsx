import { redirect } from "next/navigation";
import { currentSession } from "@/lib/auth/session";
import { getStore } from "@/lib/db";
import { computeKpis } from "@/lib/domain/analytics";
import { currentUsage } from "@/lib/server/usage";
import { RATES_CHECKED_ON } from "@/lib/ai/pricing";
import { Card, PageTitle, SectionTitle, Stat, yen, ComingSoon } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const s = await currentSession();
  if (!s) redirect("/login");
  const store = getStore();
  const [customers, tryOns, purchases, followUps, events, aiJobs, usage] = await Promise.all([
    store.list("customers", s.organization.id),
    store.list("try_ons", s.organization.id),
    store.list("purchases", s.organization.id),
    store.list("follow_ups", s.organization.id),
    store.list("analytics_events", s.organization.id),
    store.list("ai_jobs", s.organization.id),
    currentUsage(s.organization),
  ]);

  const k = computeKpis({ customerCount: customers.length, tryOns, purchases, followUps, events, aiJobs });
  const byModel = new Map<string, { count: number; cost: number; ms: number; ok: number }>();
  for (const j of aiJobs) {
    const cur = byModel.get(j.model) ?? { count: 0, cost: 0, ms: 0, ok: 0 };
    cur.count += 1;
    cur.cost += j.actual_cost_jpy;
    cur.ms += j.latency_ms;
    cur.ok += j.ok ? 1 : 0;
    byModel.set(j.model, cur);
  }

  return (
    <>
      <PageTitle
        title="分析"
        lead="AI を何回使ったかではなく、AI がいくらの売上に効いたかを見ます。"
      />

      <Card className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-line">
        <Stat label="AI が効いた売上" value={yen(k.aiAssistedRevenueJpy)} tone="accent" sub="試着に紐づいたご成約のみ" />
        <Stat label="AI 原価" value={yen(k.aiCostJpy)} sub={`今月 ${yen(usage.costJpy)} / 上限 ${yen(usage.costLimitJpy)}`} />
        <Stat label="ROAI" value={k.roai === null ? "—" : `${k.roai} 倍`} sub="効いた売上 ÷ AI 原価" />
        <Stat label="平均単価" value={k.averageOrderValueJpy === null ? "—" : yen(k.averageOrderValueJpy)} sub={`${k.sales} 件のご成約`} />
      </Card>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <SectionTitle>ファネル</SectionTitle>
          <ul className="text-sm divide-y divide-line">
            <Row k="顧客登録" v={`${k.customers} 名`} />
            <Row k="試着生成" v={`${k.tryOnsGenerated} 枚`} />
            <Row k="提案" v={`${k.recommendations} 件`} />
            <Row k="共有" v={`${k.sharedLooks} 回`} />
            <Row k="共有ページの閲覧" v={`${k.shareViews} 回`} />
            <Row k="ご成約" v={`${k.sales} 件`} />
            <Row
              k="試着からの成約率"
              v={k.tryOnConversionRate === null ? "母数が5名未満のため未表示" : `${k.tryOnConversionRate}%`}
            />
          </ul>
        </Card>

        <Card className="p-6">
          <SectionTitle>再来店</SectionTitle>
          <ul className="text-sm divide-y divide-line">
            <Row k="見つかった機会" v={`${k.repeatOpportunities} 件`} />
            <Row k="ご成約につながった機会" v={`${k.repeatWon} 件`} />
          </ul>
          <div className="mt-6 pt-5 border-t border-line">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] tracking-widest uppercase text-muted">顧客あたり売上・LTV</span>
              <ComingSoon>Coming soon</ComingSoon>
            </div>
            <p className="text-[12px] text-muted leading-relaxed">
              1年以上の履歴がたまってから出します。いまの母数で出すと数字が動きすぎて判断に使えません。
            </p>
          </div>
        </Card>
      </div>

      <div className="mt-10">
        <SectionTitle>AI の内訳</SectionTitle>
        {byModel.size === 0 ? (
          <p className="text-sm text-muted">まだ AI を使っていません。</p>
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-left text-[11px] tracking-wider uppercase text-muted border-b border-line">
                  <th className="px-5 py-3 font-normal">モデル</th>
                  <th className="px-5 py-3 font-normal">呼び出し</th>
                  <th className="px-5 py-3 font-normal">成功</th>
                  <th className="px-5 py-3 font-normal">平均時間</th>
                  <th className="px-5 py-3 font-normal">原価</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {Array.from(byModel.entries()).map(([model, v]) => (
                  <tr key={model}>
                    <td className="px-5 py-3 font-mono text-[12px]">{model}</td>
                    <td className="px-5 py-3">{v.count}</td>
                    <td className="px-5 py-3">{v.ok} / {v.count}</td>
                    <td className="px-5 py-3">{(v.ms / v.count / 1000).toFixed(1)} 秒</td>
                    <td className="px-5 py-3 font-display">{yen(v.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
        <p className="mt-3 text-[11px] text-faint leading-relaxed">
          原価は各社の公開料金（{RATES_CHECKED_ON} 時点で確認）と実測トークン数から計算した推定です。請求額そのものではありません。
        </p>
      </div>
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <li className="flex items-baseline justify-between py-2.5">
      <span className="text-muted">{k}</span>
      <span className="font-display text-[15px]">{v}</span>
    </li>
  );
}
