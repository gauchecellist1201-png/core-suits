import { redirect } from "next/navigation";
import { currentSession } from "@/lib/auth/session";
import { getStore } from "@/lib/db";
import { currentUsage } from "@/lib/server/usage";
import { imageProviderConfigured, getImageProvider } from "@/lib/ai/providers";
import { Studio } from "@/components/Studio";
import { PageTitle } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export default async function StudioPage({
  searchParams,
}: { searchParams: Promise<{ customer?: string; fabric?: string }> }) {
  const s = await currentSession();
  if (!s) redirect("/login");
  const sp = await searchParams;
  const store = getStore();

  const [customers, fabrics, usage] = await Promise.all([
    store.list("customers", s.organization.id),
    store.list("fabrics", s.organization.id),
    currentUsage(s.organization),
  ]);

  const configured = imageProviderConfigured();
  let estimate = 0;
  let modelName = "";
  if (configured) {
    const p = getImageProvider();
    estimate = p.estimateJpy();
    modelName = p.model;
  }

  const live = fabrics.filter((f) => !f.archived);

  return (
    <>
      <PageTitle
        title="スタジオ"
        lead="お客様と生地を選んで、出来上がりを先にお見せする。"
      />
      <Studio
        customers={customers
          .map((c) => ({ id: c.id, name: c.name, photoId: c.primary_photo_id ?? null }))
          .sort((a, b) => a.name.localeCompare(b.name, "ja"))}
        fabrics={live.map((f) => ({
          id: f.id, name: f.name, color: f.color, pattern: f.pattern,
          imageId: f.primary_image_id ?? null, brand: f.brand ?? "",
        }))}
        initialCustomerId={sp.customer ?? null}
        initialFabricId={sp.fabric ?? null}
        usage={{ used: usage.used, limit: usage.limit }}
        providerConfigured={configured}
        estimateJpy={estimate}
        modelName={modelName}
      />
    </>
  );
}
