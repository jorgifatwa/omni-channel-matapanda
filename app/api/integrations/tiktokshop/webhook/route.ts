import { NextResponse } from "next/server";
import {
  getActiveMarketplaceAccounts,
} from "@/lib/marketplace-store";
import { decryptToken } from "@/lib/marketplace-crypto";
import { buildTikTokShopSign } from "@/lib/tiktokshop-products";
import { TIKTOK_API_BASE } from "@/lib/tiktokshop-oauth";
import { verifyTikTokShopWebhook } from "@/lib/webhook-signature";
import { applyMarketplaceOrderToStock } from "@/lib/marketplace-order-stock";

/**
 * GET /api/integrations/tiktokshop/webhook
 * TikTok Shop verification ping / healthcheck
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get("challenge") || searchParams.get("hub.challenge");
  if (challenge) {
    return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return NextResponse.json({ status: "ok", message: "TikTok Shop webhook active" }, { status: 200 });
}

interface TikTokWebhookItem {
  sku_id?: string;
  seller_sku?: string;
  quantity?: number | string;
}

interface TikTokWebhookPayload {
  type?: number;
  shop_id?: string;
  data?: {
    order_id?: string;
    order_status?: string;
    sku_list?: TikTokWebhookItem[];
    line_items?: TikTokWebhookItem[];
  };
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();

    // Reject anything not signed by the marketplace BEFORE touching the payload / DB.
    const verification = verifyTikTokShopWebhook(rawBody, request.headers.get("authorization"));
    if (!verification.ok) {
      console.warn(`[TikTok Shop Webhook] Rejected push: ${verification.reason}`);
      return NextResponse.json({ error: "Signature tidak valid" }, { status: verification.status });
    }

    let body: TikTokWebhookPayload = {};
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ code: 1, message: "Invalid JSON" }, { status: 400 });
    }

    const { type, shop_id, data } = body;
    console.log(`[TikTok Shop Webhook] Received push event type ${type} for shop ${shop_id}`);

    // Verify TikTok Shop account is connected
    const accounts = await getActiveMarketplaceAccounts();
    const tiktokAccount = accounts.find((a) => a.platform === "TIKTOK_SHOP");
    const shopeeAccount = accounts.find((a) => a.platform === "SHOPEE");

    if (!tiktokAccount) {
      console.warn(`[TikTok Shop Webhook] No active TikTok Shop account found.`);
      return NextResponse.json({ code: 0, message: "Account not registered" });
    }

    let tiktokToken = "";
    try {
      tiktokToken = decryptToken(tiktokAccount.accessToken);
    } catch {
      tiktokToken = tiktokAccount.accessToken;
    }

    // Order status pushes arrive for every status change; website stock is
    // reduced only once, when the order is paid and awaiting shipment.
    const orderId = data?.order_id;
    const orderStatus = data?.order_status;

    if (orderId && orderStatus === "AWAITING_SHIPMENT") {
      let orderItems: Array<{ sku_id?: string; seller_sku?: string; product_id?: string; quantity: number }> = [];

      const inline = Array.isArray(data?.sku_list) && data.sku_list.length > 0
        ? data.sku_list
        : Array.isArray(data?.line_items) && data.line_items.length > 0
        ? data.line_items
        : null;

      if (inline) {
        orderItems = inline.map((s: TikTokWebhookItem) => ({
          sku_id: s.sku_id,
          seller_sku: s.seller_sku,
          quantity: Number(s.quantity) || 1,
        }));
      } else {
        // Order detail: GET /order/202309/orders?ids=<id>
        const appKey = process.env.TIKTOK_SHOP_APP_KEY || "";
        const path = "/order/202309/orders";
        const queryParams: Record<string, string> = {
          app_key: appKey,
          timestamp: String(Math.floor(Date.now() / 1000)),
          shop_cipher: tiktokAccount.shopId,
          ids: String(orderId),
        };
        queryParams.sign = buildTikTokShopSign(path, queryParams);
        const res = await fetch(`${TIKTOK_API_BASE}${path}?${new URLSearchParams(queryParams)}`, {
          method: "GET",
          headers: { "Content-Type": "application/json", "x-tts-access-token": tiktokToken },
          cache: "no-store",
        });
        const resJson = (await res.json().catch(() => ({}))) as {
          code?: number;
          message?: string;
          data?: { orders?: Array<{ line_items?: Array<{ sku_id?: string; seller_sku?: string; product_id?: string; quantity?: number }> }> };
        };
        if (!res.ok || resJson.code !== 0) {
          // Throw -> 500 so TikTok retries instead of the order being lost
          throw new Error(`TikTok order detail ${orderId} gagal (HTTP ${res.status}, code ${resJson.code}): ${resJson.message || ""}`);
        }
        // Each line item is one unit; quantity is 1 unless the API says otherwise
        orderItems = (resJson.data?.orders?.[0]?.line_items || []).map((it) => ({
          sku_id: it.sku_id,
          seller_sku: it.seller_sku,
          product_id: it.product_id,
          quantity: Number(it.quantity) || 1,
        }));
      }

      const { deducted } = await applyMarketplaceOrderToStock(
        "TIKTOK_SHOP",
        orderItems.map((it) => ({
          itemId: it.product_id || null,
          modelId: it.sku_id || null,
          sellerSku: it.seller_sku || null,
          quantity: it.quantity,
        })),
        shopeeAccount
      );
      console.log(`[TikTok Shop Webhook] Order ${orderId}: ${deducted} item(s) deducted from website stock.`);
    } else if (orderId) {
      console.log(`[TikTok Shop Webhook] Order ${orderId} status ${orderStatus || "-"}: no stock change.`);
    }

    // TikTok Shop expects { code: 0, message: "success" }
    return NextResponse.json({ code: 0, message: "success" });
  } catch (error) {
    console.error("[TikTok Shop Webhook] Error:", error);
    // Non-2xx so the marketplace retries the push instead of the event being lost
    return NextResponse.json({ code: 1, message: "internal error" }, { status: 500 });
  }
}
