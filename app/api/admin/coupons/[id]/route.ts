import { NextResponse } from "next/server";
import {
  getCouponById,
  saveCoupon,
  deleteCoupon,
  toggleCouponActive,
} from "@/lib/coupon-store";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const coupon = getCouponById(params.id);
    if (!coupon) {
      return NextResponse.json({ error: "Kupon tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ coupon });
  } catch (error) {
    console.error("[AdminCouponsAPI] Failed to get coupon:", error);
    return NextResponse.json({ error: "Gagal mengambil data kupon" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();

    // Fast status toggle
    if (body.toggleOnly) {
      const updated = toggleCouponActive(params.id, body.isActive);
      if (!updated) {
        return NextResponse.json({ error: "Kupon tidak ditemukan" }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        coupon: updated,
        message: `Status kupon berhasil diubah menjadi ${updated.isActive ? "Aktif" : "Nonaktif"}`,
      });
    }

    const updated = saveCoupon({
      id: params.id,
      code: body.code,
      name: body.name,
      description: body.description,
      discountType: body.discountType,
      discountValue: Number(body.discountValue),
      minSpend: Number(body.minSpend) || 0,
      maxDiscount: body.maxDiscount ? Number(body.maxDiscount) : null,
      usageLimit: body.usageLimit ? Number(body.usageLimit) : null,
      startDate: body.startDate,
      endDate: body.endDate,
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
    });

    return NextResponse.json({
      success: true,
      coupon: updated,
      message: "Kupon berhasil diperbarui",
    });
  } catch (error) {
    console.error("[AdminCouponsAPI] Failed to update coupon:", error);
    return NextResponse.json({ error: "Gagal memperbarui kupon" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const success = deleteCoupon(params.id);
    if (!success) {
      return NextResponse.json({ error: "Kupon tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: "Kupon berhasil dihapus" });
  } catch (error) {
    console.error("[AdminCouponsAPI] Failed to delete coupon:", error);
    return NextResponse.json({ error: "Gagal menghapus kupon" }, { status: 500 });
  }
}
