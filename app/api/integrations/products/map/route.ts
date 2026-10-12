import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  saveProductMapping,
  deleteProductMapping,
  getActiveMarketplaceAccounts,
} from "@/lib/marketplace-store";

/**
 * POST /api/integrations/products/map
 * Hubungkan produk website dengan produk Shopee secara manual.
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      productId,
      productName,
      productImage,
      variantId,
      variantSize,
      variantColor,
      marketplaceItemId,
      marketplaceModelId,
      marketplaceItemName,
      marketplaceModelName,
      sku,
      websiteStock,
      marketplaceStock,
    } = body;

    if (!productId || !marketplaceItemId || !sku) {
      return NextResponse.json(
        { error: "Parameter tidak lengkap (productId, marketplaceItemId, sku wajib diisi)" },
        { status: 400 }
      );
    }

    const platform = (body.platform === "TIKTOK_SHOP" ? "TIKTOK_SHOP" : "SHOPEE") as "SHOPEE" | "TIKTOK_SHOP";
    const accounts = await getActiveMarketplaceAccounts();
    const targetAccount = accounts.find((a) => a.platform === platform);

    if (!targetAccount) {
      return NextResponse.json(
        { error: `Akun ${platform === "TIKTOK_SHOP" ? "TikTok Shop" : "Shopee"} belum terhubung.` },
        { status: 400 }
      );
    }

    const platformLabel = platform === "TIKTOK_SHOP" ? "TikTok Shop" : "Shopee";

    const mapping = await saveProductMapping({
      marketplaceAccountId: targetAccount.id,
      platform,
      productId,
      productName: productName || "Product",
      productImage: productImage || null,
      variantId: variantId || null,
      variantSize: variantSize || null,
      variantColor: variantColor || null,
      marketplaceItemId: String(marketplaceItemId),
      marketplaceModelId: marketplaceModelId ? String(marketplaceModelId) : null,
      marketplaceItemName: marketplaceItemName || `${platformLabel} Item`,
      marketplaceModelName: marketplaceModelName || null,
      sku,
      autoSyncStock: true,
      websiteStock: Number(websiteStock) || 0,
      marketplaceStock: Number(marketplaceStock) || 0,
      lastSyncAt: new Date().toISOString(),
      lastSyncStatus: "SUCCESS",
    });

    return NextResponse.json({
      success: true,
      message: `Produk "${sku}" berhasil dihubungkan dengan ${platformLabel}.`,
      mapping,
    });
  } catch (error) {
    console.error("[Map Product] Error:", error);
    return NextResponse.json({ error: "Gagal menghubungkan produk" }, { status: 500 });
  }
}

/**
 * DELETE /api/integrations/products/map?id=<mapping_id>
 * Putuskan relasi pemetaan produk.
 */
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing mapping id" }, { status: 400 });
  }

  try {
    await deleteProductMapping(id);
    return NextResponse.json({
      success: true,
      message: "Pemetaan produk berhasil diputus.",
    });
  } catch (error) {
    console.error("[Unmap Product] Error:", error);
    return NextResponse.json({ error: "Gagal memutuskan relasi produk" }, { status: 500 });
  }
}
