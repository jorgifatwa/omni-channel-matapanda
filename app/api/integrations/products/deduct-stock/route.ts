import { NextResponse } from "next/server";
import { onWebsiteOrderPlaced, type OrderItemToDeduct } from "@/lib/marketplace-stock-sync";

/**
 * POST /api/integrations/products/deduct-stock
 *
 * Dipanggil secara otomatis ketika pembeli checkout / menyelesaikan pembayaran di website it's matapanda.
 * Memotong stok di Shopee (dan marketplace lain yang terhubung) secara real-time.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const items: OrderItemToDeduct[] = body.items || [];

    if (!items.length) {
      return NextResponse.json({ success: true, message: "No items to deduct" });
    }

    const result = await onWebsiteOrderPlaced(items);
    return NextResponse.json({
      success: true,
      message: `Berhasil memotong stok ${result.deductedCount} produk di Shopee!`,
      deductedCount: result.deductedCount,
    });
  } catch (error) {
    console.error("[Deduct Stock API] Error:", error);
    return NextResponse.json(
      { error: "Gagal memproses pemotongan stok marketplace" },
      { status: 500 }
    );
  }
}
