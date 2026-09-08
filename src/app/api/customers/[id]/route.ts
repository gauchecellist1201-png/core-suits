import { NextResponse } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/db";
import { withSession, bad } from "@/lib/server/api";
import { nowIso } from "@/lib/util/ids";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Patch = z.object({
  notes: z.string().trim().max(2000).optional(),
  next_follow_up_at: z.string().datetime().optional(),
  last_visit_at: z.string().datetime().optional(),
  primary_photo_id: z.string().max(64).optional(),
  favorite_fabric_ids: z.array(z.string().max(64)).max(50).optional(),
  preferred_colors: z.array(z.string().max(20)).max(8).optional(),
  primary_use_case: z.enum(["business", "wedding", "executive_meeting", "sales", "formal", "casual", "party", "ceremony"]).optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return withSession(async (s) => {
    const { id } = await ctx.params;
    const parsed = Patch.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return bad("入力を確認してください。");
    const store = getStore();

    // 主写真の差し替えは、その店舗のその顧客の写真であることを必ず確かめる
    if (parsed.data.primary_photo_id) {
      const photos = await store.list("customer_photos", s.organization.id, { customer_id: id });
      if (!photos.some((p) => p.media_id === parsed.data.primary_photo_id)) {
        return bad("その写真はこの顧客のものではありません。", 403);
      }
    }

    const updated = await store.update("customers", s.organization.id, id, {
      ...parsed.data,
      updated_at: nowIso(),
    });
    if (!updated) return bad("顧客が見つかりません。", 404);
    return NextResponse.json({ ok: true, customer: updated });
  });
}
