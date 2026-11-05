import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Courier tracking is not integrated yet. This endpoint never fabricates
 * tracking events: it reports that live tracking is unavailable so the UI can
 * fall back to the tracking history stored in the database for the order.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const courier = (searchParams.get("courier") || "").toUpperCase();
  const waybill = searchParams.get("waybill") || searchParams.get("resi") || "";

  return NextResponse.json(
    {
      available: false,
      courier,
      waybill,
      history: [],
      error:
        "Pelacakan resi otomatis belum tersedia. Silakan cek nomor resi langsung di situs resmi kurir.",
    },
    { status: 501 }
  );
}
