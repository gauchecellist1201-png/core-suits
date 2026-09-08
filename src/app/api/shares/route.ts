import { NextResponse } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/db";
import { withSession, bad } from "@/lib/server/api";
import { track } from "@/lib/server/events";
import { newId, newShareToken, nowIso } from "@/lib/util/ids";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  customer_id: z.string().min(1).max(64),
  try_on_ids: z.array(z.string().min(1).max(64)).min(1).max(6),
  /** 期限（日）。既定14日。無期限は作らせない */
  days: z.coerce.number().int().min(1).max(60).default(14),
});

/** 顧客へ見せるためのリンクを作る。期限つき・取り消し可能。 */
export async function POST(req: Request) {
  return withSession(async (s) => {
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return bad("入力を確認してください。");
    const store = getStore();

    const tryOns = await Promise.all(
      parsed.data.try_on_ids.map((id) => store.get("try_ons", s.organization.id, id)),
    );
    const valid = tryOns.filter((t) => t && t.status === "succeeded" && t.customer_id === parsed.data.customer_id);
    if (valid.length !== parsed.data.try_on_ids.length) {
      return bad("共有できるのは、この顧客の生成済みのルックだけです。", 400);
    }

    const now = new Date();
    const link = {
      id: newId("shr"),
      organization_id: s.organization.id,
      customer_id: parsed.data.customer_id,
      token: newShareToken(),
      try_on_ids: parsed.data.try_on_ids,
      expires_at: new Date(now.getTime() + parsed.data.days * 86_400_000).toISOString(),
      revoked: false,
      view_count: 0,
      created_by: s.user.id,
      created_at: nowIso(),
    };
    await store.insert("share_links", link);
    await track(s.organization.id, "look_shared", { customer_id: parsed.data.customer_id });
    return NextResponse.json({ ok: true, token: link.token, expires_at: link.expires_at });
  });
}
