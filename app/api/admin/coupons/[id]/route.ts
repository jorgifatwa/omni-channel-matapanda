import { NextResponse } from "next/server";
import {
  DuplicateCouponCodeError,
  getCouponById,
  saveCoupon,
  deleteCoupon,
  toggleCouponActive,
} from "@/lib/coupon-store";
import { validateCouponBody } from "@/lib/coupon-admin-validation";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const coupon = await getCouponById(params.id);
    if (!coupon) {
      return NextResponse.json({ error: "Kupon tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ coupon });
  } catch (error) {
    console.error("[AdminCouponsAPI] Failed to get coupon:", error);
    return NextResponse.json(
      { error: "Gagal memuat data kupon dari database" },
      { status: 503 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Data kupon tidak valid" }, { status: 400 });
  }

  try {
    // Fast status toggle
    if (body.toggleOnly) {
      const updated = await toggleCouponActive(params.id, body.isActive);
      if (!updated) {
        return NextResponse.json({ error: "Kupon tidak ditemukan" }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        coupon: updated,
        message: `Status kupon berhasil diubah menjadi ${updated.isActive ? "Aktif" : "Nonaktif"}`,
      });
    }

    const validated = validateCouponBody(body);
    if ("error" in validated) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const updated = await saveCoupon({ ...validated.input, id: params.id });
    if (!updated) {
      return NextResponse.json({ error: "Kupon tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      coupon: updated,
      message: "Kupon berhasil diperbarui",
    });
  } catch (error) {
    if (error instanceof DuplicateCouponCodeError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("[AdminCouponsAPI] Failed to update coupon:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui kupon: database tidak tersedia" },
      { status: 503 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const success = await deleteCoupon(params.id);
    if (!success) {
      return NextResponse.json({ error: "Kupon tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: "Kupon berhasil dihapus" });
  } catch (error) {
    console.error("[AdminCouponsAPI] Failed to delete coupon:", error);
    return NextResponse.json(
      { error: "Gagal menghapus kupon: database tidak tersedia" },
      { status: 503 }
    );
  }
}
