import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { INITIAL_PRODUCTS } from "@/lib/admin-data";
import {
  getActiveMarketplaceAccounts,
  getProductMappings,
  type StoredProductMapping,
} from "@/lib/marketplace-store";
import { fetchUnifiedShopeeProducts, type ShopeeProductItem } from "@/lib/shopee-products";
import { fetchUnifiedTikTokShopProducts, type TikTokShopProductItem } from "@/lib/tiktokshop-products";
import { decryptToken } from "@/lib/marketplace-crypto";

export interface FlatWebsiteProduct {
  productId: string;
  variantId?: string | null;
  productName: string;
  sku: string;
  size?: string | null;
  color?: string | null;
  price: number;
  stock: number;
  image: string;
  mapping?: StoredProductMapping | null;
}

export type UnifiedMarketplaceItem = ShopeeProductItem | TikTokShopProductItem;

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const rawPlatform = (searchParams.get("platform") || "SHOPEE").toUpperCase();
  const platform = (rawPlatform === "TIKTOK_SHOP" ? "TIKTOK_SHOP" : "SHOPEE") as "SHOPEE" | "TIKTOK_SHOP";

  try {
    // 1. Get active marketplace accounts
    const accounts = await getActiveMarketplaceAccounts();
    const shopeeAccount = accounts.find((a) => a.platform === "SHOPEE");
    const tiktokAccount = accounts.find((a) => a.platform === "TIKTOK_SHOP");
    const currentAccount = platform === "TIKTOK_SHOP" ? tiktokAccount : shopeeAccount;

    // 2. Fetch existing mappings for active platform & overall counts
    const platformMappings = await getProductMappings(platform);
    const allMappings = await getProductMappings();
    const shopeeMappedCount = allMappings.filter((m) => m.platform === "SHOPEE").length;
    const tiktokMappedCount = allMappings.filter((m) => m.platform === "TIKTOK_SHOP").length;

    // 3. Get website products (Prisma with fallback to INITIAL_PRODUCTS)
    const websiteProducts: FlatWebsiteProduct[] = [];
    try {
      const dbProducts = await prisma.product.findMany({
        where: { isActive: true },
        include: {
          variants: true,
          images: { take: 1, orderBy: { isPrimary: "desc" } },
        },
      });

      if (dbProducts && dbProducts.length > 0) {
        for (const p of dbProducts) {
          const mainImg = p.images?.[0]?.url || "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80";
          if (p.variants && p.variants.length > 0) {
            for (const v of p.variants) {
              const sku = v.sku || `${p.sku}-${v.size}`;
              websiteProducts.push({
                productId: p.id,
                variantId: v.id,
                productName: p.name,
                sku,
                size: v.size,
                color: v.color,
                price: Number(p.price),
                stock: v.stock,
                image: mainImg,
              });
            }
          } else {
            websiteProducts.push({
              productId: p.id,
              variantId: null,
              productName: p.name,
              sku: p.sku,
              price: Number(p.price),
              stock: p.stock,
              image: mainImg,
            });
          }
        }
      }
    } catch {
      // DB offline, use INITIAL_PRODUCTS
    }

    // Fallback if DB was empty
    if (websiteProducts.length === 0) {
      for (const p of INITIAL_PRODUCTS) {
        const mainImg = p.images?.[0] || "";
        if (p.variants && p.variants.length > 0) {
          for (const v of p.variants) {
            websiteProducts.push({
              productId: p.id,
              variantId: v.id,
              productName: p.name,
              sku: v.sku,
              size: v.size,
              color: v.color,
              price: p.price,
              stock: v.stock,
              image: mainImg,
            });
          }
        } else {
          websiteProducts.push({
            productId: p.id,
            variantId: null,
            productName: p.name,
            sku: p.sku,
            price: p.price,
            stock: p.stock,
            image: mainImg,
          });
        }
      }
    }

    // 4. Fetch live marketplace products for active platform
    let marketplaceProducts: UnifiedMarketplaceItem[] = [];

    if (platform === "SHOPEE" && shopeeAccount) {
      try {
        let plainToken = shopeeAccount.accessToken;
        try {
          plainToken = decryptToken(shopeeAccount.accessToken);
        } catch {}
        marketplaceProducts = await fetchUnifiedShopeeProducts(plainToken, shopeeAccount.shopId);
      } catch (err) {
        console.warn("[Mappings API] Failed to fetch live Shopee products:", err);
      }
    } else if (platform === "TIKTOK_SHOP" && tiktokAccount) {
      try {
        let plainToken = tiktokAccount.accessToken;
        try {
          plainToken = decryptToken(tiktokAccount.accessToken);
        } catch {}
        marketplaceProducts = await fetchUnifiedTikTokShopProducts(plainToken, tiktokAccount.shopId);
      } catch (err) {
        console.warn("[Mappings API] Failed to fetch live TikTok Shop products:", err);
      }
    }

    // 5. Attach mapping and live marketplace stock info to website products
    const mappedWebsiteProducts = websiteProducts.map((wp) => {
      const match = platformMappings.find(
        (m) =>
          (m.productId === wp.productId &&
            (wp.variantId ? m.variantId === wp.variantId : true)) ||
          m.sku.toUpperCase() === wp.sku.toUpperCase()
      );

      let liveMarketplaceStock = match?.marketplaceStock ?? 0;
      if (match) {
        const liveItem = marketplaceProducts.find(
          (s) =>
            s.itemId === match.marketplaceItemId &&
            (match.marketplaceModelId ? s.modelId === match.marketplaceModelId : true)
        );
        if (liveItem) {
          liveMarketplaceStock = liveItem.stock;
        }
      }

      return {
        ...wp,
        stock: match?.websiteStock ?? wp.stock,
        mapping: match
          ? {
              ...match,
              marketplaceStock: liveMarketplaceStock,
            }
          : null,
      };
    });

    return NextResponse.json({
      success: true,
      platform,
      // Platform statuses
      hasShopeeConnected: !!shopeeAccount,
      shopeeShopName: shopeeAccount?.shopName || null,
      shopeeShopId: shopeeAccount?.shopId || null,
      shopeeMappedCount,

      hasTikTokConnected: !!tiktokAccount,
      tiktokShopName: tiktokAccount?.shopName || null,
      tiktokShopId: tiktokAccount?.shopId || null,
      tiktokMappedCount,

      currentAccount: currentAccount
        ? {
            id: currentAccount.id,
            platform: currentAccount.platform,
            shopName: currentAccount.shopName,
            shopId: currentAccount.shopId,
          }
        : null,

      websiteProducts: mappedWebsiteProducts,
      marketplaceProducts,
      shopeeProducts: marketplaceProducts, // Backward compatibility
      totalMapped: platformMappings.length,
      totalWebsiteItems: mappedWebsiteProducts.length,
    });
  } catch (error) {
    console.error("[Mappings API] Error:", error);
    return NextResponse.json({ error: "Gagal memuat data pemetaan produk" }, { status: 500 });
  }
}
