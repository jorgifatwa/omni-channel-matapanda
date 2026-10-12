import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const courier = (searchParams.get("courier") || "JNE").toUpperCase();
    const waybill =
      searchParams.get("waybill") || searchParams.get("resi") || "JNE009823718291";

    if (courier === "DHL") {
      return NextResponse.json({
        courier: "DHL Express",
        waybill,
        status: "DELIVERED",
        service: "DHL Express Worldwide",
        origin: "Jakarta, Indonesia",
        destination: "Tokyo, Japan",
        history: [
          {
            timestamp: "2026-09-26 14:20",
            status: "PICKED_UP",
            description: "DHL Express shipment picked up",
            location: "Jakarta, Indonesia",
          },
          {
            timestamp: "2026-09-27 04:10",
            status: "IN_TRANSIT",
            description: "Departed DHL Facility Soekarno-Hatta Gateway",
            location: "Tangerang, Indonesia",
          },
          {
            timestamp: "2026-09-28 16:45",
            status: "DELIVERED",
            description: "Delivered - Signed by K. TAKAHASHI",
            location: "Tokyo, Japan",
          },
        ],
      });
    }

    // Default: JNE Tracking
    return NextResponse.json({
      courier: "JNE",
      waybill,
      status: "IN_TRANSIT",
      service: "JNE REG",
      origin: "Jakarta Selatan (CGK10000)",
      destination: "Jakarta Selatan",
      history: [
        {
          timestamp: "2026-09-29 09:15",
          status: "PICKED_UP",
          description: "Shipment picked up by JNE courier at Senopati Drop Point",
          location: "Jakarta Selatan",
        },
        {
          timestamp: "2026-09-29 11:30",
          status: "IN_TRANSIT",
          description: "Processed at JNE Sorting Hub Tomang",
          location: "Jakarta Barat",
        },
      ],
    });
  } catch (error) {
    console.error("Tracking API error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data resi pengiriman" },
      { status: 500 }
    );
  }
}
