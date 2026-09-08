import crypto from "node:crypto";

/**
 * パスワードの保存と照合
 * 平文でも SHA 単発でも保存しない。scrypt（ソルト付き）で固定長にし、
 * 照合は timingSafeEqual で行う。形式: scrypt$<saltHex>$<hashHex>
 */
const N = 16384;
const KEYLEN = 32;

export function hashPassword(plain: string, saltHex?: string): string {
  const salt = saltHex ? Buffer.from(saltHex, "hex") : crypto.randomBytes(16);
  const hash = crypto.scryptSync(plain.normalize("NFKC"), salt, KEYLEN, { N });
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const salt = Buffer.from(parts[1]!, "hex");
  const expected = Buffer.from(parts[2]!, "hex");
  if (salt.length === 0 || expected.length !== KEYLEN) return false;
  let actual: Buffer;
  try {
    actual = crypto.scryptSync(plain.normalize("NFKC"), salt, KEYLEN, { N });
  } catch {
    return false;
  }
  return crypto.timingSafeEqual(actual, expected);
}
