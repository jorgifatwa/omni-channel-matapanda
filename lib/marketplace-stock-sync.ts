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

export async function onWebsiteOrderPlaced(
  items: OrderItemToDeduct[],
  options: {
    /** True when the caller already reduced website stock (Midtrans webhook). */
    websiteStockAlreadyDeducted?: boolean;
  } = {}
): Promise<{
  success: boolean;
  deductedCount: number;
}> {
  try {
    const accounts = await getActiveMarketplaceAccounts();
    const shopeeAccount = accounts.find((a) => a.platform === "SHOPEE");
    const tiktokAccount = accounts.find((a) => a.platform === "TIKTOK_SHOP");

    if (!shopeeAccount && !tiktokAccount) {
      // Nothing to propagate; not an error
      return { success: true, deductedCount: 0 };
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
      const qty = Math.max(1, Number(item.quantity) || 1);

      // Website DB is the source of truth. Deduct atomically if the caller
      // has not done it yet, then read the real current stock.
      if (!options.websiteStockAlreadyDeducted) {
        if (item.variantId) {
          await prisma.productVariant.updateMany({ where: { id: item.variantId }, data: { stock: { decrement: qty } } });
          await prisma.productVariant.updateMany({ where: { id: item.variantId, stock: { lt: 0 } }, data: { stock: 0 } });
        }
        if (item.productId) {
          await prisma.product.updateMany({ where: { id: item.productId }, data: { stock: { decrement: qty } } });
          await prisma.product.updateMany({ where: { id: item.productId, stock: { lt: 0 } }, data: { stock: 0 } });
        }
      }

      const matches = allMappings.filter(
        (m) =>
          m.sku.trim().toUpperCase() === cleanSku ||
          (item.productId &&
            m.productId === item.productId &&
            (item.variantId ? m.variantId === item.variantId : true))
      );

      for (const match of matches) {
        const currentRow = match.variantId
          ? await prisma.productVariant.findUnique({ where: { id: match.variantId }, select: { stock: true } })
          : await prisma.product.findUnique({ where: { id: match.productId }, select: { stock: true } });
        const newStock = Math.max(0, currentRow?.stock ?? 0);

        console.log(
          `[Omnichannel Sync] Website order for SKU ${match.sku} (Qty: ${qty}). Updating ${match.platform} stock to ${newStock}...`
        );

        let res: { success: boolean; error?: string } = { success: false, error: "Akun marketplace tidak terhubung" };
        if (match.platform === "SHOPEE" && shopeeAccount) {
          res = await updateShopeeStock(
            shopeeToken,
            shopeeAccount.shopId,
            match.marketplaceItemId,
            newStock,
            match.marketplaceModelId
          );
        } else if (match.platform === "TIKTOK_SHOP" && tiktokAccount) {
          res = await updateTikTokShopStock(
            tiktokToken,
            tiktokAccount.shopId,
            match.marketplaceItemId,
            match.marketplaceModelId,
            newStock
          );
        }
        if (!res.success) {
          console.warn(`[Omnichannel Sync] Failed to update ${match.platform} stock for ${match.sku}:`, res.error);
        }

        await saveProductMapping({
          ...match,
          websiteStock: newStock,
          marketplaceStock: res.success ? newStock : match.marketplaceStock,
          lastSyncAt: new Date().toISOString(),
          lastSyncStatus: res.success ? "SUCCESS" : "FAILED",
          lastSyncError: res.success ? null : res.error || "Gagal memperbarui stok",
        });
        if (res.success) deductedCount++;
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
