/**
 * Verifikasi signature push/webhook marketplace (Shopee & TikTok Shop).
 *
 * Shopee Open Platform v2 — Push Mechanism
 *   Header  : Authorization
 *   Rumus   : hex( HMAC-SHA256( key = partner key, msg = <push URL> + "|" + <raw body> ) )
 *   <push URL> harus PERSIS sama dengan "Live Call Back URL" yang didaftarkan di
 *   Shopee Console. Kita TIDAK memakai Host header request (bisa dipalsukan / berbeda
 *   di belakang proxy Vercel), tapi:
 *     SHOPEE_WEBHOOK_URL (override, opsional)  atau
 *     NEXT_PUBLIC_APP_URL + "/api/integrations/shopee/webhook"
 *   Key: SHOPEE_PUSH_PARTNER_KEY (opsional, jika console menampilkan "Push Partner Key"
 *   terpisah) dan/atau SHOPEE_PARTNER_KEY. Signature valid jika cocok dengan salah satunya.
 *
 * TikTok Shop Partner API — Webhooks
 *   Header  : Authorization (nilai mentah, tanpa "Bearer")
 *   Rumus   : hex( HMAC-SHA256( key = app_secret, msg = app_key + <raw body> ) )
 *   Env     : TIKTOK_SHOP_APP_KEY, TIKTOK_SHOP_APP_SECRET
 *
 * Selalu hitung dari raw body (request.text()), bukan dari JSON yang di-serialize ulang.
 */

import crypto from "crypto";

export const SHOPEE_WEBHOOK_PATH = "/api/integrations/shopee/webhook";

export type WebhookVerifyResult =
  | { ok: true }
  | { ok: false; status: 401 | 503; reason: string };

// ─── Primitive helpers ───────────────────────────────────────────────────────

export function hmacSha256Hex(key: string, message: string): string {
  return crypto.createHmac("sha256", key).update(message, "utf8").digest("hex");
}

/** Constant-time compare of two hex signatures (case-insensitive, trimmed). */
export function safeEqualHex(expected: string, received: string): boolean {
  const a = Buffer.from(expected.trim().toLowerCase(), "utf8");
  const b = Buffer.from(received.trim().toLowerCase(), "utf8");
  if (a.length !== b.length || a.length === 0) return false;
  return crypto.timingSafeEqual(a, b);
}

// ─── Shopee ──────────────────────────────────────────────────────────────────

export function computeShopeePushSignature(
  callbackUrl: string,
  rawBody: string,
  partnerKey: string
): string {
  return hmacSha256Hex(partnerKey, `${callbackUrl}|${rawBody}`);
}

/** The exact public push URL registered in Shopee Console. */
export function getShopeeWebhookUrl(): string | null {
  const override = process.env.SHOPEE_WEBHOOK_URL?.trim();
  if (override) return override;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "");
  if (!appUrl) return null;
  return `${appUrl}${SHOPEE_WEBHOOK_PATH}`;
}

export function verifyShopeePush(
  rawBody: string,
  authorizationHeader: string | null
): WebhookVerifyResult {
  const keys = [process.env.SHOPEE_PUSH_PARTNER_KEY, process.env.SHOPEE_PARTNER_KEY]
    .map((k) => k?.trim())
    .filter((k): k is string => !!k);
  const callbackUrl = getShopeeWebhookUrl();

  if (keys.length === 0 || !callbackUrl) {
    return { ok: false, status: 503, reason: "Shopee push key / webhook URL not configured" };
  }
  if (!authorizationHeader) {
    return { ok: false, status: 401, reason: "Missing Authorization header" };
  }

  const valid = keys.some((key) =>
    safeEqualHex(computeShopeePushSignature(callbackUrl, rawBody, key), authorizationHeader)
  );
  return valid ? { ok: true } : { ok: false, status: 401, reason: "Signature mismatch" };
}

// ─── TikTok Shop ─────────────────────────────────────────────────────────────

export function computeTikTokShopWebhookSignature(
  appKey: string,
  rawBody: string,
  appSecret: string
): string {
  return hmacSha256Hex(appSecret, `${appKey}${rawBody}`);
}

export function verifyTikTokShopWebhook(
  rawBody: string,
  authorizationHeader: string | null
): WebhookVerifyResult {
  const appKey = process.env.TIKTOK_SHOP_APP_KEY?.trim();
  const appSecret = process.env.TIKTOK_SHOP_APP_SECRET?.trim();

  if (!appKey || !appSecret) {
    return { ok: false, status: 503, reason: "TikTok Shop app key / secret not configured" };
  }
  if (!authorizationHeader) {
    return { ok: false, status: 401, reason: "Missing Authorization header" };
  }

  const expected = computeTikTokShopWebhookSignature(appKey, rawBody, appSecret);
  return safeEqualHex(expected, authorizationHeader)
    ? { ok: true }
    : { ok: false, status: 401, reason: "Signature mismatch" };
}
