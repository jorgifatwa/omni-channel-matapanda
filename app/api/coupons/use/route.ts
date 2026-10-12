import { NextResponse } from "next/server";
import { incrementCouponUsage } from "@/lib/coupon-store";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json({ error: "Kode kupon wajib diisi" }, { status: 400 });
    }

    const success = incrementCouponUsage(code);
    return NextResponse.json({ success });
  } catch (error) {
    console.error("[CouponUseAPI] Error:", error);
    return NextResponse.json({ error: "Gagal mencatat pemakaian kupon" }, { status: 500 });
  }
}
