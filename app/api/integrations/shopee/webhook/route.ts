import { NextResponse } from "next/server";
import {
  getActiveMarketplaceAccounts,
  getProductMappings,
  saveProductMapping,
} from "@/lib/marketplace-store";
import { decryptToken } from "@/lib/marketplace-crypto";
import { buildShopeeSign, SHOPEE_BASE_URL } from "@/lib/shopee-oauth";
import { updateTikTokShopStock } from "@/lib/tiktokshop-products";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/integrations/shopee/webhook
 *
 * Shopee Open Platform Push Mechanism (Real-Time Webhook)
 * Menerima notifikasi otomatis dari Shopee saat terjadi transaksi:
 * - Code 3: Order Status Update (e.g. Pembeli Checkout, Bayar, Cancel)
 * - Code 4: Tracking No Update
 *
 * 3-Way Omnichannel Sync:
 * Ketika pesanan masuk di Shopee:
 * 1. Stok di website ZODIAC otomatis dipotong secara instan.
 * 2. Stok baru langsung didorong ke TikTok Shop (Tokopedia) agar tidak overselling!
 */
interface ShopeeWebhookPayload {
  code?: number;
  shop_id?: number | string;
  data?: {
    ordersn?: string;
    status?: string;
    items?: Array<{
      item_id?: number | string;
      model_id?: number | string;
      model_sku?: string;
      model_quantity_purchased?: number;
    }>;
    [key: string]: unknown;
  };
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    let body: ShopeeWebhookPayload = {};
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ code: 1, message: "Invalid JSON" }, { status: 400 });
    }

    const { code, shop_id, data } = body;
    console.log(`[Shopee Webhook] Received push event code ${code} for shop ${shop_id}`);

    // Verify shop is connected
    const accounts = await getActiveMarketplaceAccounts();
    const shopeeAccount = accounts.find((a) => a.platform === "SHOPEE" && String(a.shopId) === String(shop_id));
    const tiktokAccount = accounts.find((a) => a.platform === "TIKTOK_SHOP");

    if (!shopeeAccount) {
      console.warn(`[Shopee Webhook] Account for shop ${shop_id} not found.`);
      return NextResponse.json({ code: 0, message: "Shop not registered" });
    }

    // Code 3: Order Status Update
    if (code === 3 && data?.ordersn) {
      const orderSn = data.ordersn;
      const orderStatus = data.status;
      console.log(`[Shopee Webhook] Order ${orderSn} status updated to: ${orderStatus}`);

      let plainToken = shopeeAccount.accessToken;
      try {
        plainToken = decryptToken(shopeeAccount.accessToken);
      } catch {}

      let tiktokToken = "";
      if (tiktokAccount) {
        try {
          tiktokToken = decryptToken(tiktokAccount.accessToken);
        } catch {
          tiktokToken = tiktokAccount.accessToken;
        }
      }

      // Fetch order detail from Shopee
      const partnerId = Number(process.env.SHOPEE_PARTNER_ID || "0");
      const timestamp = Math.floor(Date.now() / 1000);
      const apiPath = "/api/v2/order/get_order_detail";
      const sign = buildShopeeSign(apiPath, timestamp, { accessToken: plainToken, shopId: shopeeAccount.shopId });

      const params = new URLSearchParams({
        partner_id: String(partnerId),
        timestamp: String(timestamp),
        access_token: plainToken,
        shop_id: String(shopeeAccount.shopId),
        sign,
        order_sn_list: orderSn,
        response_optional_fields: "item_list,order_status",
      });

      const orderRes = await fetch(`${SHOPEE_BASE_URL}${apiPath}?${params.toString()}`);
      if (orderRes.ok) {
        const orderData = await orderRes.json();
        const orderInfo = orderData?.response?.order_list?.[0];
        const items = orderInfo?.item_list || [];

        const allMappings = await getProductMappings();

        for (const item of items) {
          const match = allMappings.find(
            (m) =>
              m.platform === "SHOPEE" &&
              String(m.marketplaceItemId) === String(item.item_id) &&
              (m.marketplaceModelId ? String(m.marketplaceModelId) === String(item.model_id) : true)
          );

          if (match) {
            const purchasedQty = item.model_quantity_purchased || item.active_qty || 1;
            const newStock = Math.max(0, match.websiteStock - purchasedQty);

            console.log(`[Shopee Webhook] Auto-deducting stock for SKU ${match.sku}: ${match.websiteStock} -> ${newStock}`);

            // 1. Update Shopee mapping record
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

            // 3. Propagate to TikTok Shop (Tokopedia) if product is mapped there!
            if (tiktokAccount) {
              const tiktokMatch = allMappings.find(
                (m) =>
                  m.platform === "TIKTOK_SHOP" &&
                  m.sku.trim().toUpperCase() === match.sku.trim().toUpperCase()
              );

              if (tiktokMatch) {
                console.log(`[Shopee Webhook] Propagating new stock (${newStock}) to TikTok Shop for SKU ${match.sku}...`);
                const tiktokRes = await updateTikTokShopStock(
                  tiktokToken,
                  tiktokAccount.shopId,
                  tiktokMatch.marketplaceItemId,
                  tiktokMatch.marketplaceModelId,
                  newStock
                );

                if (tiktokRes.success) {
                  await saveProductMapping({
                    ...tiktokMatch,
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
    }

    // Shopee expects { code: 0, message: "success" }
    return NextResponse.json({ code: 0, message: "success" });
  } catch (error) {
    console.error("[Shopee Webhook] Error:", error);
    return NextResponse.json({ code: 0, message: "handled with error" });
  }
}
