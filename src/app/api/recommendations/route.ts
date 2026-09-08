import { NextResponse } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/db";
import { withSession, bad } from "@/lib/server/api";
import { recommend } from "@/lib/server/stylist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const Body = z.object({
  customer_id: z.string().min(1).max(64),
  use_case: z.enum(["business", "wedding", "executive_meeting", "sales", "formal", "casual", "party", "ceremony"]).optional(),
  question: z.string().trim().max(200).optional(),
});

export async function POST(req: Request) {
  return withSession(async (s) => {
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return bad("入力を確認してください。");
    const customer = await getStore().get("customers", s.organization.id, parsed.data.customer_id);
    if (!customer) return bad("顧客が見つかりません。", 404);

    const out = await recommend({
      organization: s.organization,
      customer,
      useCase: parsed.data.use_case,
      question: parsed.data.question,
    });
    return NextResponse.json({
      ok: true,
      reasons_by_ai: out.reasonsByAi,
      note: out.note,
      items: out.items.map((i) => ({
        fabric_id: i.fabric.id,
        fabric_name: i.fabric.name,
        color: i.fabric.color,
        pattern: i.fabric.pattern,
        image_id: i.fabric.primary_image_id ?? null,
        score: i.score,
        reason: i.reason,
        factors: i.factors,
      })),
    });
  });
}
