import { describe, expect, it, beforeEach } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { decodeSession, encodeSession } from "@/lib/auth/token";
import { checkAllowed, recordFailure, recordSuccess, resetRateLimit, MAX_FAILS } from "@/lib/auth/rateLimit";

describe("パスワード", () => {
  it("同じパスワードでも保存値は毎回変わる（ソルト）", () => {
    expect(hashPassword("secret123")).not.toBe(hashPassword("secret123"));
  });
  it("正しいものだけ通す", () => {
    const stored = hashPassword("secret123");
    expect(verifyPassword("secret123", stored)).toBe(true);
    expect(verifyPassword("secret124", stored)).toBe(false);
  });
  it("形の違う保存値は通さない（例外を投げない）", () => {
    expect(verifyPassword("x", "")).toBe(false);
    expect(verifyPassword("x", "plaintext")).toBe(false);
    expect(verifyPassword("x", "scrypt$zz$zz")).toBe(false);
    expect(verifyPassword("x", "md5$aa$bb")).toBe(false);
  });
});

describe("セッション", () => {
  const now = 1_800_000_000_000;
  it("往復して同じ内容になる", () => {
    const t = encodeSession({ uid: "u1", oid: "o1", exp: now + 1000 });
    expect(decodeSession(t, now)).toEqual({ uid: "u1", oid: "o1", exp: now + 1000 });
  });
  it("中身を書き換えたものは通さない", () => {
    const t = encodeSession({ uid: "u1", oid: "o1", exp: now + 1000 });
    const forged = Buffer.from(JSON.stringify({ uid: "u1", oid: "OTHER_ORG", exp: now + 1000 })).toString("base64url");
    expect(decodeSession(`${forged}.${t.split(".")[1]}`, now)).toBeNull();
  });
  it("期限切れは通さない", () => {
    const t = encodeSession({ uid: "u1", oid: "o1", exp: now - 1 });
    expect(decodeSession(t, now)).toBeNull();
  });
  it("空・形なしは通さない", () => {
    expect(decodeSession(undefined, now)).toBeNull();
    expect(decodeSession("", now)).toBeNull();
    expect(decodeSession("nodot", now)).toBeNull();
  });
});

describe("総当たり防止", () => {
  beforeEach(() => resetRateLimit());
  it("規定回数の失敗で受け付けを止める", () => {
    for (let i = 0; i < MAX_FAILS; i++) recordFailure("k");
    expect(checkAllowed("k").allowed).toBe(false);
  });
  it("成功したら数え直す", () => {
    for (let i = 0; i < MAX_FAILS - 1; i++) recordFailure("k");
    recordSuccess("k");
    expect(checkAllowed("k").allowed).toBe(true);
  });
  it("別の相手は巻き添えにしない", () => {
    for (let i = 0; i < MAX_FAILS; i++) recordFailure("a");
    expect(checkAllowed("b").allowed).toBe(true);
  });
});
