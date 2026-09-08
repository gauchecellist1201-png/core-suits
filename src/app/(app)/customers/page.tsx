import Link from "next/link";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/auth/session";
import { getStore } from "@/lib/db";
import { CustomerSearch } from "@/components/CustomerSearch";
import { LinkButton, PageTitle, Empty } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const s = await currentSession();
  if (!s) redirect("/login");
  const store = getStore();
  const [customers, purchases] = await Promise.all([
    store.list("customers", s.organization.id),
    store.list("purchases", s.organization.id),
  ]);

  const lastPurchase = new Map<string, string>();
  for (const p of purchases) {
    const cur = lastPurchase.get(p.customer_id);
    if (!cur || p.purchased_at > cur) lastPurchase.set(p.customer_id, p.purchased_at);
  }

  const rows = customers
    .map((c) => ({
      id: c.id,
      name: c.name,
      photoId: c.primary_photo_id ?? null,
      occupation: c.occupation ?? "",
      age: c.age ?? null,
      colors: c.preferred_colors.join("・"),
      lastPurchaseAt: lastPurchase.get(c.id) ?? null,
      lastVisitAt: c.last_visit_at ?? null,
    }))
    .sort((a, b) => (b.lastVisitAt ?? "").localeCompare(a.lastVisitAt ?? ""));

  return (
    <>
      <PageTitle
        title="顧客"
        lead="接客の記録が残るほど、次の提案が具体的になります。"
        action={<LinkButton href="/customers/new">顧客を登録</LinkButton>}
      />
      {rows.length === 0 ? (
        <Empty
          title="まだ顧客がいません"
          body="お名前だけでも登録すれば始められます。写真は後からでも追加できます。"
          action={<LinkButton href="/customers/new" variant="ghost">最初の顧客を登録</LinkButton>}
        />
      ) : (
        <CustomerSearch rows={rows} />
      )}
      <p className="mt-10 text-[11px] text-faint">
        <Link href="/settings" className="hover:underline">顧客写真の取り扱いについて</Link>
      </p>
    </>
  );
}
