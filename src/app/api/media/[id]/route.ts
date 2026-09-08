import { NextResponse } from "next/server";
import { getStore } from "@/lib/db";
import { currentSession } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 画像の配り口（顧客写真・生地画像・生成結果）
 * ---------------------------------------------------------------------------
 * ★ 顧客写真は個人情報。public/ にも公開バケットにも置かない。
 *   ここを通るのは「ログイン済み」か「有効な共有トークンを持つ人」だけ。
 *   共有トークンで見られるのは、そのリンクに含まれる試着の画像に限る。
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const store = getStore();
  const url = new URL(req.url);
  const shareToken = url.searchParams.get("share");

  let organizationId: string | null = null;

  if (shareToken) {
    const link = await store.findShareLinkByToken(shareToken);
    if (!link || link.revoked || new Date(link.expires_at).getTime() < Date.now()) {
      return new NextResponse("not found", { status: 404 });
    }
    // そのリンクに含まれる試着の「結果画像」と、生地画像だけを許す
    const tryOns = await Promise.all(link.try_on_ids.map((t) => store.get("try_ons", link.organization_id, t)));
    const allowed = new Set<string>();
    for (const t of tryOns) {
      if (!t) continue;
      if (t.result_media_id) allowed.add(t.result_media_id);
      if (t.fabric_media_id) allowed.add(t.fabric_media_id);
    }
    if (!allowed.has(id)) return new NextResponse("not found", { status: 404 });
    organizationId = link.organization_id;
  } else {
    const session = await currentSession();
    if (!session) return new NextResponse("unauthorized", { status: 401 });
    organizationId = session.organization.id;
  }

  const found = await store.getMediaBytes(organizationId, id);
  if (!found) return new NextResponse("not found", { status: 404 });

  return new NextResponse(new Uint8Array(found.bytes), {
    headers: {
      "content-type": found.media.mime,
      "content-length": String(found.bytes.byteLength),
      // 個人情報なので共有キャッシュには置かせない
      "cache-control": "private, max-age=3600",
      "content-disposition": "inline",
      "x-content-type-options": "nosniff",
    },
  });
}
