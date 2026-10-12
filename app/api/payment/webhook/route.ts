import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendOrderConfirmationEmail, type OrderConfirmationData } from "@/lib/mail";
import { onWebsiteOrderPlaced } from "@/lib/marketplace-stock-sync";

export async function POST(request: Request) {
  try {
    const notification = await request.json();
    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      fraud_status,
      payment_type,
      transaction_id,
    } = notification;

    const serverKey = process.env.MIDTRANS_SERVER_KEY || "";

    // Verify signature hash if server key exists
    if (serverKey && serverKey !== "SB-Mid-server-demo") {
      const expectedSignature = crypto
        .createHash("sha512")
        .update(`${order_id}${status_code}${gross_amount}${serverKey}`)
        .digest("hex");

      if (signature_key && signature_key !== expectedSignature) {
        return NextResponse.json(
          { error: "Invalid signature key" },
          { status: 403 }
        );
      }
    }

    // Map Midtrans transaction status to internal PaymentStatus and OrderStatus
    let internalPaymentStatus:
      | "SETTLEMENT"
      | "PENDING"
      | "DENY"
      | "EXPIRE"
      | "CANCEL" = "PENDING";
    let internalOrderStatus:
      | "PAID"
      | "PENDING"
      | "CANCELLED"
      | "COMPLETED" = "PENDING";

    if (transaction_status === "capture") {
      if (fraud_status === "accept") {
        internalPaymentStatus = "SETTLEMENT";
        internalOrderStatus = "PAID";
      } else {
        internalPaymentStatus = "DENY";
        internalOrderStatus = "CANCELLED";
      }
    } else if (transaction_status === "settlement") {
      internalPaymentStatus = "SETTLEMENT";
      internalOrderStatus = "PAID";
    } else if (
      transaction_status === "cancel" ||
      transaction_status === "deny"
    ) {
      internalPaymentStatus = "CANCEL";
      internalOrderStatus = "CANCELLED";
    } else if (transaction_status === "expire") {
      internalPaymentStatus = "EXPIRE";
      internalOrderStatus = "CANCELLED";
    } else if (transaction_status === "pending") {
      internalPaymentStatus = "PENDING";
      internalOrderStatus = "PENDING";
    }

    // Update database record if Prisma is connected
    try {
      await prisma.payment.updateMany({
        where: { midtransOrderId: order_id },
        data: {
          midtransTransactionId: transaction_id || undefined,
          paymentType: payment_type || "midtrans",
          status: internalPaymentStatus,
          paidAt:
            internalPaymentStatus === "SETTLEMENT" ? new Date() : undefined,
          rawNotification: notification,
        },
      });

      await prisma.order.updateMany({
        where: { orderNumber: order_id },
        data: {
          status: internalOrderStatus,
        },
      });

      // Send email receipt on successful settlement
      if (internalPaymentStatus === "SETTLEMENT") {
        const fullOrder = await prisma.order.findUnique({
          where: { orderNumber: order_id },
          include: {
            user: true,
            items: true,
            shipment: true,
            address: true,
            payment: true,
          },
        });

        if (fullOrder && fullOrder.user?.email) {
          const emailPayload: OrderConfirmationData = {
            orderNumber: fullOrder.orderNumber,
            customerName: fullOrder.address?.recipient || fullOrder.user.name || "Customer it's matapanda",
            customerEmail: fullOrder.user.email,
            customerPhone: fullOrder.address?.phone || fullOrder.user.phone || undefined,
            shippingAddress: {
              recipient: fullOrder.address?.recipient || fullOrder.user.name || "Customer it's matapanda",
              street: fullOrder.address?.street || "Alamat Pengiriman",
              city: fullOrder.address?.city || "Jakarta",
              province: fullOrder.address?.province || "DKI Jakarta",
              postalCode: fullOrder.address?.postalCode || undefined,
              country: fullOrder.address?.country || "Indonesia",
            },
            courier: fullOrder.shipment?.courier || "JNE",
            courierService: fullOrder.shipment?.serviceName || "REG",
            trackingNumber: fullOrder.shipment?.trackingNumber,
            items: fullOrder.items.map((it) => ({
              productName: it.productName,
              sku: it.sku,
              size: it.size,
              color: it.color,
              quantity: it.quantity,
              unitPrice: Number(it.unitPrice),
              subtotal: Number(it.subtotal),
            })),
            subtotal: Number(fullOrder.subtotal),
            shippingCost: Number(fullOrder.shippingCost),
            discountAmount: Number(fullOrder.discountAmount),
            totalAmount: Number(fullOrder.totalAmount),
            paymentMethod: payment_type || "Midtrans Snap",
          };

          await sendOrderConfirmationEmail(emailPayload);

          // Otomatis potong stok di Shopee dan marketplace terhubung secara real-time
          if (fullOrder.items?.length) {
            await onWebsiteOrderPlaced(
              fullOrder.items.map((it) => ({
                productId: it.productId,
                sku: it.sku,
                quantity: it.quantity,
              }))
            ).catch((err) => console.warn("[Midtrans Webhook] Marketplace stock deduction warning:", err));
          }
        }
      }
    } catch (dbErr) {
      console.warn("Database sync / email dispatch warning in Midtrans webhook:", dbErr);
    }

    return NextResponse.json({
      status: "ok",
      order_id,
      payment_status: internalPaymentStatus,
      order_status: internalOrderStatus,
    });
  } catch (error) {
    console.error("Midtrans webhook error:", error);
    return NextResponse.json(
      { error: "Error processing Midtrans webhook" },
      { status: 500 }
    );
  }
}
