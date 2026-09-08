import { redirect } from "next/navigation";
import { currentSession } from "@/lib/auth/session";
import { getStore } from "@/lib/db";
import { FabricBrowser } from "@/components/FabricBrowser";
import { LinkButton, PageTitle, Empty } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export default async function FabricsPage() {
  const s = await currentSession();
  if (!s) redirect("/login");
  const fabrics = await getStore().list("fabrics", s.organization.id);
  const live = fabrics.filter((f) => !f.archived);

  return (
    <>
      <PageTitle
        title="生地"
        lead={`この店にある ${live.length} 点。試着イメージは、ここに登録された実物の写真を参照して作られます。`}
        action={<LinkButton href="/fabrics/new">生地を登録</LinkButton>}
      />
      {live.length === 0 ? (
        <Empty
          title="生地がまだありません"
          body="生地帳の1点を、同じ照明・同じ距離で撮って登録してください。1点あれば試着をつくれます。"
          action={<LinkButton href="/fabrics/new" variant="ghost">最初の生地を登録</LinkButton>}
        />
      ) : (
        <FabricBrowser
          rows={live.map((f) => ({
            id: f.id, name: f.name, brand: f.brand ?? "", color: f.color,
            colorFamily: f.color_family, pattern: f.pattern, season: f.season,
            priceTier: f.price_tier, imageId: f.primary_image_id ?? null,
            stock: f.stock_m ?? null, code: f.product_code ?? "",
          }))}
        />
      )}
    </>
  );
}
