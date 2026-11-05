/**
 * Stateless, single-use password links (reset password / guest buyers
 * claiming their account). No database table needed:
 *
 *   token = base64url(JSON{uid, exp, fp}) + "." + HMAC-SHA256(payload, secret)
 *
 * `fp` fingerprints the user's current password hash, so the link stops
 * working as soon as a password is set, and it expires after 1 hour.
 */

import { createHash, createHmac, timingSafeEqual } from "crypto";
import { getAuthSecret } from "@/lib/auth-secret";

const TTL_MS = 60 * 60 * 1000;

const b64url = (s: string | Buffer) => Buffer.from(s).toString("base64url");

function fingerprint(passwordHash: string | null): string {
  return createHash("sha256").update(passwordHash || "no-password").digest("hex").slice(0, 16);
}

function sign(payload: string): string {
  const secret = getAuthSecret();
  if (!secret) throw new Error("NEXTAUTH_SECRET belum dikonfigurasi");
  return createHmac("sha256", `${secret}:password-link`).update(payload).digest("base64url");
}

export function createPasswordToken(userId: string, passwordHash: string | null): string {
  const payload = b64url(JSON.stringify({ uid: userId, exp: Date.now() + TTL_MS, fp: fingerprint(passwordHash) }));
  return `${payload}.${sign(payload)}`;
}

/** Returns the user id when the signature is valid and the token not expired. */
export function readPasswordToken(token: string): { uid: string; fp: string } | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  let expected: string;
  try {
    expected = sign(payload);
  } catch {
    return null;
  }
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as { uid?: string; exp?: number; fp?: string };
    if (!data.uid || !data.fp || !data.exp || data.exp < Date.now()) return null;
    return { uid: data.uid, fp: data.fp };
  } catch {
    return null;
  }
}

export function tokenMatchesUser(fp: string, passwordHash: string | null): boolean {
  return fp === fingerprint(passwordHash);
}
