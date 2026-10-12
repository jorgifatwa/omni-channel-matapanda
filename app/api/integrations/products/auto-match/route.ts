import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getActiveMarketplaceAccounts,
  getProductMappings,
  saveProductMapping,
} from "@/lib/marketplace-store";
import { fetchUnifiedShopeeProducts, type ShopeeProductItem } from "@/lib/shopee-products";
import { fetchUnifiedTikTokShopProducts, type TikTokShopProductItem } from "@/lib/tiktokshop-products";
import { decryptToken } from "@/lib/marketplace-crypto";
import { INITIAL_PRODUCTS } from "@/lib/admin-data";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let platform: "SHOPEE" | "TIKTOK_SHOP" = "SHOPEE";
  try {
    const body = await request.json();
    if (body.platform === "TIKTOK_SHOP") {
      platform = "TIKTOK_SHOP";
    }
  } catch {
    // If no body provided, check query param
    const { searchParams } = request.nextUrl;
    if (searchParams.get("platform") === "TIKTOK_SHOP") {
      platform = "TIKTOK_SHOP";
    }
  }

  try {
    const accounts = await getActiveMarketplaceAccounts();
    const account = accounts.find((a) => a.platform === platform);

    if (!account) {
      return NextResponse.json(
        { error: `Akun ${platform === "TIKTOK_SHOP" ? "TikTok Shop" : "Shopee"} belum terhubung.` },
        { status: 400 }
      );
    }

    // 1. Fetch marketplace items
    let plainToken = account.accessToken;
    try {
      plainToken = decryptToken(account.accessToken);
    } catch {}

    type MarketplaceItem = ShopeeProductItem | TikTokShopProductItem;
    let marketplaceItems: MarketplaceItem[] = [];

    if (platform === "SHOPEE") {
      marketplaceItems = await fetchUnifiedShopeeProducts(plainToken, account.shopId);
    } else {
      marketplaceItems = await fetchUnifiedTikTokShopProducts(plainToken, account.shopId);
    }

    // 2. Fetch Website products
    const websiteItems: Array<{
      productId: string;
      variantId?: string | null;
      productName: string;
      sku: string;
      size?: string | null;
      color?: string | null;
      stock: number;
      image: string;
    }> = [];

    try {
      const dbProducts = await prisma.product.findMany({
        where: { isActive: true },
        include: { variants: true, images: { take: 1 } },
      });
      if (dbProducts.length > 0) {
        for (const p of dbProducts) {
          const img = p.images?.[0]?.url || "";
          if (p.variants?.length) {
            for (const v of p.variants) {
              websiteItems.push({
                productId: p.id,
                variantId: v.id,
                productName: p.name,
                sku: v.sku || `${p.sku}-${v.size}`,
                size: v.size,
                color: v.color,
                stock: v.stock,
                image: img,
              });
            }
          } else {
            websiteItems.push({
              productId: p.id,
              variantId: null,
              productName: p.name,
              sku: p.sku,
              stock: p.stock,
              image: img,
            });
          }
        }
      }
    } catch {}

    if (websiteItems.length === 0) {
      for (const p of INITIAL_PRODUCTS) {
        const mainImg = p.images?.[0] || "";
        if (p.variants?.length) {
          for (const v of p.variants) {
            websiteItems.push({
              productId: p.id,
              variantId: v.id,
              productName: p.name,
              sku: v.sku,
              size: v.size,
              color: v.color,
              stock: v.stock,
              image: mainImg,
            });
          }
        } else {
          websiteItems.push({
            productId: p.id,
            variantId: null,
            productName: p.name,
            sku: p.sku,
            stock: p.stock,
            image: mainImg,
          });
        }
      }
    }

    // 3. Match by SKU
    let matchedCount = 0;
    const existingMappings = await getProductMappings(platform);

    for (const wItem of websiteItems) {
      const cleanWebSku = wItem.sku.trim().toUpperCase();

      // Check if already mapped to this platform
      const alreadyMapped = existingMappings.some(
        (m) =>
          (m.productId === wItem.productId &&
            (wItem.variantId ? m.variantId === wItem.variantId : true)) ||
          m.sku.trim().toUpperCase() === cleanWebSku
      );

      if (alreadyMapped) continue;

      // Find matching marketplace item by SKU
      const match = marketplaceItems.find(
        (s) => s.sku.trim().toUpperCase() === cleanWebSku
      );

      if (match) {
        await saveProductMapping({
          marketplaceAccountId: account.id,
          platform,
          productId: wItem.productId,
          productName: wItem.productName,
          productImage: wItem.image,
          variantId: wItem.variantId || null,
          variantSize: wItem.size || null,
          variantColor: wItem.color || null,
          marketplaceItemId: match.itemId,
          marketplaceModelId: match.modelId || null,
          marketplaceItemName: match.name,
          marketplaceModelName: match.modelName || null,
          marketplaceImage: match.image || null,
          sku: wItem.sku,
          autoSyncStock: true,
          websiteStock: wItem.stock,
          marketplaceStock: match.stock,
          lastSyncAt: new Date().toISOString(),
          lastSyncStatus: "SUCCESS",
        });
        matchedCount++;
      }
    }

    const platformName = platform === "TIKTOK_SHOP" ? "TikTok Shop (Tokopedia)" : "Shopee";

    return NextResponse.json({
      success: true,
      message:
        matchedCount > 0
          ? `Berhasil mencocokkan ${matchedCount} produk secara otomatis ke ${platformName} berdasarkan kesamaan SKU!`
          : `Semua produk ${platformName} yang SKU-nya cocok sudah terhubung sebelumnya.`,
      matchedCount,
    });
  } catch (error) {
    console.error("[Auto Match] Error:", error);
    return NextResponse.json({ error: "Gagal menjalankan auto-match" }, { status: 500 });
  }
}
