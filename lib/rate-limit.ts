/**
 * Fixed-window rate limiting for public endpoints (contact form, register,
 * login, password reset, order lookup...).
 *
 * - With UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN set, counters live
 *   in Upstash Redis and apply across all Vercel instances.
 * - Without them, counters are kept in memory per server instance: weaker on
 *   serverless (each instance counts separately) but still stops simple floods.
 *
 * Never throws: if Redis is unreachable the request is allowed.
 */

const memory = new Map<string, { count: number; resetAt: number }>();

async function upstashIncr(key: string, windowSec: number): Promise<number | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        ["INCR", key],
        ["EXPIRE", key, String(windowSec), "NX"],
      ]),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ result?: number }>;
    return typeof data?.[0]?.result === "number" ? data[0].result : null;
  } catch {
    return null;
  }
}

function memoryIncr(key: string, windowMs: number): number {
  const now = Date.now();
  const entry = memory.get(key);
  if (!entry || entry.resetAt <= now) {
    memory.set(key, { count: 1, resetAt: now + windowMs });
    if (memory.size > 5000) {
      memory.forEach((v, k) => {
        if (v.resetAt <= now) memory.delete(k);
      });
    }
    return 1;
  }
  entry.count++;
  return entry.count;
}

/** Returns true when the action is allowed, false when the limit is exceeded. */
export async function rateLimit(name: string, id: string, limit: number, windowSec: number): Promise<boolean> {
  const windowStart = Math.floor(Date.now() / (windowSec * 1000));
  const key = `rl:${name}:${id}:${windowStart}`;
  const count = (await upstashIncr(key, windowSec)) ?? memoryIncr(key, windowSec * 1000);
  return count <= limit;
}

/** Best-effort client IP behind Vercel's proxy. */
export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

export const TOO_MANY_MESSAGE = "Terlalu banyak percobaan. Silakan tunggu beberapa menit lalu coba lagi.";
