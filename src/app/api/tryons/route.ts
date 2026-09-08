import { NextResponse } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/db";
import { withSession, bad } from "@/lib/server/api";
import { generateTryOn } from "@/lib/server/tryon";
import type { GarmentSpec } from "@/lib/domain/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const Garment = z.object({
  style: z.enum(["classic", "modern", "british", "italian", "minimal"]).default("classic"),
  lapel: z.enum(["notch", "peak"]).default("notch"),
  buttons: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(2),
  piece: z.enum(["two_piece", "three_piece"]).default("two_piece"),
  shirt: z.enum(["white", "light_blue"]).default("white"),
  tie: z.enum(["none", "navy", "burgundy"]).default("none"),
  scene: z.enum(["business", "wedding", "executive_meeting", "sales", "formal", "casual", "party", "ceremony"]).default("business"),
});

const Body = z.object({
  customer_id: z.string().min(1).max(64),
  fabric_id: z.string().min(1).max(64),
  source_media_id: z.string().max(64).optional(),
  garment: Garment.optional(),
});

export async function POST(req: Request) {
  return withSession(async (s) => {
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return bad("入力を確認してください。");
    const store = getStore();
    const [customer, fabric] = await Promise.all([
      store.get("customers", s.organization.id, parsed.data.customer_id),
      store.get("fabrics", s.organization.id, parsed.data.fabric_id),
    ]);
    if (!customer) return bad("顧客が見つかりません。", 404);
    if (!fabric) return bad("生地が見つかりません。", 404);

    // 指定された写真がこの顧客のものか確かめる（他の顧客の写真を使わせない）
    if (parsed.data.source_media_id) {
      const photos = await store.list("customer_photos", s.organization.id, { customer_id: customer.id });
      if (!photos.some((p) => p.media_id === parsed.data.source_media_id)) {
        return bad("その写真はこの顧客のものではありません。", 403);
      }
    }

    const garment: GarmentSpec = Garment.parse(parsed.data.garment ?? {});
    const out = await generateTryOn({
      organization: s.organization, user: s.user, customer, fabric, garment,
      sourceMediaId: parsed.data.source_media_id,
    });

    if (!out.ok) {
      return NextResponse.json({ ok: false, message: out.message, try_on: out.tryOn ?? null }, { status: 422 });
    }
    return NextResponse.json({ ok: true, try_on: out.tryOn });
  });
}
