import { NextResponse } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/db";
import { withSession, bad, readImage } from "@/lib/server/api";
import { track } from "@/lib/server/events";
import { newId, nowIso } from "@/lib/util/ids";
import type { Fabric } from "@/lib/domain/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  name: z.string().trim().min(1).max(80),
  brand: z.string().trim().max(60).optional(),
  collection: z.string().trim().max(60).optional(),
  product_code: z.string().trim().max(40).optional(),
  color: z.string().trim().min(1).max(40),
  color_family: z.enum(["navy", "charcoal", "grey", "brown", "black", "blue", "beige", "green", "other"]),
  pattern: z.enum(["solid", "stripe", "pinstripe", "check", "glen_check", "herringbone", "birdseye", "windowpane"]),
  material: z.string().trim().max(60).optional(),
  composition: z.string().trim().max(80).optional(),
  weight_g: z.coerce.number().int().min(100).max(900).optional(),
  season: z.enum(["spring_summer", "autumn_winter", "all_season"]),
  texture: z.string().trim().max(60).optional(),
  gloss: z.enum(["matte", "semi", "high"]).optional(),
  price_tier: z.enum(["entry", "standard", "premium", "luxury"]),
  price_jpy: z.coerce.number().int().min(0).max(3_000_000).optional(),
  stock_m: z.coerce.number().min(0).max(9999).optional(),
  notes: z.string().trim().max(1000).optional(),
});

/** 生地の登録。画像も同じ送信で受ける（店頭で1画面で終わるように）。 */
export async function POST(req: Request) {
  return withSession(async (s) => {
    const form = await req.formData();
    const raw: Record<string, unknown> = {};
    for (const [k, v] of form.entries()) if (typeof v === "string" && v !== "") raw[k] = v;

    const parsed = Body.safeParse(raw);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return bad(`入力を確認してください（${first?.path.join(".") ?? "不明"}）。`);
    }

    const store = getStore();
    const now = nowIso();
    const fabricId = newId("fab");
    let primaryImageId: string | undefined;

    const file = form.get("file");
    if (file instanceof File && file.size > 0) {
      const img = await readImage(file);
      if ("error" in img) return bad(img.error);
      const media = await store.putMedia(
        { id: newId("md"), organization_id: s.organization.id, kind: "fabric_image", mime: img.mime, bytes: img.bytes.byteLength, created_at: now },
        img.bytes,
      );
      await store.insert("fabric_images", {
        id: newId("fim"), organization_id: s.organization.id, fabric_id: fabricId,
        media_id: media.id, capture_ok: form.get("capture_ok") === "on", created_at: now,
      });
      primaryImageId = media.id;
    }

    const fabric: Fabric = {
      id: fabricId,
      organization_id: s.organization.id,
      primary_image_id: primaryImageId,
      archived: false,
      created_at: now,
      updated_at: now,
      ...parsed.data,
    };
    await store.insert("fabrics", fabric);
    await track(s.organization.id, "fabric_created", { fabric_id: fabric.id });
    return NextResponse.json({ ok: true, fabric });
  });
}
