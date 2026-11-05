/**
 * Applies a paid marketplace order (Shopee / TikTok Shop) to website stock and
 * propagates the new stock to the other marketplace.
 *
 * Callers must only invoke this for the single "paid / ready to ship" status
 * of an order, so each order is deducted once. Stock is decremented
 * atomically so concurrent website and marketplace orders never overwrite
 * each other.
 */

import { prisma } from "@/lib/prisma";
import {
  getProductMappings,
  saveProductMapping,
  type StoredMarketplaceAccount,
  type StoredProductMapping,
} from "@/lib/marketplace-store";
import { decryptToken } from "@/lib/marketplace-crypto";
import { updateShopeeStock } from "@/lib/shopee-products";
import { updateTikTokShopStock } from "@/lib/tiktokshop-products";

export interface MarketplaceOrderItem {
  /** Shopee item_id / TikTok product id */
  itemId?: string | null;
  /** Shopee model_id / TikTok sku_id */
  modelId?: string | null;
  sellerSku?: string | null;
  quantity: number;
}

const norm = (v: string | null | undefined) => (v || "").trim().toUpperCase();

function findMapping(
  mappings: StoredProductMapping[],
  platform: "SHOPEE" | "TIKTOK_SHOP",
  item: MarketplaceOrderItem
): StoredProductMapping | undefined {
  return mappings.find((m) => {
    if (m.platform !== platform) return false;
    if (item.modelId && m.marketplaceModelId && String(m.marketplaceModelId) === String(item.modelId)) return true;
    if (
      item.itemId &&
      String(m.marketplaceItemId) === String(item.itemId) &&
      (!m.marketplaceModelId || !item.modelId)
    ) {
      return true;
    }
    return Boolean(item.sellerSku) && norm(m.sku) === norm(item.sellerSku);
  });
}

/** Atomically decrements website stock and returns the new stock of the mapped row. */
async function decrementWebsiteStock(mapping: StoredProductMapping, qty: number): Promise<number> {
  return prisma.$transaction(async (tx) => {
    if (mapping.variantId) {
      await tx.productVariant.updateMany({ where: { id: mapping.variantId }, data: { stock: { decrement: qty } } });
      await tx.productVariant.updateMany({ where: { id: mapping.variantId, stock: { lt: 0 } }, data: { stock: 0 } });
    }
    await tx.product.updateMany({ where: { id: mapping.productId }, data: { stock: { decrement: qty } } });
    await tx.product.updateMany({ where: { id: mapping.productId, stock: { lt: 0 } }, data: { stock: 0 } });

    if (mapping.variantId) {
      const v = await tx.productVariant.findUnique({ where: { id: mapping.variantId }, select: { stock: true } });
      if (v) return v.stock;
    }
    const p = await tx.product.findUnique({ where: { id: mapping.productId }, select: { stock: true } });
    return p?.stock ?? 0;
  });
}

function plainToken(account: StoredMarketplaceAccount): string {
  try {
    return decryptToken(account.accessToken);
  } catch {
    return account.accessToken;
  }
}

export async function applyMarketplaceOrderToStock(
  source: "SHOPEE" | "TIKTOK_SHOP",
  items: MarketplaceOrderItem[],
  otherAccount: StoredMarketplaceAccount | undefined
): Promise<{ deducted: number }> {
  const mappings = await getProductMappings();
  const otherPlatform = source === "SHOPEE" ? "TIKTOK_SHOP" : "SHOPEE";
  let deducted = 0;

  for (const item of items) {
    const qty = Math.max(1, Math.floor(Number(item.quantity) || 1));
    const match = findMapping(mappings, source, item);
    if (!match) continue;

    const newStock = await decrementWebsiteStock(match, qty);
    deducted++;
    const now = new Date().toISOString();
    console.log(`[Marketplace Order] ${source} order: SKU ${match.sku} -${qty} -> website stock ${newStock}`);

    // The source marketplace already reduced its own stock for this order.
    await saveProductMapping({
      ...match,
      websiteStock: newStock,
      marketplaceStock: newStock,
      lastSyncAt: now,
      lastSyncStatus: "SUCCESS",
      lastSyncError: null,
    });

    // Push the new stock to the other marketplace (same SKU)
    if (!otherAccount) continue;
    const other = mappings.find((m) => m.platform === otherPlatform && norm(m.sku) === norm(match.sku));
    if (!other) continue;

    const token = plainToken(otherAccount);
    const res =
      otherPlatform === "SHOPEE"
        ? await updateShopeeStock(token, otherAccount.shopId, other.marketplaceItemId, newStock, other.marketplaceModelId)
        : await updateTikTokShopStock(token, otherAccount.shopId, other.marketplaceItemId, other.marketplaceModelId, newStock);

    await saveProductMapping({
      ...other,
      websiteStock: newStock,
      marketplaceStock: res.success ? newStock : other.marketplaceStock,
      lastSyncAt: now,
      lastSyncStatus: res.success ? "SUCCESS" : "FAILED",
      lastSyncError: res.success ? null : res.error || "Gagal memperbarui stok",
    });
  }
  return { deducted };
}
