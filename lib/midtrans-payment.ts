/**
 * Applies a Midtrans transaction status (webhook notification or a status
 * API response) to the order and payment rows.
 *
 * Shared by the webhook and by the checkout status poll, so a missed webhook
 * still settles the order once the buyer's page asks for the status.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendOrderConfirmationEmail, type OrderConfirmationData } from "@/lib/mail";
import { onWebsiteOrderPlaced } from "@/lib/marketplace-stock-sync";
import { cancelOrder, markOrderPaid } from "@/lib/order-lifecycle";
import {
  PAYMENT_METHOD_LABELS,
  methodFromMidtrans,
  orderPaymentDeadline,
  type MidtransResponse,
} from "@/lib/midtrans";

export type PaymentStatusValue = "PENDING" | "SETTLEMENT" | "EXPIRE" | "CANCEL" | "DENY" | "REFUND";

/** Maps a Midtrans transaction status to the internal payment status. */
export function mapPaymentStatus(transactionStatus: string, fraudStatus?: string): PaymentStatusValue {
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

export type ApplyResult =
  | { kind: "ok"; orderNumber: string; paymentStatus: PaymentStatusValue; markedPaid: boolean }
  | { kind: "ignored"; reason: string }
  | { kind: "not_found" }
  | { kind: "amount_mismatch"; orderNumber: string };

/** Finds the order for a Midtrans order_id (exact order number, or a suffixed retry charge). */
async function findOrderForMidtransId(midtransOrderId: string) {
  const include = { payment: true, items: true } as const;
  const byPayment = await prisma.payment.findUnique({
    where: { midtransOrderId },
    select: { orderId: true },
  });
  if (byPayment) return prisma.order.findUnique({ where: { id: byPayment.orderId }, include });

  const exact = await prisma.order.findUnique({ where: { orderNumber: midtransOrderId }, include });
  if (exact) return exact;

  const base = midtransOrderId.replace(/-\d{1,3}$/, "");
  if (base === midtransOrderId) return null;
  return prisma.order.findUnique({ where: { orderNumber: base }, include });
}

export async function applyMidtransStatus(data: MidtransResponse): Promise<ApplyResult> {
  const midtransOrderId = str(data.order_id);
  const transactionStatus = str(data.transaction_status).toLowerCase();
  const fraudStatus = str(data.fraud_status).toLowerCase() || undefined;
  const grossAmountRaw = str(data.gross_amount);
  const transactionId = str(data.transaction_id) || undefined;
  const paymentStatus = mapPaymentStatus(transactionStatus, fraudStatus);
  const method = methodFromMidtrans(data);
  const paymentType = method || str(data.payment_type) || "midtrans";
  const rawNotification = data as Prisma.InputJsonValue;

  const order = await findOrderForMidtransId(midtransOrderId);
  if (!order) return { kind: "not_found" };

  // A buyer may switch methods; each switch creates a new charge and expires
  // the old one. Only a settlement may come from an older charge (money was
  // received); its expire/cancel notifications must not touch the order.
  const isCurrentCharge = !order.payment || order.payment.midtransOrderId === midtransOrderId;
  if (!isCurrentCharge && paymentStatus !== "SETTLEMENT") {
    return { kind: "ignored", reason: `stale charge ${midtransOrderId} (${transactionStatus})` };
  }

  const notifiedAmount = Math.round(Number(grossAmountRaw));
  const orderTotal = Math.round(Number(order.totalAmount));
  const expectedAmount = Math.round(Number(order.payment?.grossAmount ?? order.totalAmount));
  if (!Number.isFinite(notifiedAmount) || notifiedAmount !== expectedAmount || notifiedAmount !== orderTotal) {
    // Record for review, never mark paid
    await prisma.payment.upsert({
      where: { orderId: order.id },
      update: { rawNotification },
      create: {
        orderId: order.id,
        midtransOrderId,
        grossAmount: order.totalAmount,
        paymentType,
        rawNotification,
      },
    });
    console.error(
      `[Midtrans] Nominal tidak cocok untuk ${midtransOrderId}: notifikasi=${grossAmountRaw}, pesanan=${String(order.totalAmount)}. Pesanan TIDAK ditandai lunas.`
    );
    return { kind: "amount_mismatch", orderNumber: order.orderNumber };
  }

  let markedPaid = false;
  let shouldCancel = false;
  await prisma.$transaction(async (tx) => {
    if (paymentStatus === "SETTLEMENT") {
      // Only the first settlement flips PENDING -> PAID and reduces stock,
      // so retries and concurrent status polls never repeat side effects.
      markedPaid = await markOrderPaid(tx, order.id, order.items);
    } else if (paymentStatus === "CANCEL" || paymentStatus === "DENY" || paymentStatus === "EXPIRE") {
      // A QR charge expires after 30 minutes while the order stays payable
      // for 24 hours, so only cancel the order once its window has closed.
      shouldCancel = Date.now() >= orderPaymentDeadline(order.createdAt).getTime() - 60_000;
    }

    // Never downgrade a settled payment because of a late/out-of-order notification
    const alreadySettled = order.payment?.status === "SETTLEMENT";
    const nextStatus =
      alreadySettled && paymentStatus !== "REFUND" && paymentStatus !== "SETTLEMENT"
        ? "SETTLEMENT"
        : paymentStatus;

    await tx.payment.upsert({
      where: { orderId: order.id },
      update: {
        midtransOrderId,
        midtransTransactionId: transactionId,
        paymentType,
        rawNotification,
        status: nextStatus,
        ...(markedPaid ? { paidAt: new Date() } : {}),
      },
      create: {
        orderId: order.id,
        midtransOrderId,
        midtransTransactionId: transactionId,
        paymentType,
        rawNotification,
        grossAmount: order.totalAmount,
        status: nextStatus,
        paidAt: markedPaid ? new Date() : undefined,
      },
    });
  });

  if (shouldCancel) {
    await cancelOrder(order.id);
  }

  if (paymentStatus === "SETTLEMENT" && !markedPaid && order.status !== "PAID") {
    // Money arrived for an order that is no longer payable (cancelled by the
    // admin or by the deadline). Needs a manual refund or re-activation.
    console.error(
      `[Midtrans] PERLU TINDAKAN: pembayaran ${midtransOrderId} (Rp ${grossAmountRaw}) diterima untuk pesanan ${order.orderNumber} berstatus ${order.status}. Lakukan refund atau proses manual.`
    );
  }

  if (markedPaid) {
    await runPaidSideEffects(order.id, method ? PAYMENT_METHOD_LABELS[method] : paymentType).catch((err) =>
      console.error(`[Midtrans] Gagal memproses tindak lanjut pesanan lunas ${order.orderNumber}:`, err)
    );
  }

  return { kind: "ok", orderNumber: order.orderNumber, paymentStatus, markedPaid };
}

async function runPaidSideEffects(orderUuid: string, paymentLabel: string) {
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
    ).catch((err) => console.warn("[Midtrans] Pemotongan stok marketplace gagal:", err));
  }

  // Receipt email
  if (!fullOrder.user?.email) {
    console.warn(`[Midtrans] Pesanan ${fullOrder.orderNumber} tidak memiliki email pelanggan.`);
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
    paymentMethod: paymentLabel,
  };

  const result = await sendOrderConfirmationEmail(emailPayload);
  if (!result.success) {
    console.error(
      `[Midtrans] Email konfirmasi ${fullOrder.orderNumber} tidak terkirim: ${result.error}. Kirim ulang dari panel admin.`
    );
  }
}
