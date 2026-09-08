import { NextResponse } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/db";
import { withSession, bad } from "@/lib/server/api";
import { nowIso } from "@/lib/util/ids";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Patch = z.object({
  stock_m: z.coerce.number().min(0).max(9999).optional(),
  price_jpy: z.coerce.number().int().min(0).max(3_000_000).optional(),
  notes: z.string().trim().max(1000).optional(),
  archived: z.boolean().optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return withSession(async (s) => {
    const { id } = await ctx.params;
    const parsed = Patch.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return bad("入力を確認してください。");
    const updated = await getStore().update("fabrics", s.organization.id, id, { ...parsed.data, updated_at: nowIso() });
    if (!updated) return bad("生地が見つかりません。", 404);
    return NextResponse.json({ ok: true, fabric: updated });
  });
}
