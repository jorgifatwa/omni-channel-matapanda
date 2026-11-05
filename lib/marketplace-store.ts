/**
 * marketplace-store.ts
 *
 * Storage helpers for MarketplaceAccount and MarketplaceProductMap.
 * PostgreSQL (via Prisma) is the single source of truth: there is no file or
 * in-memory fallback. Any database error is thrown to the caller so API routes
 * can respond with an error status instead of reporting a false success.
 */

import { prisma } from "@/lib/prisma";

export interface StoredMarketplaceAccount {
  id: string;
  platform: "SHOPEE" | "TIKTOK_SHOP";
  shopId: string;
  shopName: string | null;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: string; // ISO string
  isActive: boolean;
  connectedAt: string;    // ISO string
  connectedById: string;
  connectedBy?: { name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
}

export async function upsertMarketplaceAccount(account: {
  platform: "SHOPEE" | "TIKTOK_SHOP";
  shopId: string;
  shopName: string | null;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: Date;
  isActive: boolean;
  connectedById: string;
}): Promise<void> {
  await prisma.marketplaceAccount.upsert({
    where: {
      platform_shopId: {
        platform: account.platform,
        shopId: account.shopId,
      },
    },
    update: {
      shopName: account.shopName,
      accessToken: account.accessToken,
      refreshToken: account.refreshToken,
      tokenExpiresAt: account.tokenExpiresAt,
      isActive: account.isActive,
      connectedAt: new Date(),
      connectedById: account.connectedById,
    },
    create: {
      platform: account.platform,
      shopId: account.shopId,
      shopName: account.shopName,
      accessToken: account.accessToken,
      refreshToken: account.refreshToken,
      tokenExpiresAt: account.tokenExpiresAt,
      isActive: account.isActive,
      connectedById: account.connectedById,
    },
  });
}

export async function getActiveMarketplaceAccounts(): Promise<StoredMarketplaceAccount[]> {
  // Shopee access tokens expire every ~4 hours: refresh any that expire within
  // 10 minutes before handing them to API callers.
  const { refreshExpiringMarketplaceTokens } = await import("@/lib/marketplace-token-refresh");
  await refreshExpiringMarketplaceTokens(10 * 60 * 1000).catch((err) =>
    console.error("[Marketplace] Token refresh before API call failed:", err)
  );

  const dbAccounts = await prisma.marketplaceAccount.findMany({
    where: { isActive: true },
    select: {
      id: true,
      platform: true,
      shopId: true,
      shopName: true,
      accessToken: true,
      refreshToken: true,
      tokenExpiresAt: true,
      isActive: true,
      connectedAt: true,
      connectedById: true,
      createdAt: true,
      updatedAt: true,
      connectedBy: { select: { name: true, email: true } },
    },
    orderBy: { connectedAt: "desc" },
  });

  return dbAccounts.map((a) => ({
    ...a,
    tokenExpiresAt: a.tokenExpiresAt.toISOString(),
    connectedAt: a.connectedAt.toISOString(),
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  }));
}

/** Returns false when no account with this id exists. Throws on DB error. */
export async function deactivateMarketplaceAccount(id: string): Promise<boolean> {
  const result = await prisma.marketplaceAccount.updateMany({
    where: { id },
    data: { isActive: false },
  });
  return result.count > 0;
}

// ─── Product Mappings Storage ────────────────────────────────────────────────

export interface StoredProductMapping {
  id: string;
  marketplaceAccountId: string;
  platform: "SHOPEE" | "TIKTOK_SHOP";
  productId: string;
  productName: string;
  productImage?: string | null;
  variantId?: string | null;
  variantSize?: string | null;
  variantColor?: string | null;
  marketplaceItemId: string;
  marketplaceModelId?: string | null;
  marketplaceItemName: string;
  marketplaceModelName?: string | null;
  marketplaceImage?: string | null;
  sku: string;
  autoSyncStock: boolean;
  websiteStock: number;
  marketplaceStock: number;
  lastSyncAt: string | null;
  lastSyncStatus: "SUCCESS" | "FAILED" | "PENDING";
  lastSyncError?: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function getProductMappings(
  platform?: "SHOPEE" | "TIKTOK_SHOP"
): Promise<StoredProductMapping[]> {
  const dbMappings = await prisma.marketplaceProductMap.findMany({
    where: platform ? { platform } : undefined,
    include: {
      product: { select: { name: true, stock: true, images: { select: { url: true }, take: 1 } } },
      variant: { select: { size: true, color: true, stock: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return dbMappings.map((m) => ({
    id: m.id,
    marketplaceAccountId: m.marketplaceAccountId,
    platform: m.platform,
    productId: m.productId,
    productName: m.product?.name || m.marketplaceItemName || "Product",
    productImage: m.product?.images?.[0]?.url || null,
    variantId: m.variantId,
    variantSize: m.variant?.size || null,
    variantColor: m.variant?.color || null,
    marketplaceItemId: m.marketplaceItemId,
    marketplaceModelId: m.marketplaceModelId,
    marketplaceItemName: m.marketplaceItemName || m.product?.name || "Marketplace Item",
    marketplaceModelName: m.marketplaceModelName,
    sku: m.sku,
    autoSyncStock: m.autoSyncStock,
    websiteStock: m.variant?.stock ?? m.product?.stock ?? 0,
    marketplaceStock: 0,
    lastSyncAt: m.lastSyncAt ? m.lastSyncAt.toISOString() : null,
    lastSyncStatus: (m.lastSyncStatus as "SUCCESS" | "FAILED" | "PENDING") || "PENDING",
    lastSyncError: m.lastSyncError,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  }));
}

/**
 * Creates or updates a mapping identified by
 * (marketplaceAccountId, marketplaceItemId, marketplaceModelId).
 * marketplaceModelId is nullable, which a Prisma compound-unique `where`
 * cannot match, so the existing row is looked up explicitly. Throws on DB error.
 */
export async function saveProductMapping(
  mapping: Omit<StoredProductMapping, "id" | "createdAt" | "updatedAt"> & { id?: string }
): Promise<StoredProductMapping> {
  const modelId = mapping.marketplaceModelId || null;

  const existing = await prisma.marketplaceProductMap.findFirst({
    where: {
      marketplaceAccountId: mapping.marketplaceAccountId,
      marketplaceItemId: mapping.marketplaceItemId,
      marketplaceModelId: modelId,
    },
    select: { id: true },
  });

  const data = {
    productId: mapping.productId,
    variantId: mapping.variantId || null,
    marketplaceItemName: mapping.marketplaceItemName,
    marketplaceModelName: mapping.marketplaceModelName || null,
    sku: mapping.sku,
    autoSyncStock: mapping.autoSyncStock,
    lastSyncAt: mapping.lastSyncAt ? new Date(mapping.lastSyncAt) : null,
    lastSyncStatus: mapping.lastSyncStatus,
    lastSyncError: mapping.lastSyncError || null,
  };

  const saved = existing
    ? await prisma.marketplaceProductMap.update({ where: { id: existing.id }, data })
    : await prisma.marketplaceProductMap.create({
        data: {
          ...data,
          marketplaceAccountId: mapping.marketplaceAccountId,
          platform: mapping.platform,
          marketplaceItemId: mapping.marketplaceItemId,
          marketplaceModelId: modelId,
        },
      });

  return {
    ...mapping,
    id: saved.id,
    createdAt: saved.createdAt.toISOString(),
    updatedAt: saved.updatedAt.toISOString(),
  };
}

/** Returns false when no mapping with this id exists. Throws on DB error. */
export async function deleteProductMapping(id: string): Promise<boolean> {
  const result = await prisma.marketplaceProductMap.deleteMany({ where: { id } });
  return result.count > 0;
}
