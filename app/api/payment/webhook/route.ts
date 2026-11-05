import { NextResponse } from "next/server";
import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendOrderConfirmationEmail, type OrderConfirmationData } from "@/lib/mail";
import { onWebsiteOrderPlaced } from "@/lib/marketplace-stock-sync";

/**
 * Midtrans HTTP notification (webhook) handler.
 *
 * Signature per Midtrans docs (https://docs.midtrans.com/docs/https-notification-webhooks):
 *   signature_key = SHA512(order_id + status_code + gross_amount + ServerKey)
 *
 * Response codes: 2xx = processed (no retry); 401 bad signature; 503 server key missing;
 * 500 database failure (Midtrans retries).
 */

type PaymentStatus = "PENDING" | "SETTLEMENT" | "EXPIRE" | "CANCEL" | "DENY" | "REFUND";

function verifySignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  signatureKey: string,
  serverKey: string
): boolean {
  const expected = crypto
    .createHash("sha512")
    .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
    .digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signatureKey.trim().toLowerCase(), "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Maps a Midtrans transaction status to the internal payment status. */
function mapPaymentStatus(transactionStatus: string, fraudStatus?: string): PaymentStatus {
  switch (transactionStatus) {
    case "capture":
      if (!fraudStatus || fraudStatus === "accept") return "SETTLEMENT";
      if (fraudStatus === "deny") return "DENY";
      return "PENDING"; // "challenge": wait for a manual decision
    case "settlement":
      return "SETTLEMENT";
    case "deny":
      return "DENY";
    case "cancel":
      return "CANCEL";
    case "expire":
    case "failure":
      return "EXPIRE";
    case "refund":
    case "partial_refund":
      return "REFUND";
    default:
      return "PENDING";
  }
}

const str = (v: unknown): string => (typeof v === "string" ? v : v == null ? "" : String(v));

export async function POST(request: Request) {
  let notification: Record<string, unknown>;
  try {
    notification = await request.json();
  } catch {
    return NextResponse.json({ error: "Body notifikasi tidak valid." }, { status: 400 });
  }

  const orderId = str(notification.order_id);
  const statusCode = str(notification.status_code);
  const grossAmountRaw = str(notification.gross_amount);
  const signatureKey = str(notification.signature_key);
  const transactionStatus = str(notification.transaction_status).toLowerCase();
  const fraudStatus = str(notification.fraud_status).toLowerCase() || undefined;
  const paymentType = str(notification.payment_type) || undefined;
  const transactionId = str(notification.transaction_id) || undefined;

  // 1. Always verify the signature
  const serverKey = process.env.MIDTRANS_SERVER_KEY?.trim();
  if (!serverKey) {
    console.error("[Midtrans Webhook] MIDTRANS_SERVER_KEY belum dikonfigurasi; notifikasi ditolak.");
    return NextResponse.json(
      { error: "Kunci server Midtrans belum dikonfigurasi." },
      { status: 503 }
    );
  }
  if (
    !orderId ||
    !signatureKey ||
    !verifySignature(orderId, statusCode, grossAmountRaw, signatureKey, serverKey)
  ) {
    console.warn(`[Midtrans Webhook] Signature tidak valid atau tidak ada (order_id=${orderId || "-"}).`);
    return NextResponse.json({ error: "Signature tidak valid." }, { status: 401 });
  }

  const paymentStatus = mapPaymentStatus(transactionStatus, fraudStatus);
  const rawNotification = notification as Prisma.InputJsonValue;

  // 2. Apply the status change in the database
  let order;
  let markedPaid = false;
  let amountMismatch = false;
  try {
    order = await prisma.order.findUnique({
      where: { orderNumber: orderId },
      include: { payment: true, items: true },
    });

    if (!order) {
      console.warn(`[Midtrans Webhook] Pesanan ${orderId} tidak ditemukan.`);
      return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
    }
    const currentOrder = order;

    // Amount sent by Midtrans must match what we charged for this order
    const notifiedAmount = Math.round(Number(grossAmountRaw));
    const expectedAmount = Math.round(Number(currentOrder.payment?.grossAmount ?? currentOrder.totalAmount));
    const orderTotal = Math.round(Number(currentOrder.totalAmount));
    amountMismatch =
      !Number.isFinite(notifiedAmount) ||
      notifiedAmount !== expectedAmount ||
      notifiedAmount !== orderTotal;

    const paymentData = {
      midtransTransactionId: transactionId,
      paymentType: paymentType || "midtrans_snap",
      rawNotification,
    };

    await prisma.$transaction(async (tx) => {
      if (amountMismatch) {
        // Record the notification for review but never mark the order paid
        await tx.payment.upsert({
          where: { orderId: currentOrder.id },
          update: { rawNotification },
          create: {
            orderId: currentOrder.id,
            midtransOrderId: orderId,
            grossAmount: currentOrder.totalAmount,
            ...paymentData,
          },
        });
        return;
      }

      if (paymentStatus === "SETTLEMENT") {
        // Conditional update: only the first notification flips PENDING -> PAID,
        // so retries never repeat the side effects below.
        const res = await tx.order.updateMany({
          where: { id: currentOrder.id, status: "PENDING" },
          data: { status: "PAID" },
        });
        markedPaid = res.count === 1;

        // Reduce website stock exactly once, in the same transaction.
        if (markedPaid) {
          for (const item of currentOrder.items) {
            if (item.variantId) {
              await tx.productVariant.updateMany({
                where: { id: item.variantId },
                data: { stock: { decrement: item.quantity } },
              });
            }
            await tx.product.updateMany({
              where: { id: item.productId },
              data: { stock: { decrement: item.quantity } },
            });
          }
          const productIds = currentOrder.items.map((it) => it.productId);
          await tx.productVariant.updateMany({
            where: { productId: { in: productIds }, stock: { lt: 0 } },
            data: { stock: 0 },
          });
          await tx.product.updateMany({
            where: { id: { in: productIds }, stock: { lt: 0 } },
            data: { stock: 0 },
          });
        }
      } else if (paymentStatus === "CANCEL" || paymentStatus === "DENY" || paymentStatus === "EXPIRE") {
        await tx.order.updateMany({
          where: { id: currentOrder.id, status: "PENDING" },
          data: { status: "CANCELLED" },
        });
      }

      // Do not downgrade a settled payment because of a late/out-of-order notification
      const alreadySettled = currentOrder.payment?.status === "SETTLEMENT";
      const nextStatus =
        alreadySettled && paymentStatus !== "REFUND" && paymentStatus !== "SETTLEMENT"
          ? "SETTLEMENT"
          : paymentStatus;

      await tx.payment.upsert({
        where: { orderId: currentOrder.id },
        update: {
          ...paymentData,
          status: nextStatus,
          ...(markedPaid ? { paidAt: new Date() } : {}),
        },
        create: {
          orderId: currentOrder.id,
          midtransOrderId: orderId,
          grossAmount: currentOrder.totalAmount,
          status: nextStatus,
          paidAt: markedPaid ? new Date() : undefined,
          ...paymentData,
        },
      });
    });
  } catch (dbErr) {
    console.error(`[Midtrans Webhook] Gagal memperbarui database untuk ${orderId}:`, dbErr);
    return NextResponse.json({ error: "Gagal memperbarui database." }, { status: 500 });
  }

  if (amountMismatch) {
    console.error(
      `[Midtrans Webhook] Nominal tidak cocok untuk ${orderId}: notifikasi=${grossAmountRaw}, pesanan=${String(order.totalAmount)}. Pesanan TIDAK ditandai lunas.`
    );
    return NextResponse.json(
      { error: "Nominal pembayaran tidak sesuai dengan total pesanan." },
      { status: 400 }
    );
  }

  // 3. Side effects only once, when this notification actually marked the order paid
  if (markedPaid) {
    await runPaidSideEffects(order.id, paymentType).catch((err) =>
      console.error(`[Midtrans Webhook] Gagal memproses tindak lanjut pesanan lunas ${orderId}:`, err)
    );
  }

  return NextResponse.json({
    status: "ok",
    order_id: orderId,
    payment_status: paymentStatus,
  });
}

async function runPaidSideEffects(orderUuid: string, paymentType?: string) {
  const fullOrder = await prisma.order.findUnique({
    where: { id: orderUuid },
    include: { user: true, items: true, shipment: true, address: true, payment: true },
  });
  if (!fullOrder) return;

  // Marketplace stock deduction
  if (fullOrder.items.length) {
    await onWebsiteOrderPlaced(
      fullOrder.items.map((it) => ({
        productId: it.productId,
        variantId: it.variantId,
        sku: it.sku,
        quantity: it.quantity,
      })),
      { websiteStockAlreadyDeducted: true }
    ).catch((err) => console.warn("[Midtrans Webhook] Pemotongan stok marketplace gagal:", err));
  }

  // Receipt email
  if (!fullOrder.user?.email) {
    console.warn(`[Midtrans Webhook] Pesanan ${fullOrder.orderNumber} tidak memiliki email pelanggan.`);
    return;
  }

  const emailPayload: OrderConfirmationData = {
    orderNumber: fullOrder.orderNumber,
    customerName: fullOrder.address?.recipient || fullOrder.user.name || "Customer it's matapanda",
    customerEmail: fullOrder.user.email,
    customerPhone: fullOrder.address?.phone || fullOrder.user.phone || undefined,
    shippingAddress: {
      recipient: fullOrder.address?.recipient || fullOrder.user.name || "-",
      street: fullOrder.address?.street || "-",
      city: fullOrder.address?.city || "-",
      province: fullOrder.address?.province || "-",
      postalCode: fullOrder.address?.postalCode || undefined,
      country: fullOrder.address?.country || "-",
    },
    courier: fullOrder.shipment?.courier || "-",
    courierService: fullOrder.shipment?.serviceName || "-",
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
    paymentMethod: paymentType || "Midtrans Snap",
  };

  const result = await sendOrderConfirmationEmail(emailPayload);
  if (!result.success) {
    console.error(
      `[Midtrans Webhook] Email konfirmasi ${fullOrder.orderNumber} tidak terkirim: ${result.error}. Kirim ulang dari panel admin.`
    );
  }
}
