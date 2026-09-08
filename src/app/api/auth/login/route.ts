import { NextResponse } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { checkAllowed, recordFailure, recordSuccess } from "@/lib/auth/rateLimit";
import { SESSION_COOKIE, cookieOptions, newSessionToken } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ login_id: z.string().min(1).max(64), password: z.string().min(1).max(200) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "入力を確認してください。" }, { status: 400 });
  }
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const key = `${ip}:${parsed.data.login_id}`;

  const gate = checkAllowed(key);
  if (!gate.allowed) {
    return NextResponse.json(
      { ok: false, message: `試行が続いたため、${Math.ceil(gate.retryAfterSec / 60)}分ほどお待ちください。` },
      { status: 429 },
    );
  }

  const user = await getStore().findUserByLoginId(parsed.data.login_id);
  // ユーザーの有無で応答を変えない（存在するIDを当てられないようにする）
  const ok = user ? verifyPassword(parsed.data.password, user.password_hash) : false;
  if (!user || !ok) {
    recordFailure(key);
    return NextResponse.json({ ok: false, message: "ログインIDまたはパスワードが違います。" }, { status: 401 });
  }

  recordSuccess(key);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, newSessionToken(user), cookieOptions);
  return res;
}
