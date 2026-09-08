import crypto from "node:crypto";

/** 推測できない id。URL に出るもの（共有トークン）は必ずこれ。 */
export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(9).toString("base64url")}`;
}

export function newShareToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

export function nowIso(): string {
  return new Date().toISOString();
}
