import { NextResponse } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/db";
import { withSession, bad } from "@/lib/server/api";
import { newId, nowIso } from "@/lib/util/ids";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  title: z.string().trim().min(1).max(80),
  body: z.string().trim().min(1).max(2000),
  use_cases: z.array(z.enum(["business", "wedding", "executive_meeting", "sales", "formal", "casual", "party", "ceremony"])).max(8).optional(),
  age_min: z.coerce.number().int().min(10).max(110).optional(),
  age_max: z.coerce.number().int().min(10).max(110).optional(),
  price_tiers: z.array(z.enum(["entry", "standard", "premium", "luxury"])).max(4).optional(),
  color_families: z.array(z.string().max(20)).max(9).optional(),
});

/** 店舗の接客ノウハウ。提案の点数に効く（条件を1つ以上つけたものだけ）。 */
export async function POST(req: Request) {
  return withSession(async (s) => {
    if (s.user.role !== "owner") return bad("この操作はオーナーのみです。", 403);
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return bad("入力を確認してください。");
    const d = parsed.data;
    if (d.age_min !== undefined && d.age_max !== undefined && d.age_min > d.age_max) {
      return bad("年齢の下限が上限を超えています。");
    }
    const row = {
      id: newId("skn"),
      organization_id: s.organization.id,
      title: d.title,
      body: d.body,
      applies_to: {
        use_cases: d.use_cases, age_min: d.age_min, age_max: d.age_max,
        price_tiers: d.price_tiers, color_families: d.color_families,
      },
      created_by: s.user.id,
      created_at: nowIso(),
    };
    await getStore().insert("sales_knowledge", row);
    return NextResponse.json({ ok: true, knowledge: row });
  });
}
