import { NextResponse } from "next/server";
import {
  getActiveMarketplaceAccounts,
  getProductMappings,
  saveProductMapping,
} from "@/lib/marketplace-store";
import { decryptToken } from "@/lib/marketplace-crypto";
import { updateShopeeStock } from "@/lib/shopee-products";
import { buildTikTokShopSign } from "@/lib/tiktokshop-products";
import { TIKTOK_API_BASE } from "@/lib/tiktokshop-oauth";
import { prisma } from "@/lib/prisma";

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

    let shopeeToken = "";
    if (shopeeAccount) {
      try {
        shopeeToken = decryptToken(shopeeAccount.accessToken);
      } catch {
        shopeeToken = shopeeAccount.accessToken;
      }
    }

    // Process Order Status Change (New paid order awaiting shipment)
    const orderId = data?.order_id;
    const orderStatus = data?.order_status;

    if (orderId && (orderStatus === "AWAITING_SHIPMENT" || !orderStatus || type === 1)) {
      console.log(`[TikTok Shop Webhook] Processing order ${orderId} (Status: ${orderStatus || "NEW"})`);

      let orderItems: Array<{ sku_id?: string; seller_sku?: string; quantity: number }> = [];

      // 1. Check if SKU list is already in webhook payload
      if (Array.isArray(data?.sku_list) && data.sku_list.length > 0) {
        orderItems = data.sku_list.map((s: TikTokWebhookItem) => ({
          sku_id: s.sku_id,
          seller_sku: s.seller_sku,
          quantity: Number(s.quantity) || 1,
        }));
      } else if (Array.isArray(data?.line_items) && data.line_items.length > 0) {
        orderItems = data.line_items.map((s: TikTokWebhookItem) => ({
          sku_id: s.sku_id,
          seller_sku: s.seller_sku,
          quantity: Number(s.quantity) || 1,
        }));
      } else {
        // 2. Fetch order detail from TikTok Shop API
        try {
          const appKey = process.env.TIKTOK_SHOP_APP_KEY || "";
          const timestamp = String(Math.floor(Date.now() / 1000));
          const path = `/order/202309/orders/${orderId}`;
          const queryParams: Record<string, string> = {
            app_key: appKey,
            timestamp,
            shop_cipher: tiktokAccount.shopId,
          };
          const sign = buildTikTokShopSign(path, queryParams);
          queryParams.sign = sign;

          const queryString = new URLSearchParams(queryParams).toString();
          const res = await fetch(`${TIKTOK_API_BASE}${path}?${queryString}`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "x-tts-access-token": tiktokToken,
            },
          });

          if (res.ok) {
            const resJson = await res.json() as {
              data?: { line_items?: Array<{ sku_id?: string; seller_sku?: string; quantity?: number }> };
            };
            if (resJson.data?.line_items) {
              orderItems = resJson.data.line_items.map((it) => ({
                sku_id: it.sku_id,
                seller_sku: it.seller_sku,
                quantity: Number(it.quantity) || 1,
              }));
            }
          }
        } catch (fetchErr) {
          console.warn("[TikTok Shop Webhook] Could not fetch remote order detail:", fetchErr);
        }
      }

      // If items resolved, deduct stock across website and Shopee
      const allMappings = await getProductMappings();

      for (const item of orderItems) {
        const cleanSku = (item.seller_sku || "").trim().toUpperCase();

        const match = allMappings.find(
          (m) =>
            m.platform === "TIKTOK_SHOP" &&
            ((item.sku_id && m.marketplaceModelId === item.sku_id) ||
              (cleanSku && m.sku.trim().toUpperCase() === cleanSku))
        );

        if (match) {
          const purchasedQty = item.quantity || 1;
          const newStock = Math.max(0, match.websiteStock - purchasedQty);

          console.log(
            `[TikTok Shop Webhook] Auto-deducting stock for SKU ${match.sku}: ${match.websiteStock} -> ${newStock}`
          );

          // 1. Update TikTok Shop mapping
          await saveProductMapping({
            ...match,
            websiteStock: newStock,
            marketplaceStock: newStock,
            lastSyncAt: new Date().toISOString(),
            lastSyncStatus: "SUCCESS",
            lastSyncError: null,
          });

          // 2. Update Website Database (Prisma)
          try {
            if (match.variantId) {
              await prisma.productVariant.update({
                where: { id: match.variantId },
                data: { stock: newStock },
              });
            } else if (match.productId) {
              await prisma.product.update({
                where: { id: match.productId },
                data: { stock: newStock },
              });
            }
          } catch {}

          // 3. Propagate new stock to Shopee!
          if (shopeeAccount) {
            const shopeeMatch = allMappings.find(
              (m) =>
                m.platform === "SHOPEE" &&
                m.sku.trim().toUpperCase() === match.sku.trim().toUpperCase()
            );

            if (shopeeMatch) {
              console.log(
                `[TikTok Shop Webhook] Propagating new stock (${newStock}) to Shopee for SKU ${match.sku}...`
              );
              const shopeeRes = await updateShopeeStock(
                shopeeToken,
                shopeeAccount.shopId,
                shopeeMatch.marketplaceItemId,
                newStock,
                shopeeMatch.marketplaceModelId
              );

              if (shopeeRes.success) {
                await saveProductMapping({
                  ...shopeeMatch,
                  websiteStock: newStock,
                  marketplaceStock: newStock,
                  lastSyncAt: new Date().toISOString(),
                  lastSyncStatus: "SUCCESS",
                  lastSyncError: null,
                });
              }
            }
          }
        }
      }
    }

    // TikTok Shop expects { code: 0, message: "success" }
    return NextResponse.json({ code: 0, message: "success" });
  } catch (error) {
    console.error("[TikTok Shop Webhook] Error:", error);
    return NextResponse.json({ code: 0, message: "handled with error" });
  }
}
