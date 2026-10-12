/**
 * Shopee Open Platform OAuth helper.
 *
 * Reference: https://open.shopee.com/documents/v2/OpenAPI_Guide
 *
 * Auth flow:
 * 1. Admin visits /api/integrations/shopee/connect
 * 2. Redirected to Shopee authorize URL (signed with HMAC-SHA256)
 * 3. Shopee redirects back to /api/integrations/shopee/callback?code=&shop_id=
 * 4. We exchange code for access_token + refresh_token
 * 5. Tokens encrypted and stored in MarketplaceAccount
 */

import crypto from "crypto";

// ─── Environment ──────────────────────────────────────────────────────────────

const isSandbox = process.env.SHOPEE_SANDBOX === "true";

export const SHOPEE_BASE_URL = isSandbox
  ? "https://openplatform.sandbox.test-stable.shopee.sg"
  : "https://partner.shopeemobile.com";

// ─── Signature (HMAC-SHA256) ──────────────────────────────────────────────────

/**
 * Generate Shopee API signature.
 *
 * For public/auth APIs (no shop context):
 *   base = partner_id + api_path + timestamp
 *
 * For shop-level APIs (requires access_token + shop_id):
 *   base = partner_id + api_path + timestamp + access_token + shop_id
 */
export function buildShopeeSign(
  apiPath: string,
  timestamp: number,
  options: { accessToken?: string; shopId?: string | number } = {}
): string {
  const partnerId = process.env.SHOPEE_PARTNER_ID || "";
  const partnerKey = process.env.SHOPEE_PARTNER_KEY || "";

  let baseString = `${partnerId}${apiPath}${timestamp}`;
  if (options.accessToken) baseString += options.accessToken;
  if (options.shopId) baseString += String(options.shopId);

  return crypto
    .createHmac("sha256", partnerKey)
    .update(baseString)
    .digest("hex");
}

// ─── Authorization URL ────────────────────────────────────────────────────────

/**
 * Build the URL to redirect the seller to Shopee's OAuth consent page.
 */
export function buildShopeeAuthUrl(redirectUri: string): string {
  const partnerId = process.env.SHOPEE_PARTNER_ID || "";
  const timestamp = Math.floor(Date.now() / 1000);
  const apiPath = "/api/v2/shop/auth_partner";
  const sign = buildShopeeSign(apiPath, timestamp);

  const params = new URLSearchParams({
    partner_id: partnerId,
    timestamp: String(timestamp),
    sign,
    redirect: redirectUri,
  });

  return `${SHOPEE_BASE_URL}${apiPath}?${params.toString()}`;
}

// ─── Token Exchange ───────────────────────────────────────────────────────────

export interface ShopeeTokenResponse {
  access_token: string;
  refresh_token: string;
  expire_in: number; // seconds until access_token expires
  shop_id: number;
  merchant_id?: number;
  error?: string;
  message?: string;
}

/**
 * Exchange the authorization code (received at callback) for tokens.
 */
export async function shopeeExchangeToken(
  code: string,
  shopId: string | number
): Promise<ShopeeTokenResponse> {
  const partnerId = Number(process.env.SHOPEE_PARTNER_ID || "0");
  const timestamp = Math.floor(Date.now() / 1000);
  const apiPath = "/api/v2/auth/token/get";
  const sign = buildShopeeSign(apiPath, timestamp);

  const url = `${SHOPEE_BASE_URL}${apiPath}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code,
      shop_id: Number(shopId),
      partner_id: partnerId,
    }),
  });

  if (!res.ok) {
    throw new Error(`Shopee token exchange HTTP ${res.status}: ${await res.text()}`);
  }

  return res.json() as Promise<ShopeeTokenResponse>;
}

// ─── Token Refresh ────────────────────────────────────────────────────────────

export interface ShopeeRefreshResponse {
  access_token: string;
  refresh_token: string;
  expire_in: number;
  error?: string;
  message?: string;
}

/**
 * Refresh an expired Shopee access token using the refresh token.
 * Call this when tokenExpiresAt is within 30 minutes of now.
 */
export async function shopeeRefreshToken(
  refreshToken: string,
  shopId: string | number
): Promise<ShopeeRefreshResponse> {
  const partnerId = Number(process.env.SHOPEE_PARTNER_ID || "0");
  const timestamp = Math.floor(Date.now() / 1000);
  const apiPath = "/api/v2/auth/access_token/get";
  const sign = buildShopeeSign(apiPath, timestamp);

  const url = `${SHOPEE_BASE_URL}${apiPath}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      refresh_token: refreshToken,
      shop_id: Number(shopId),
      partner_id: partnerId,
    }),
  });

  if (!res.ok) {
    throw new Error(`Shopee token refresh HTTP ${res.status}: ${await res.text()}`);
  }

  return res.json() as Promise<ShopeeRefreshResponse>;
}

// ─── Shop Info ────────────────────────────────────────────────────────────────

/**
 * Fetch basic shop info (name) after connecting, to display in the admin UI.
 */
export async function shopeeGetShopInfo(
  accessToken: string,
  shopId: string | number
): Promise<{ shop_name: string } | null> {
  const partnerId = Number(process.env.SHOPEE_PARTNER_ID || "0");
  const timestamp = Math.floor(Date.now() / 1000);
  const apiPath = "/api/v2/shop/get_shop_info";
  const sign = buildShopeeSign(apiPath, timestamp, {
    accessToken,
    shopId,
  });

  const params = new URLSearchParams({
    partner_id: String(partnerId),
    timestamp: String(timestamp),
    sign,
    access_token: accessToken,
    shop_id: String(shopId),
  });

  try {
    const res = await fetch(`${SHOPEE_BASE_URL}${apiPath}?${params}`);
    const data = await res.json() as { response?: { shop_name: string }; error?: string };
    return data.response || null;
  } catch {
    return null;
  }
}
