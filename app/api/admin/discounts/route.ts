import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getAllDiscounts,
  saveDiscount,
  type DiscountCampaign,
} from "@/lib/discount-store";

/**
 * GET /api/admin/discounts
 * List all promotional discount campaigns
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const discounts = getAllDiscounts();
    const nowIso = new Date().toISOString();

    const activeCount = discounts.filter(
      (d) => d.isActive && (!d.startDate || d.startDate <= nowIso) && (!d.endDate || d.endDate >= nowIso)
    ).length;

    const scheduledCount = discounts.filter(
      (d) => d.isActive && d.startDate && d.startDate > nowIso
    ).length;

    return NextResponse.json({
      success: true,
      discounts,
      meta: {
        total: discounts.length,
        activeCount,
        scheduledCount,
      },
    });
  } catch (error) {
    console.error("[Admin Discounts GET] Error:", error);
    return NextResponse.json({ error: "Gagal mengambil data diskon" }, { status: 500 });
  }
}

/**
 * POST /api/admin/discounts
 * Create or save a promotional discount campaign
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Partial<DiscountCampaign>;

    const isGift = body.campaignType === "GIFT_PACKAGE";

    if (!body.name) {
      return NextResponse.json(
        { error: "Nama promo wajib diisi" },
        { status: 400 }
      );
    }

    if (isGift && !body.giftProductId) {
      return NextResponse.json(
        { error: "Pilih produk hadiah untuk Paket Hadiah" },
        { status: 400 }
      );
    }

    if (!isGift) {
      if (!body.discountType || body.discountValue === undefined) {
        return NextResponse.json(
          { error: "Jenis diskon dan besaran diskon wajib diisi" },
          { status: 400 }
        );
      }

      if (body.discountType === "PERCENTAGE" && (Number(body.discountValue) <= 0 || Number(body.discountValue) > 100)) {
        return NextResponse.json(
          { error: "Diskon persentase harus antara 1% sampai 100%" },
          { status: 400 }
        );
      }

      if (body.discountType === "FIXED_AMOUNT" && Number(body.discountValue) <= 0) {
        return NextResponse.json(
          { error: "Potongan harga nominal harus lebih besar dari 0" },
          { status: 400 }
        );
      }
    }

    const saved = saveDiscount({
      id: body.id,
      name: body.name,
      description: body.description || "",
      bannerText: body.bannerText || "",
      campaignType: body.campaignType || "CATALOG_DISCOUNT",
      discountType: body.discountType || "FIXED_AMOUNT",
      discountValue: isGift ? 0 : Number(body.discountValue || 0),
      minSpend: body.minSpend !== undefined ? Number(body.minSpend) : undefined,
      maxDiscountAmount: body.maxDiscountAmount ? Number(body.maxDiscountAmount) : null,
      giftProductId: body.giftProductId || null,
      giftProductName: body.giftProductName || null,
      giftProductImage: body.giftProductImage || null,
      giftQuantity: body.giftQuantity ? Number(body.giftQuantity) : 1,
      targetType: body.targetType || "ALL_PRODUCTS",
      targetCategoryIds: Array.isArray(body.targetCategoryIds) ? body.targetCategoryIds : [],
      targetProductIds: Array.isArray(body.targetProductIds) ? body.targetProductIds : [],
      startDate: body.startDate || new Date().toISOString(),
      endDate: body.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      isActive: body.isActive !== undefined ? body.isActive : true,
    });

    return NextResponse.json({
      success: true,
      message: `Kampanye diskon "${saved.name}" berhasil disimpan!`,
      discount: saved,
    });
  } catch (error) {
    console.error("[Admin Discounts POST] Error:", error);
    return NextResponse.json({ error: "Gagal menyimpan kampanye diskon" }, { status: 500 });
  }
}
