/**
 * 総当たり防止。IP＋ログインIDごとに失敗を数え、続いたらしばらく受け付けない。
 * メモリ保持なので複数インスタンスでは完全ではないが、素の総当たりは確実に止まる。
 */
interface Bucket { fails: number; blockedUntil: number; at: number }

const buckets = new Map<string, Bucket>();
export const MAX_FAILS = 5;
export const BLOCK_MS = 10 * 60 * 1000;
const SWEEP_MS = 60 * 60 * 1000;

function sweep(now: number): void {
  for (const [k, b] of buckets) if (now - b.at > SWEEP_MS && b.blockedUntil < now) buckets.delete(k);
}

export function checkAllowed(key: string, now = Date.now()): { allowed: boolean; retryAfterSec: number } {
  sweep(now);
  const b = buckets.get(key);
  if (!b) return { allowed: true, retryAfterSec: 0 };
  if (b.blockedUntil > now) return { allowed: false, retryAfterSec: Math.ceil((b.blockedUntil - now) / 1000) };
  return { allowed: true, retryAfterSec: 0 };
}

export function recordFailure(key: string, now = Date.now()): void {
  const b = buckets.get(key) ?? { fails: 0, blockedUntil: 0, at: now };
  b.fails += 1;
  b.at = now;
  if (b.fails >= MAX_FAILS) { b.blockedUntil = now + BLOCK_MS; b.fails = 0; }
  buckets.set(key, b);
}

export function recordSuccess(key: string): void { buckets.delete(key); }
export function resetRateLimit(): void { buckets.clear(); }
