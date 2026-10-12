import { NextResponse } from "next/server";
import { getAllCoupons, saveCoupon } from "@/lib/coupon-store";

export async function GET() {
  try {
    const coupons = getAllCoupons();
    const nowIso = new Date().toISOString();

    const totalCoupons = coupons.length;
    const activeCoupons = coupons.filter(
      (c) => c.isActive && (!c.startDate || c.startDate <= nowIso) && (!c.endDate || c.endDate >= nowIso)
    ).length;
    const totalUses = coupons.reduce((sum, c) => sum + (c.usageCount || 0), 0);
    const expiredCoupons = coupons.filter((c) => c.endDate && c.endDate < nowIso).length;

    return NextResponse.json({
      coupons,
      meta: {
        total: totalCoupons,
        active: activeCoupons,
        totalUses,
        expired: expiredCoupons,
      },
    });
  } catch (error) {
    console.error("[AdminCouponsAPI] Failed to fetch coupons:", error);
    return NextResponse.json(
      { error: "Gagal mengambil daftar kupon" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.code || !body.code.trim()) {
      return NextResponse.json(
        { error: "Kode kupon wajib diisi" },
        { status: 400 }
      );
    }

    if (!body.name || !body.name.trim()) {
      return NextResponse.json(
        { error: "Nama kupon / influencer wajib diisi" },
        { status: 400 }
      );
    }

    if (!body.discountType || !["PERCENTAGE", "FIXED_AMOUNT"].includes(body.discountType)) {
      return NextResponse.json(
        { error: "Tipe diskon harus PERCENTAGE atau FIXED_AMOUNT" },
        { status: 400 }
      );
    }

    const discountVal = Number(body.discountValue);
    if (isNaN(discountVal) || discountVal <= 0) {
      return NextResponse.json(
        { error: "Nilai diskon harus lebih besar dari 0" },
        { status: 400 }
      );
    }

    if (body.discountType === "PERCENTAGE" && discountVal > 100) {
      return NextResponse.json(
        { error: "Diskon persentase tidak boleh lebih dari 100%" },
        { status: 400 }
      );
    }

    const saved = saveCoupon({
      id: body.id,
      code: body.code,
      name: body.name,
      description: body.description,
      discountType: body.discountType,
      discountValue: discountVal,
      minSpend: Number(body.minSpend) || 0,
      maxDiscount: body.maxDiscount ? Number(body.maxDiscount) : null,
      usageLimit: body.usageLimit ? Number(body.usageLimit) : null,
      startDate: body.startDate,
      endDate: body.endDate,
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
    });

    return NextResponse.json({
      success: true,
      coupon: saved,
      message: body.id ? "Kupon berhasil diperbarui" : "Kupon baru berhasil dibuat",
    });
  } catch (error) {
    console.error("[AdminCouponsAPI] Failed to save coupon:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan kupon" },
      { status: 500 }
    );
  }
}
