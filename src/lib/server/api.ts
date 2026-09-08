import "server-only";
import { NextResponse } from "next/server";
import { currentSession, type Session } from "@/lib/auth/session";
import { MAX_IMAGE_BYTES, sniffImageMime } from "@/lib/util/image";

export async function withSession(
  fn: (s: Session) => Promise<NextResponse>,
): Promise<NextResponse> {
  const s = await currentSession();
  if (!s) return NextResponse.json({ ok: false, message: "ログインが必要です。" }, { status: 401 });
  try {
    return await fn(s);
  } catch (e) {
    const message = e instanceof Error ? e.message : "処理に失敗しました。";
    // 秘密情報を返さない。詳細はサーバーログにだけ残す。
    console.error("[core-suits]", message);
    return NextResponse.json({ ok: false, message: "処理に失敗しました。時間をおいてお試しください。" }, { status: 500 });
  }
}

export function bad(message: string, status = 400): NextResponse {
  return NextResponse.json({ ok: false, message }, { status });
}

export async function readImage(file: unknown): Promise<{ bytes: Buffer; mime: string } | { error: string }> {
  if (!(file instanceof File)) return { error: "画像が添付されていません。" };
  if (file.size > MAX_IMAGE_BYTES) return { error: "画像は12MBまでです。" };
  const bytes = Buffer.from(await file.arrayBuffer());
  const mime = sniffImageMime(bytes);
  if (!mime) return { error: "JPEG / PNG / WebP の画像を選んでください。" };
  return { bytes, mime };
}

export { MAX_IMAGE_BYTES, sniffImageMime };
