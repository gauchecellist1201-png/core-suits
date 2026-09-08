import { NextResponse } from "next/server";
import { getStore } from "@/lib/db";
import { withSession, bad, readImage } from "@/lib/server/api";
import { newId, nowIso } from "@/lib/util/ids";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 顧客写真の登録。保存先は非公開。配るのは /api/media/[id] のみ。 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return withSession(async (s) => {
    const { id } = await ctx.params;
    const store = getStore();
    const customer = await store.get("customers", s.organization.id, id);
    if (!customer) return bad("顧客が見つかりません。", 404);

    const form = await req.formData();
    const img = await readImage(form.get("file"));
    if ("error" in img) return bad(img.error);

    const now = nowIso();
    const media = await store.putMedia(
      {
        id: newId("md"), organization_id: s.organization.id, kind: "customer_photo",
        mime: img.mime, bytes: img.bytes.byteLength, created_at: now,
      },
      img.bytes,
    );
    await store.insert("customer_photos", {
      id: newId("cph"), organization_id: s.organization.id, customer_id: id,
      media_id: media.id,
      captured_note: String(form.get("captured_note") ?? "").slice(0, 200) || undefined,
      created_at: now,
    });
    // 主写真が未設定なら、この1枚を主写真にする
    if (!customer.primary_photo_id) {
      await store.update("customers", s.organization.id, id, { primary_photo_id: media.id, updated_at: now });
    }
    return NextResponse.json({ ok: true, media_id: media.id });
  });
}
