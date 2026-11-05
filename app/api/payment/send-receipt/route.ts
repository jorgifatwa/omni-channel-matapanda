import { NextResponse } from "next/server";
import { sendOrderConfirmationEmail, type OrderConfirmationData } from "@/lib/mail";
import { prisma } from "@/lib/prisma";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Sends the "paid" receipt email for an order that exists in the database.
 * The email content and recipient always come from the database record,
 * never from the request body.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";

    if (!orderId) {
      return NextResponse.json({ error: "Nomor pesanan wajib diisi." }, { status: 400 });
    }

    // Enforce business rule: Receipt email is ONLY sent for settled / paid orders
    if (body.paymentStatus && body.paymentStatus !== "SETTLEMENT" && body.paymentStatus !== "PAID") {
      return NextResponse.json(
        {
          success: false,
          error: "Email bukti pembayaran lunas hanya dikirim saat status transaksi sudah SETTLEMENT / PAID.",
          skipped: true,
        },
        { status: 400 }
      );
    }

    let dbOrder;
    try {
      dbOrder = await prisma.order.findFirst({
        where: UUID_RE.test(orderId)
          ? { id: orderId, deletedAt: null }
          : { orderNumber: orderId, deletedAt: null },
        include: {
          user: true,
          items: true,
          shipment: true,
          payment: true,
          address: true,
        },
      });
    } catch (dbErr) {
      console.error("[SendReceiptAPI] Database lookup failed:", dbErr);
      return NextResponse.json(
        { error: "Gagal memuat data pesanan dari database." },
        { status: 503 }
      );
    }

    if (!dbOrder) {
      return NextResponse.json(
        { error: "Pesanan tidak ditemukan di database." },
        { status: 404 }
      );
    }

    if (!dbOrder.user?.email) {
      return NextResponse.json(
        { error: "Pesanan tidak memiliki alamat email pelanggan." },
        { status: 422 }
      );
    }

    const orderData: OrderConfirmationData = {
      orderNumber: dbOrder.orderNumber,
      customerName: dbOrder.address?.recipient || dbOrder.user.name || "-",
      customerEmail: dbOrder.user.email,
      customerPhone: dbOrder.address?.phone || dbOrder.user.phone || undefined,
      shippingAddress: {
        recipient: dbOrder.address?.recipient || dbOrder.user.name || "-",
        street: dbOrder.address?.street || "-",
        city: dbOrder.address?.city || "-",
        province: dbOrder.address?.province || "-",
        postalCode: dbOrder.address?.postalCode || undefined,
        country: dbOrder.address?.country || "-",
      },
      courier: dbOrder.shipment?.courier || "-",
      courierService: dbOrder.shipment?.serviceName || "-",
      trackingNumber: dbOrder.shipment?.trackingNumber || null,
      items: dbOrder.items.map((it) => ({
        productName: it.productName,
        sku: it.sku,
        size: it.size,
        color: it.color,
        quantity: it.quantity,
        unitPrice: Number(it.unitPrice),
        subtotal: Number(it.subtotal),
      })),
      subtotal: Number(dbOrder.subtotal),
      shippingCost: Number(dbOrder.shippingCost),
      discountAmount: Number(dbOrder.discountAmount),
      totalAmount: Number(dbOrder.totalAmount),
      paymentMethod: dbOrder.payment?.paymentType || "-",
      createdAt: dbOrder.createdAt.toISOString(),
    };

    const result = await sendOrderConfirmationEmail(orderData);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Gagal mengirim email konfirmasi pesanan" },
        { status: 502 }
      );
    }
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("send-receipt API error:", error);
    return NextResponse.json(
      { error: "Gagal mengirim email konfirmasi pesanan" },
      { status: 500 }
    );
  }
}
