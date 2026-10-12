import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { INITIAL_PRODUCTS } from "@/lib/admin-data";
import {
  getActiveMarketplaceAccounts,
  getProductMappings,
  saveProductMapping,
} from "@/lib/marketplace-store";
import { updateShopeeStock, fetchUnifiedShopeeProducts } from "@/lib/shopee-products";
import { updateTikTokShopStock, fetchUnifiedTikTokShopProducts } from "@/lib/tiktokshop-products";
import { decryptToken } from "@/lib/marketplace-crypto";

/**
 * POST /api/integrations/products/sync-stock
 * Sinkronisasi stok dari website ke marketplace (Shopee / TikTok Shop).
 * Mendukung live stock dari payload (body.stock / body.items), database, maupun catalog.
 */
export async function POST(request: Request) {
  // Support both Admin Session and Automated Cron Secret
  const authHeader = request.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;
  const isCron = !!(cronSecret && authHeader === `Bearer ${cronSecret}`);

  if (!isCron) {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { mappingId, platform: reqPlatform } = body;

    const accounts = await getActiveMarketplaceAccounts();
    const shopeeAccount = accounts.find((a) => a.platform === "SHOPEE");
    const tiktokAccount = accounts.find((a) => a.platform === "TIKTOK_SHOP");

    if (!shopeeAccount && !tiktokAccount) {
      return NextResponse.json(
        { error: "Belum ada akun marketplace yang terhubung." },
        { status: 400 }
      );
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
    let targets = allMappings;

    if (mappingId) {
      targets = allMappings.filter((m) => m.id === mappingId);
    } else if (reqPlatform) {
      targets = allMappings.filter((m) => m.platform === reqPlatform && m.autoSyncStock);
    } else {
      targets = allMappings.filter((m) => m.autoSyncStock);
    }

    if (targets.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Tidak ada produk yang perlu disinkronkan.",
        syncedCount: 0,
      });
    }

    // Direction: "SMART" (default), "PULL_FROM_MARKETPLACE", or "PUSH_TO_MARKETPLACE"
    const direction = body.direction || "SMART";

    // Live products cache
    let liveShopeeProducts: Array<{ itemId: string; modelId?: string | null; stock: number }> = [];
    if (shopeeAccount && targets.some((t) => t.platform === "SHOPEE")) {
      try {
        liveShopeeProducts = await fetchUnifiedShopeeProducts(shopeeToken, shopeeAccount.shopId);
      } catch (err) {
        console.warn("[Sync Stock] Failed to fetch live Shopee products:", err);
      }
    }

    let liveTikTokProducts: Array<{ itemId: string; modelId?: string | null; stock: number }> = [];
    if (tiktokAccount && targets.some((t) => t.platform === "TIKTOK_SHOP")) {
      try {
        liveTikTokProducts = await fetchUnifiedTikTokShopProducts(tiktokToken, tiktokAccount.shopId);
      } catch (err) {
        console.warn("[Sync Stock] Failed to fetch live TikTok products:", err);
      }
    }

    // Map any live stocks explicitly passed from frontend UI
    const clientStockMap = new Map<string, number>();
    if (Array.isArray(body.items)) {
      for (const it of body.items) {
        if (it.sku && typeof it.stock === "number") {
          clientStockMap.set(String(it.sku).trim().toUpperCase(), it.stock);
        }
        if (it.mappingId && typeof it.stock === "number") {
          clientStockMap.set(String(it.mappingId), it.stock);
        }
      }
    }
    if (typeof body.stock === "number" && mappingId) {
      clientStockMap.set(mappingId, body.stock);
    }

    let syncedCount = 0;
    const errors: string[] = [];

    for (const item of targets) {
      try {
        // 1. Resolve current website stock
        let currentStock = item.websiteStock;

        if (clientStockMap.has(item.id)) {
          currentStock = clientStockMap.get(item.id)!;
        } else if (clientStockMap.has(item.sku.trim().toUpperCase())) {
          currentStock = clientStockMap.get(item.sku.trim().toUpperCase())!;
        } else {
          try {
            if (item.variantId) {
              const v = await prisma.productVariant.findUnique({ where: { id: item.variantId } });
              if (v) currentStock = v.stock;
            } else if (item.productId) {
              const p = await prisma.product.findUnique({ where: { id: item.productId } });
              if (p) currentStock = p.stock;
            }
          } catch {
            const initP = INITIAL_PRODUCTS.find((p) => p.id === item.productId || p.sku === item.sku);
            if (initP) {
              if (item.variantId && initP.variants?.length) {
                const initV = initP.variants.find((v) => v.id === item.variantId || v.sku === item.sku);
                if (initV) currentStock = initV.stock;
              } else {
                currentStock = initP.stock;
              }
            }
          }
        }

        // 2. Check live stock from the specific marketplace
        let targetStock = currentStock;

        if (item.platform === "SHOPEE") {
          const liveShopee = liveShopeeProducts.find(
            (s) =>
              s.itemId === item.marketplaceItemId &&
              (item.marketplaceModelId ? s.modelId === item.marketplaceModelId : true)
          );

          if (direction === "PULL_FROM_MARKETPLACE" || direction === "SMART") {
            if (liveShopee && typeof liveShopee.stock === "number") {
              targetStock = liveShopee.stock;
            }
          }

          if (shopeeAccount) {
            const updateRes = await updateShopeeStock(
              shopeeToken,
              shopeeAccount.shopId,
              item.marketplaceItemId,
              targetStock,
              item.marketplaceModelId
            );

            if (updateRes.success) {
              await saveProductMapping({
                ...item,
                websiteStock: targetStock,
                marketplaceStock: targetStock,
                lastSyncAt: new Date().toISOString(),
                lastSyncStatus: "SUCCESS",
                lastSyncError: null,
              });
              syncedCount++;
            } else {
              await saveProductMapping({
                ...item,
                websiteStock: targetStock,
                lastSyncAt: new Date().toISOString(),
                lastSyncStatus: "FAILED",
                lastSyncError: updateRes.error || "Gagal update stok di Shopee",
              });
              errors.push(`[Shopee: ${item.sku}] ${updateRes.error}`);
            }
          }
        } else if (item.platform === "TIKTOK_SHOP") {
          const liveTikTok = liveTikTokProducts.find(
            (s) =>
              s.itemId === item.marketplaceItemId &&
              (item.marketplaceModelId ? s.modelId === item.marketplaceModelId : true)
          );

          if (direction === "PULL_FROM_MARKETPLACE" || direction === "SMART") {
            if (liveTikTok && typeof liveTikTok.stock === "number") {
              targetStock = liveTikTok.stock;
            }
          }

          if (tiktokAccount) {
            const updateRes = await updateTikTokShopStock(
              tiktokToken,
              tiktokAccount.shopId,
              item.marketplaceItemId,
              item.marketplaceModelId,
              targetStock
            );

            if (updateRes.success) {
              await saveProductMapping({
                ...item,
                websiteStock: targetStock,
                marketplaceStock: targetStock,
                lastSyncAt: new Date().toISOString(),
                lastSyncStatus: "SUCCESS",
                lastSyncError: null,
              });
              syncedCount++;
            } else {
              await saveProductMapping({
                ...item,
                websiteStock: targetStock,
                lastSyncAt: new Date().toISOString(),
                lastSyncStatus: "FAILED",
                lastSyncError: updateRes.error || "Gagal update stok di TikTok Shop",
              });
              errors.push(`[TikTok: ${item.sku}] ${updateRes.error}`);
            }
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`[${item.sku}] ${msg}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil menyinkronkan stok ${syncedCount} produk! Stok telah diselaraskan.`,
      syncedCount,
      failedCount: targets.length - syncedCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("[Sync Stock] Error:", error);
    return NextResponse.json({ error: "Gagal menyinkronkan stok" }, { status: 500 });
  }
}
