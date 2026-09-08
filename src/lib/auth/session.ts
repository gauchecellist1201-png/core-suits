import { cookies } from "next/headers";
import type { Organization, User } from "@/lib/domain/types";
import { getStore } from "@/lib/db";
import { SESSION_COOKIE, decodeSession } from "./token";

export { SESSION_COOKIE, cookieOptions, decodeSession, encodeSession, newSessionToken } from "./token";
export type { SessionPayload } from "./token";

export interface Session { user: User; organization: Organization }

/** ログイン済みなら本人と店舗を返す。未ログインなら null。 */
export async function currentSession(): Promise<Session | null> {
  const jar = await cookies();
  const p = decodeSession(jar.get(SESSION_COOKIE)?.value);
  if (!p) return null;
  const store = getStore();
  // 店舗をまたいだ付け替えを防ぐため、必ず「その店舗の中で」利用者を引く
  const user = await store.get("users", p.oid, p.uid);
  if (!user) return null;
  const organization = await store.getOrganization(p.oid);
  if (!organization) return null;
  return { user, organization };
}
