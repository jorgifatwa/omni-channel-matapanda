import { NextResponse } from "next/server";
import { DuplicateCouponCodeError, getAllCoupons, saveCoupon } from "@/lib/coupon-store";
import { validateCouponBody } from "@/lib/coupon-admin-validation";

export async function GET() {
  try {
    const coupons = await getAllCoupons();
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
      { coupons: [], error: "Gagal memuat daftar kupon dari database" },
      { status: 503 }
    );
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const validated = validateCouponBody(body);
  if ("error" in validated) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const isUpdate = Boolean(body?.id);

  try {
    const saved = await saveCoupon({ ...validated.input, id: isUpdate ? String(body.id) : undefined });
    if (!saved) {
      return NextResponse.json({ error: "Kupon tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      coupon: saved,
      message: isUpdate ? "Kupon berhasil diperbarui" : "Kupon baru berhasil dibuat",
    });
  } catch (error) {
    if (error instanceof DuplicateCouponCodeError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("[AdminCouponsAPI] Failed to save coupon:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan kupon: database tidak tersedia" },
      { status: 503 }
    );
  }
}
