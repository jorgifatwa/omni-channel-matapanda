/**
 * tiktokshop-products.ts
 *
 * TikTok Shop Open API (Tokopedia) Product Management & Stock Sync Helper.
 * Reference: https://partner.tiktokshop.com/docv2/page/6502491c6bb4f502f5d7f4af
 */

import crypto from "crypto";
import { TIKTOK_API_BASE } from "@/lib/tiktokshop-oauth";

export interface TikTokShopProductItem {
  itemId: string;
  modelId?: string | null; // TikTok SKU ID
  name: string;
  modelName?: string | null;
  sku: string;
  stock: number;
  price: number;
  image?: string | null;
  hasModel: boolean;
}

/**
 * Generate HMAC-SHA256 signature for TikTok Shop API v202309.
 * Rule: AppSecret + Path + SortedParamsString + (Body if POST) + AppSecret
 */
export function buildTikTokShopSign(
  path: string,
  params: Record<string, string>,
  body: string = ""
): string {
  const appSecret = process.env.TIKTOK_SHOP_APP_SECRET || "";
  const sortedKeys = Object.keys(params).sort();
  const paramString = sortedKeys.map((k) => `${k}${params[k]}`).join("");
  const baseString = `${appSecret}${path}${paramString}${body}${appSecret}`;
  return crypto.createHmac("sha256", appSecret).update(baseString).digest("hex");
}

type TikTokSearchResponse = {
  code: number;
  message: string;
  data?: {
    next_page_token?: string;
    products?: Array<{
      id: string;
      title: string;
      main_images?: Array<{ url_list?: string[] }>;
      skus?: Array<{
        id: string;
        seller_sku?: string;
        price?: { original_price?: string; sale_price?: string };
        inventory?: Array<{ quantity?: number; warehouse_id?: string }>;
        sales_attributes?: Array<{ value_name?: string }>;
      }>;
    }>;
  };
};

/**
 * Fetch and format all active products from TikTok Shop (Tokopedia), all pages.
 * Throws on API errors so callers report a failure instead of syncing wrong data.
 * Endpoint: POST /product/202309/products/search (page_size/page_token are query params).
 */
export async function fetchUnifiedTikTokShopProducts(
  accessToken: string,
  shopId: string
): Promise<TikTokShopProductItem[]> {
  const appKey = process.env.TIKTOK_SHOP_APP_KEY || "";
  const path = "/product/202309/products/search";
  const bodyStr = JSON.stringify({ status: "ACTIVATE" });
  const formatted: TikTokShopProductItem[] = [];

  let pageToken = "";
  for (let page = 0; page < 50; page++) {
    const queryParams: Record<string, string> = {
      app_key: appKey,
      timestamp: String(Math.floor(Date.now() / 1000)),
      shop_cipher: shopId,
      page_size: "100",
    };
    if (pageToken) queryParams.page_token = pageToken;
    queryParams.sign = buildTikTokShopSign(path, queryParams, bodyStr);

    const res = await fetch(`${TIKTOK_API_BASE}${path}?${new URLSearchParams(queryParams)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-tts-access-token": accessToken },
      body: bodyStr,
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as Partial<TikTokSearchResponse>;
    if (!res.ok || data.code !== 0) {
      throw new Error(`TikTok Shop products/search gagal (HTTP ${res.status}, code ${data.code}): ${data.message || "unknown"}`);
    }

    for (const prod of data.data?.products || []) {
      const mainImage = prod.main_images?.[0]?.url_list?.[0] || null;
      const skus = prod.skus || [];
      if (skus.length === 0) {
        formatted.push({
          itemId: prod.id,
          modelId: null,
          name: prod.title,
          modelName: null,
          sku: `TTS-${prod.id}`,
          stock: 0,
          price: 0,
          image: mainImage,
          hasModel: false,
        });
        continue;
      }
      for (const s of skus) {
        const varName =
          skus.length > 1
            ? s.sales_attributes?.map((a) => a.value_name).filter(Boolean).join(" - ") || null
            : null;
        formatted.push({
          itemId: prod.id,
          modelId: s.id,
          name: prod.title,
          modelName: varName,
          sku: s.seller_sku || `TTS-${s.id}`,
          stock: s.inventory?.reduce((acc, inv) => acc + (inv.quantity || 0), 0) ?? 0,
          price: Number(s.price?.sale_price || s.price?.original_price || 0),
          image: mainImage,
          hasModel: skus.length > 1,
        });
      }
    }

    pageToken = data.data?.next_page_token || "";
    if (!pageToken) break;
  }
  return formatted;
}

/**
 * Update stock on TikTok Shop (Tokopedia)
 * Endpoint: POST /product/202309/products/{product_id}/inventory/update
 * Body: { skus: [{ id, inventory: [{ quantity }] }] }
 */
export async function updateTikTokShopStock(
  accessToken: string,
  shopId: string,
  productId: string,
  skuId?: string | null,
  stock: number = 0
): Promise<{ success: boolean; error?: string }> {
  if (!skuId) {
    return { success: false, error: "SKU TikTok Shop belum dipetakan (sku id kosong)." };
  }
  const appKey = process.env.TIKTOK_SHOP_APP_KEY || "";
  const path = `/product/202309/products/${productId}/inventory/update`;

  try {
    const bodyStr = JSON.stringify({
      skus: [{ id: skuId, inventory: [{ quantity: Math.max(0, Math.floor(Number(stock))) }] }],
    });
    const queryParams: Record<string, string> = {
      app_key: appKey,
      timestamp: String(Math.floor(Date.now() / 1000)),
      shop_cipher: shopId,
    };
    queryParams.sign = buildTikTokShopSign(path, queryParams, bodyStr);

    const res = await fetch(`${TIKTOK_API_BASE}${path}?${new URLSearchParams(queryParams)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-tts-access-token": accessToken },
      body: bodyStr,
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as { code?: number; message?: string };
    if (!res.ok || data.code !== 0) {
      const error = `TikTok Shop inventory/update gagal (HTTP ${res.status}, code ${data.code}): ${data.message || "unknown"}`;
      console.warn("[TikTok Shop Stock Update]", error);
      return { success: false, error };
    }
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[TikTok Shop Stock Update] Error:", msg);
    return { success: false, error: msg };
  }
}
