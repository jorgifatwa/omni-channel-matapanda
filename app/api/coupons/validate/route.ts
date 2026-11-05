import { NextResponse } from "next/server";
import { validateAndApplyCoupon } from "@/lib/coupon-engine";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code, subtotal } = body;

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { valid: false, message: "Kode kupon wajib diisi.", discountAmount: 0 },
        { status: 400 }
      );
    }

    const currentSubtotal = typeof subtotal === "number" ? subtotal : Number(subtotal) || 0;
    let result;
    try {
      result = await validateAndApplyCoupon(code, currentSubtotal);
    } catch (dbErr) {
      console.error("[CouponValidateAPI] Database error:", dbErr);
      return NextResponse.json(
        {
          valid: false,
          error: "Kupon tidak dapat diperiksa karena database tidak tersedia. Silakan coba lagi.",
          message: "Kupon tidak dapat diperiksa karena database tidak tersedia. Silakan coba lagi.",
          discountAmount: 0,
        },
        { status: 503 }
      );
    }

    if (!result.valid) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[CouponValidateAPI] Error:", error);
    return NextResponse.json(
      { valid: false, message: "Terjadi kesalahan saat memvalidasi kupon.", discountAmount: 0 },
      { status: 500 }
    );
  }
}
