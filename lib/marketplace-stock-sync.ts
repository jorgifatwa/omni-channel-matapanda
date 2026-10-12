/**
 * marketplace-stock-sync.ts
 *
 * Real-time stock propagation when an order occurs on the it's matapanda website.
 * Whenever a customer buys on the website, this helper immediately pushes
 * the reduced stock to Shopee (and other connected marketplaces) to prevent overselling.
 */

import {
  getActiveMarketplaceAccounts,
  getProductMappings,
  saveProductMapping,
} from "@/lib/marketplace-store";
import { updateShopeeStock } from "@/lib/shopee-products";
import { updateTikTokShopStock } from "@/lib/tiktokshop-products";
import { decryptToken } from "@/lib/marketplace-crypto";
import { prisma } from "@/lib/prisma";

export interface OrderItemToDeduct {
  productId?: string;
  variantId?: string | null;
  sku: string;
  quantity: number;
}

export async function onWebsiteOrderPlaced(items: OrderItemToDeduct[]): Promise<{
  success: boolean;
  deductedCount: number;
}> {
  try {
    const accounts = await getActiveMarketplaceAccounts();
    const shopeeAccount = accounts.find((a) => a.platform === "SHOPEE");
    const tiktokAccount = accounts.find((a) => a.platform === "TIKTOK_SHOP");

    if (!shopeeAccount && !tiktokAccount) {
      return { success: false, deductedCount: 0 };
    }

    let shopeeToken = "";
    if (shopeeAccount) {
      try {
        shopeeToken = decryptToken(shopeeAccount.accessToken);
      } catch {
        shopeeToken = shopeeAccount.accessToken;
      }
    }

    let tiktokToken = "";
    if (tiktokAccount) {
      try {
        tiktokToken = decryptToken(tiktokAccount.accessToken);
      } catch {
        tiktokToken = tiktokAccount.accessToken;
      }
    }

    const allMappings = await getProductMappings();
    let deductedCount = 0;

    for (const item of items) {
      const cleanSku = item.sku.trim().toUpperCase();
      const matches = allMappings.filter(
        (m) =>
          m.sku.trim().toUpperCase() === cleanSku ||
          (item.productId &&
            m.productId === item.productId &&
            (item.variantId ? m.variantId === item.variantId : true))
      );

      for (const match of matches) {
        const qty = Number(item.quantity) || 1;
        const newStock = Math.max(0, match.websiteStock - qty);

        console.log(
          `[Omnichannel Sync] Website order for SKU ${match.sku} (Qty: ${qty}). Updating ${match.platform} stock to ${newStock}...`
        );

        let updateSuccess = false;

        // 1. Push to Shopee
        if (match.platform === "SHOPEE" && shopeeAccount) {
          const shopeeRes = await updateShopeeStock(
            shopeeToken,
            shopeeAccount.shopId,
            match.marketplaceItemId,
            newStock,
            match.marketplaceModelId
          );
          updateSuccess = shopeeRes.success;
          if (!shopeeRes.success) {
            console.warn(
              `[Omnichannel Sync] Failed to update Shopee stock for ${match.sku}:`,
              shopeeRes.error
            );
          }
        }

        // 2. Push to TikTok Shop (Tokopedia)
        if (match.platform === "TIKTOK_SHOP" && tiktokAccount) {
          const tiktokRes = await updateTikTokShopStock(
            tiktokToken,
            tiktokAccount.shopId,
            match.marketplaceItemId,
            match.marketplaceModelId,
            newStock
          );
          updateSuccess = tiktokRes.success;
        }

        if (updateSuccess) {
          // 3. Update mapping record
          await saveProductMapping({
            ...match,
            websiteStock: newStock,
            marketplaceStock: newStock,
            lastSyncAt: new Date().toISOString(),
            lastSyncStatus: "SUCCESS",
            lastSyncError: null,
          });

          // 4. Update database if Prisma is connected
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

          deductedCount++;
        }
      }
    }

    return { success: true, deductedCount };
  } catch (err) {
    console.error(
      "[Omnichannel Sync] Failed to propagate website order to marketplaces:",
      err
    );
    return { success: false, deductedCount: 0 };
  }
}
