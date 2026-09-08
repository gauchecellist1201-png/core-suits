import { NextResponse } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/db";
import { withSession, bad } from "@/lib/server/api";
import { track } from "@/lib/server/events";
import { newId, nowIso } from "@/lib/util/ids";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  customer_id: z.string().min(1).max(64),
  fabric_id: z.string().max(64).optional(),
  product_name: z.string().trim().min(1).max(80),
  amount_jpy: z.coerce.number().int().min(0).max(10_000_000),
  influenced_by_try_on_id: z.string().max(64).optional(),
  purchased_at: z.string().datetime().optional(),
  /** この購入で閉じる追客 */
  follow_up_id: z.string().max(64).optional(),
});

/** 商談結果を台帳に残す。ここが入って初めて ROAI の分子が動く。 */
export async function POST(req: Request) {
  return withSession(async (s) => {
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return bad("入力を確認してください。");
    const store = getStore();
    const orgId = s.organization.id;

    const customer = await store.get("customers", orgId, parsed.data.customer_id);
    if (!customer) return bad("顧客が見つかりません。", 404);

    // 「試着から生まれた売上」は、その顧客の試着でなければ紐づけない
    if (parsed.data.influenced_by_try_on_id) {
      const t = await store.get("try_ons", orgId, parsed.data.influenced_by_try_on_id);
      if (!t || t.customer_id !== customer.id) return bad("その試着はこの顧客のものではありません。", 400);
    }

    const purchase = {
      id: newId("pur"),
      organization_id: orgId,
      customer_id: customer.id,
      fabric_id: parsed.data.fabric_id,
      product_name: parsed.data.product_name,
      amount_jpy: parsed.data.amount_jpy,
      influenced_by_try_on_id: parsed.data.influenced_by_try_on_id,
      purchased_at: parsed.data.purchased_at ?? nowIso(),
      created_at: nowIso(),
    };
    await store.insert("purchases", purchase);
    await store.update("customers", orgId, customer.id, { last_visit_at: purchase.purchased_at, updated_at: nowIso() });

    if (parsed.data.follow_up_id) {
      const f = await store.get("follow_ups", orgId, parsed.data.follow_up_id);
      if (f && f.customer_id === customer.id) {
        await store.update("follow_ups", orgId, f.id, { status: "won", purchase_id: purchase.id, updated_at: nowIso() });
      }
    }

    await track(orgId, "sale_created", {
      customer_id: customer.id, fabric_id: parsed.data.fabric_id,
      try_on_id: parsed.data.influenced_by_try_on_id, amount_jpy: purchase.amount_jpy,
    });
    return NextResponse.json({ ok: true, purchase });
  });
}
