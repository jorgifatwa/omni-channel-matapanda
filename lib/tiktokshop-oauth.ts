/**
 * TikTok Shop Open API (Tokopedia) OAuth helper.
 *
 * Post-merger, Tokopedia seller API integrations now go through
 * TikTok Shop Partner Center: https://partner.tiktokshop.com
 *
 * Reference docs: https://partner.tiktokshop.com/docv2/page/6502491c6bb4f502f5d7f4af
 *
 * Auth flow:
 * 1. Admin visits /api/integrations/tiktokshop/connect
 * 2. Redirected to TikTok Shop authorize URL
 * 3. TikTok redirects back to /api/integrations/tiktokshop/callback?code=&shop_cipher=
 * 4. We POST to token endpoint with code + app credentials
 * 5. Tokens encrypted and stored in MarketplaceAccount
 */

// ─── Environment ──────────────────────────────────────────────────────────────

/** Authorization base URL — for Indonesia & other non-US markets */
const TIKTOK_AUTH_BASE = "https://services.tiktokshop.com";
/** Token & API base URL */
const TIKTOK_API_BASE = "https://open-api.tiktokglobalshop.com";
/** Token endpoint */
const TIKTOK_TOKEN_URL = "https://auth.tiktok-shops.com/api/v2/token/get";
const TIKTOK_REFRESH_URL = "https://auth.tiktok-shops.com/api/v2/token/refresh";

// ─── Authorization URL ────────────────────────────────────────────────────────

/**
 * Build the URL to redirect the seller to TikTok Shop's OAuth consent screen.
 *
 * The seller will grant your app access to their TikTok Shop (Tokopedia)
 * account, then be redirected back with a `code` and `shop_cipher`.
 */
export function buildTikTokShopAuthUrl(redirectUri?: string): string {
  const serviceId =
    process.env.TIKTOK_SHOP_SERVICE_ID || process.env.TIKTOK_SHOP_APP_KEY || "";

  const params = new URLSearchParams({
    service_id: serviceId,
  });

  if (redirectUri) {
    params.set("redirect_uri", redirectUri);
  }

  return `${TIKTOK_AUTH_BASE}/open/authorize?${params.toString()}`;
}

// ─── Token Exchange ───────────────────────────────────────────────────────────

export interface TikTokShopTokenResponse {
  code: number;
  message: string;
  data: {
    access_token: string;
    refresh_token: string;
    access_token_expire_in: number;  // Unix timestamp of expiry
    refresh_token_expire_in: number;
    open_id: string;
    seller_name?: string;
    seller_base_region?: string;
  };
}

/**
 * Exchange the authorization code for an access_token and refresh_token.
 * Called in the /callback route after the seller grants access.
 */
export async function tikTokShopExchangeToken(
  code: string
): Promise<TikTokShopTokenResponse> {
  const appKey = process.env.TIKTOK_SHOP_APP_KEY || "";
  const appSecret = process.env.TIKTOK_SHOP_APP_SECRET || "";

  const url = new URL(TIKTOK_TOKEN_URL);
  url.searchParams.set("app_key", appKey);
  url.searchParams.set("app_secret", appSecret);
  url.searchParams.set("auth_code", code);
  url.searchParams.set("grant_type", "authorized_code");

  const res = await fetch(url.toString(), {
    method: "GET",
  });

  if (!res.ok) {
    throw new Error(
      `TikTok Shop token exchange HTTP ${res.status}: ${await res.text()}`
    );
  }

  return res.json() as Promise<TikTokShopTokenResponse>;
}

// ─── Token Refresh ────────────────────────────────────────────────────────────

export interface TikTokShopRefreshResponse {
  code: number;
  message: string;
  data: {
    access_token: string;
    refresh_token: string;
    access_token_expire_in: number;
    refresh_token_expire_in: number;
  };
}

/**
 * Refresh an expired TikTok Shop access token.
 * Call this when tokenExpiresAt is within 30 minutes of now.
 */
export async function tikTokShopRefreshToken(
  refreshToken: string
): Promise<TikTokShopRefreshResponse> {
  const appKey = process.env.TIKTOK_SHOP_APP_KEY || "";
  const appSecret = process.env.TIKTOK_SHOP_APP_SECRET || "";

  const url = new URL(TIKTOK_REFRESH_URL);
  url.searchParams.set("app_key", appKey);
  url.searchParams.set("app_secret", appSecret);
  url.searchParams.set("refresh_token", refreshToken);
  url.searchParams.set("grant_type", "refresh_token");

  const res = await fetch(url.toString(), {
    method: "GET",
  });

  if (!res.ok) {
    throw new Error(
      `TikTok Shop token refresh HTTP ${res.status}: ${await res.text()}`
    );
  }

  return res.json() as Promise<TikTokShopRefreshResponse>;
}

// ─── Seller Info ──────────────────────────────────────────────────────────────

/**
 * Fetch basic seller info after connecting, to display in the admin UI.
 * Uses the TikTok Shop Get Seller Shops endpoint.
 */
export async function tikTokShopGetSellerInfo(
  accessToken: string
): Promise<{ seller_name?: string; region?: string } | null> {
  try {
    const appKey = process.env.TIKTOK_SHOP_APP_KEY || "";
    const res = await fetch(
      `${TIKTOK_API_BASE}/api/seller/202309/shops/get_authorized_shop`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-tts-access-token": accessToken,
          "x-app-key": appKey,
        },
      }
    );
    const data = await res.json() as {
      data?: { name?: string; region?: string };
    };
    return data.data ? { seller_name: data.data.name, region: data.data.region } : null;
  } catch {
    return null;
  }
}

export { TIKTOK_API_BASE };
