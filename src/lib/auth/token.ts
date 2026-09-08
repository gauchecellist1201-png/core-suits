import crypto from "node:crypto";
import type { User } from "@/lib/domain/types";

/**
 * セッション票の作成と検証（保管層に依存しない純粋な部分）
 * ---------------------------------------------------------------------------
 * cookie に入れるのは「誰が・どの店舗で・いつまで」だけ。署名を必ず確認し、
 * 中身を書き換えた票（別店舗への付け替えを含む）は通さない。
 */
export const SESSION_COOKIE = "core_suits_session";
export const TTL_MS = 12 * 60 * 60 * 1000; // 店舗の営業1日ぶん

export interface SessionPayload { uid: string; oid: string; exp: number }

function secret(): string {
  const s = process.env.SUITS_SESSION_SECRET;
  if (s && s.length >= 24) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SUITS_SESSION_SECRET（24文字以上）が未設定です");
  }
  return "dev-only-secret-do-not-use-in-production";
}

function sign(body: string): string {
  return crypto.createHmac("sha256", secret()).update(body).digest("base64url");
}

export function encodeSession(p: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(p)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function decodeSession(token: string | undefined, now = Date.now()): SessionPayload | null {
  if (!token) return null;
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const a = Buffer.from(mac);
  const b = Buffer.from(sign(body));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (typeof p.exp !== "number" || p.exp < now) return null;
    if (!p.uid || !p.oid) return null;
    return p;
  } catch {
    return null;
  }
}

export function newSessionToken(user: User, now = Date.now()): string {
  return encodeSession({ uid: user.id, oid: user.organization_id, exp: now + TTL_MS });
}

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: TTL_MS / 1000,
};
