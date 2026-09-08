import { NextResponse } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/db";
import { withSession, bad } from "@/lib/server/api";
import { track } from "@/lib/server/events";
import { newId, nowIso } from "@/lib/util/ids";
import type { Customer } from "@/lib/domain/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  name: z.string().trim().min(1).max(60),
  name_kana: z.string().trim().max(60).optional(),
  age: z.coerce.number().int().min(10).max(110).optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  height_cm: z.coerce.number().int().min(120).max(230).optional(),
  body_type: z.enum(["slim", "standard", "athletic", "sturdy", "tall_slim"]).optional(),
  skin_tone: z.enum(["fair", "light", "medium", "olive", "dark"]).optional(),
  preferred_style: z.enum(["classic", "modern", "british", "italian", "minimal"]).optional(),
  preferred_colors: z.array(z.string().max(20)).max(8).default([]),
  occupation: z.string().trim().max(60).optional(),
  lifestyle: z.string().trim().max(200).optional(),
  primary_use_case: z.enum(["business", "wedding", "executive_meeting", "sales", "formal", "casual", "party", "ceremony"]).optional(),
  notes: z.string().trim().max(2000).optional(),
  line_display_name: z.string().trim().max(60).optional(),
});

export async function POST(req: Request) {
  return withSession(async (s) => {
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return bad("入力を確認してください。");
    const now = nowIso();
    const customer: Customer = {
      id: newId("cus"),
      organization_id: s.organization.id,
      favorite_fabric_ids: [],
      last_visit_at: now,
      created_at: now,
      updated_at: now,
      ...parsed.data,
    };
    await getStore().insert("customers", customer);
    await track(s.organization.id, "customer_created", { customer_id: customer.id });
    return NextResponse.json({ ok: true, customer });
  });
}
