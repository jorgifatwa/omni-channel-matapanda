/**
 * marketplace-store.ts
 *
 * Resilient storage helper for MarketplaceAccount.
 * 1. Attempts to use Prisma PostgreSQL first.
 * 2. If the database is offline/unreachable, seamlessly falls back to
 *    a local JSON file (data/marketplace-accounts.json).
 *
 * This ensures marketplace connections remain persistent and functional
 * during local development even if Docker / PostgreSQL is not running.
 */

import fs from "fs";
import path from "path";
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

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "marketplace-accounts.json");

function ensureFileExists(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(STORE_FILE)) {
      fs.writeFileSync(STORE_FILE, JSON.stringify([]), "utf-8");
    }
  } catch (err) {
    console.warn("[MarketplaceStore] Failed to ensure store file:", err);
  }
}

function readFromFile(): StoredMarketplaceAccount[] {
  ensureFileExists();
  try {
    const raw = fs.readFileSync(STORE_FILE, "utf-8");
    return JSON.parse(raw) as StoredMarketplaceAccount[];
  } catch {
    return [];
  }
}

function writeToFile(accounts: StoredMarketplaceAccount[]): void {
  ensureFileExists();
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(accounts, null, 2), "utf-8");
  } catch (err) {
    console.error("[MarketplaceStore] Failed to write to store file:", err);
  }
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
  // 1. Try Prisma first
  try {
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
    console.log(`[MarketplaceStore] Saved to PostgreSQL: ${account.platform} ${account.shopId}`);
  } catch (dbErr) {
    console.warn("[MarketplaceStore] Database offline, saving to fallback JSON file:", dbErr);
  }

  // 2. Always keep the fallback JSON file synchronized
  try {
    const accounts = readFromFile();
    const nowIso = new Date().toISOString();
    const existingIndex = accounts.findIndex(
      (a) => a.platform === account.platform && a.shopId === account.shopId
    );

    const record: StoredMarketplaceAccount = {
      id: existingIndex >= 0 ? accounts[existingIndex].id : `mkt-${Date.now()}`,
      platform: account.platform,
      shopId: account.shopId,
      shopName: account.shopName,
      accessToken: account.accessToken,
      refreshToken: account.refreshToken,
      tokenExpiresAt: account.tokenExpiresAt.toISOString(),
      isActive: account.isActive,
      connectedAt: nowIso,
      connectedById: account.connectedById,
      connectedBy: {
        name: "Admin ZODIAC",
        email: process.env.ADMIN_DEFAULT_EMAIL || "jorgifatwaambia@gmail.com",
      },
      createdAt: existingIndex >= 0 ? accounts[existingIndex].createdAt : nowIso,
      updatedAt: nowIso,
    };

    if (existingIndex >= 0) {
      accounts[existingIndex] = record;
    } else {
      accounts.push(record);
    }

    writeToFile(accounts);
    console.log(`[MarketplaceStore] Successfully synced to JSON fallback: ${account.platform} ${account.shopId}`);
  } catch (err) {
    console.error("[MarketplaceStore] Fallback write error:", err);
  }
}

export async function getActiveMarketplaceAccounts(): Promise<StoredMarketplaceAccount[]> {
  // 1. Try Prisma first
  try {
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

    if (dbAccounts && dbAccounts.length > 0) {
      return dbAccounts.map((a) => ({
        ...a,
        tokenExpiresAt: a.tokenExpiresAt.toISOString(),
        connectedAt: a.connectedAt.toISOString(),
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      }));
    }
  } catch (dbErr) {
    console.warn("[MarketplaceStore] Database offline, reading from fallback JSON store:", dbErr);
  }

  // 2. Read from JSON fallback
  const fileAccounts = readFromFile();
  return fileAccounts.filter((a) => a.isActive);
}

export async function deactivateMarketplaceAccount(id: string): Promise<boolean> {
  let dbSuccess = false;
  try {
    await prisma.marketplaceAccount.update({
      where: { id },
      data: { isActive: false },
    });
    dbSuccess = true;
  } catch (dbErr) {
    console.warn("[MarketplaceStore] Database offline on deactivate:", dbErr);
  }

  // Update in file
  const accounts = readFromFile();
  const target = accounts.find((a) => a.id === id);
  if (target) {
    target.isActive = false;
    target.updatedAt = new Date().toISOString();
    writeToFile(accounts);
    return true;
  }

  return dbSuccess;
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

const MAPPINGS_FILE = path.join(DATA_DIR, "marketplace-product-mappings.json");

function ensureMappingsFileExists(): void {
  ensureFileExists();
  try {
    if (!fs.existsSync(MAPPINGS_FILE)) {
      fs.writeFileSync(MAPPINGS_FILE, JSON.stringify([]), "utf-8");
    }
  } catch (err) {
    console.warn("[MarketplaceStore] Failed to ensure mappings file:", err);
  }
}

function readMappingsFromFile(): StoredProductMapping[] {
  ensureMappingsFileExists();
  try {
    const raw = fs.readFileSync(MAPPINGS_FILE, "utf-8");
    return JSON.parse(raw) as StoredProductMapping[];
  } catch {
    return [];
  }
}

function writeMappingsToFile(mappings: StoredProductMapping[]): void {
  ensureMappingsFileExists();
  try {
    fs.writeFileSync(MAPPINGS_FILE, JSON.stringify(mappings, null, 2), "utf-8");
  } catch (err) {
    console.error("[MarketplaceStore] Failed to write to mappings file:", err);
  }
}

export async function getProductMappings(
  platform?: "SHOPEE" | "TIKTOK_SHOP"
): Promise<StoredProductMapping[]> {
  // 1. Try Prisma first if online
  try {
    const dbMappings = await prisma.marketplaceProductMap.findMany({
      where: platform ? { platform } : undefined,
      include: {
        product: { select: { name: true, stock: true, images: { select: { url: true }, take: 1 } } },
        variant: { select: { size: true, color: true, stock: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    if (dbMappings && dbMappings.length > 0) {
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
        marketplaceItemName: m.marketplaceItemName || m.product?.name || "Shopee Item",
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
  } catch {
    // Database offline, fall back to file
  }

  // 2. Read from JSON fallback
  const fileMappings = readMappingsFromFile();
  if (platform) {
    return fileMappings.filter((m) => m.platform === platform);
  }
  return fileMappings;
}

export async function saveProductMapping(
  mapping: Omit<StoredProductMapping, "id" | "createdAt" | "updatedAt"> & { id?: string }
): Promise<StoredProductMapping> {
  const nowIso = new Date().toISOString();
  const id = mapping.id || `map-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  // 1. Try Prisma
  try {
    await prisma.marketplaceProductMap.upsert({
      where: {
        marketplaceAccountId_marketplaceItemId_marketplaceModelId: {
          marketplaceAccountId: mapping.marketplaceAccountId,
          marketplaceItemId: mapping.marketplaceItemId,
          marketplaceModelId: mapping.marketplaceModelId || "",
        },
      },
      update: {
        productId: mapping.productId,
        variantId: mapping.variantId || null,
        marketplaceItemName: mapping.marketplaceItemName,
        marketplaceModelName: mapping.marketplaceModelName || null,
        sku: mapping.sku,
        autoSyncStock: mapping.autoSyncStock,
        lastSyncAt: mapping.lastSyncAt ? new Date(mapping.lastSyncAt) : null,
        lastSyncStatus: mapping.lastSyncStatus,
        lastSyncError: mapping.lastSyncError || null,
      },
      create: {
        id,
        marketplaceAccountId: mapping.marketplaceAccountId,
        platform: mapping.platform,
        productId: mapping.productId,
        variantId: mapping.variantId || null,
        marketplaceItemId: mapping.marketplaceItemId,
        marketplaceModelId: mapping.marketplaceModelId || null,
        marketplaceItemName: mapping.marketplaceItemName,
        marketplaceModelName: mapping.marketplaceModelName || null,
        sku: mapping.sku,
        autoSyncStock: mapping.autoSyncStock,
        lastSyncStatus: mapping.lastSyncStatus,
      },
    });
  } catch {
    // DB offline, continue to file
  }

  // 2. Sync to JSON file
  const mappings = readMappingsFromFile();
  const existingIdx = mappings.findIndex(
    (m) =>
      m.marketplaceAccountId === mapping.marketplaceAccountId &&
      m.marketplaceItemId === mapping.marketplaceItemId &&
      (m.marketplaceModelId || null) === (mapping.marketplaceModelId || null)
  );

  const fullRecord: StoredProductMapping = {
    ...mapping,
    id: existingIdx >= 0 ? mappings[existingIdx].id : id,
    createdAt: existingIdx >= 0 ? mappings[existingIdx].createdAt : nowIso,
    updatedAt: nowIso,
  };

  if (existingIdx >= 0) {
    mappings[existingIdx] = fullRecord;
  } else {
    mappings.push(fullRecord);
  }

  writeMappingsToFile(mappings);
  return fullRecord;
}

export async function deleteProductMapping(id: string): Promise<boolean> {
  let dbOk = false;
  try {
    await prisma.marketplaceProductMap.delete({ where: { id } });
    dbOk = true;
  } catch {
    // DB offline
  }

  const mappings = readMappingsFromFile();
  const filtered = mappings.filter((m) => m.id !== id);
  if (filtered.length !== mappings.length) {
    writeMappingsToFile(filtered);
    return true;
  }
  return dbOk;
}
