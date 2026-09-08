import { NextResponse } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/db";
import { withSession, bad } from "@/lib/server/api";
import { track } from "@/lib/server/events";
import { newId, nowIso } from "@/lib/util/ids";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Create = z.object({
  customer_id: z.string().min(1).max(64),
  reason: z.string().trim().min(1).max(200),
  suggested_fabric_id: z.string().max(64).optional(),
  due_in_days: z.coerce.number().int().min(0).max(365).default(7),
});

const Update = z.object({
  id: z.string().min(1).max(64),
  status: z.enum(["open", "contacted", "won", "dismissed"]),
});

export async function POST(req: Request) {
  return withSession(async (s) => {
    const parsed = Create.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return bad("入力を確認してください。");
    const store = getStore();
    const customer = await store.get("customers", s.organization.id, parsed.data.customer_id);
    if (!customer) return bad("顧客が見つかりません。", 404);

    // 同じ顧客に開いたままの追客があるなら二重に作らない
    const open = (await store.list("follow_ups", s.organization.id, { customer_id: customer.id }))
      .find((f) => f.status === "open");
    if (open) return NextResponse.json({ ok: true, follow_up: open, existed: true });

    const now = nowIso();
    const follow = {
      id: newId("fup"),
      organization_id: s.organization.id,
      customer_id: customer.id,
      reason: parsed.data.reason,
      suggested_fabric_id: parsed.data.suggested_fabric_id,
      due_at: new Date(Date.now() + parsed.data.due_in_days * 86_400_000).toISOString(),
      status: "open" as const,
      created_at: now,
      updated_at: now,
    };
    await store.insert("follow_ups", follow);
    await track(s.organization.id, "repeat_opportunity_created", { customer_id: customer.id });
    return NextResponse.json({ ok: true, follow_up: follow });
  });
}

export async function PATCH(req: Request) {
  return withSession(async (s) => {
    const parsed = Update.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return bad("入力を確認してください。");
    const updated = await getStore().update("follow_ups", s.organization.id, parsed.data.id, {
      status: parsed.data.status, updated_at: nowIso(),
    });
    if (!updated) return bad("見つかりません。", 404);
    if (parsed.data.status === "contacted") {
      await track(s.organization.id, "customer_contacted", { customer_id: updated.customer_id });
    }
    return NextResponse.json({ ok: true, follow_up: updated });
  });
}
