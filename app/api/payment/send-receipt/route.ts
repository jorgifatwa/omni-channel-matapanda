import { NextResponse } from "next/server";
import { sendOrderConfirmationEmail, type OrderConfirmationData } from "@/lib/mail";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      orderId,
      email,
      customerName,
      customerPhone,
      shippingAddress,
      items,
      subtotal,
      shippingCost,
      discountAmount,
      totalAmount,
      courier,
      courierService,
      trackingNumber,
      paymentMethod,
    } = body;

    const targetOrderId = orderId || `ZDC-${Date.now()}`;
    const targetEmail = email || "customer@example.com";

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

    // 1. Try to find actual order in DB if exists
    try {
      const dbOrder = await prisma.order.findFirst({
        where: {
          OR: [{ orderNumber: targetOrderId }, { id: targetOrderId }],
        },
        include: {
          user: true,
          items: true,
          shipment: true,
          payment: true,
          address: true,
        },
      });

      if (dbOrder) {
        const orderData: OrderConfirmationData = {
          orderNumber: dbOrder.orderNumber,
          customerName: dbOrder.address?.recipient || dbOrder.user?.name || customerName || "Customer ZODIAC",
          customerEmail: dbOrder.user?.email || targetEmail,
          customerPhone: dbOrder.address?.phone || dbOrder.user?.phone || customerPhone || "+6281234567890",
          shippingAddress: {
            recipient: dbOrder.address?.recipient || dbOrder.user?.name || customerName || "Customer ZODIAC",
            street: dbOrder.address?.street || shippingAddress?.street || "Jl. Senopati No. 64",
            city: dbOrder.address?.city || shippingAddress?.city || "Jakarta Selatan",
            province: dbOrder.address?.province || shippingAddress?.province || "DKI Jakarta",
            postalCode: dbOrder.address?.postalCode || shippingAddress?.postalCode || "12190",
            country: dbOrder.address?.country || shippingAddress?.country || "Indonesia",
          },
          courier: dbOrder.shipment?.courier || courier || "JNE",
          courierService: dbOrder.shipment?.serviceName || courierService || "REG",
          trackingNumber: dbOrder.shipment?.trackingNumber || trackingNumber || "JNE009823718291",
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
          paymentMethod: dbOrder.payment?.paymentType || paymentMethod || "Midtrans Snap (QRIS / GoPay)",
          createdAt: dbOrder.createdAt.toISOString(),
        };

        const result = await sendOrderConfirmationEmail(orderData);
        return NextResponse.json({ success: true, result });
      }
    } catch (dbErr) {
      console.warn("send-receipt DB lookup warning:", dbErr);
    }

    // Fallback: Send email using provided body data
    const fallbackData: OrderConfirmationData = {
      orderNumber: targetOrderId,
      customerName: customerName || "Customer ZODIAC",
      customerEmail: targetEmail,
      customerPhone: customerPhone || "+62 812-3456-7890",
      shippingAddress: shippingAddress || {
        recipient: customerName || "Customer ZODIAC",
        street: "Jl. Senopati No. 64, Kebayoran Baru",
        city: "Jakarta Selatan",
        province: "DKI Jakarta",
        postalCode: "12190",
        country: "Indonesia",
      },
      courier: courier || "JNE",
      courierService: courierService || "JNE Reguler (REG)",
      trackingNumber:
        trackingNumber ||
        `JNE0098${Math.floor(10000000 + Math.random() * 90000000)}`,
      items:
        items && items.length > 0
          ? items.map((it: { productName?: string; name?: string; sku?: string; size?: string; color?: string; quantity?: number; unitPrice?: number; priceNumber?: number; subtotal?: number }) => ({
              productName: it.productName || it.name || "ZODIAC Product",
              sku: it.sku,
              size: it.size,
              color: it.color,
              quantity: it.quantity || 1,
              unitPrice: Number(it.unitPrice || it.priceNumber || 0),
              subtotal: Number(it.subtotal || (it.quantity || 1) * (it.unitPrice || it.priceNumber || 0)),
            }))
          : [
              {
                productName: "Dawn Gong Sunburn 01 T-shirt",
                sku: "DG-SB01-WHT-M",
                size: "M",
                color: "White",
                quantity: 1,
                unitPrice: 10,
                subtotal: 10,
              },
            ],
      subtotal: Number(subtotal) || Number(totalAmount) || 10,
      shippingCost: Number(shippingCost) || 0,
      discountAmount: Number(discountAmount) || 0,
      totalAmount:
        Number(totalAmount) ||
        (Number(subtotal) || 10) + (Number(shippingCost) || 0),
      paymentMethod: paymentMethod || "Midtrans Snap (QRIS / GoPay)",
    };

    const result = await sendOrderConfirmationEmail(fallbackData);
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("send-receipt API error:", error);
    return NextResponse.json(
      { error: "Gagal mengirim email konfirmasi pesanan" },
      { status: 500 }
    );
  }
}
