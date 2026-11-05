/**
 * Order status transitions with their side effects, in one place.
 *
 *  - PENDING -> PAID:      reduce website stock exactly once
 *  - PENDING -> CANCELLED: give back the coupon use, stop the pending Midtrans charge
 *  - PAID    -> CANCELLED: also put the stock back
 *
 * Every transition is a conditional update on the current status, so a
 * concurrent webhook, status poll, cron or admin action can only apply it once.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { releaseCouponUsage } from "@/lib/coupon-store";
import { expireCharge } from "@/lib/midtrans";

type Tx = Prisma.TransactionClient;
type StockItem = { productId: string; variantId: string | null; quantity: number };

export async function deductOrderStock(tx: Tx, items: StockItem[]) {
  for (const item of items) {
    if (item.variantId) {
      await tx.productVariant.updateMany({ where: { id: item.variantId }, data: { stock: { decrement: item.quantity } } });
    }
    await tx.product.updateMany({ where: { id: item.productId }, data: { stock: { decrement: item.quantity } } });
  }
  const productIds = items.map((it) => it.productId);
  await tx.productVariant.updateMany({ where: { productId: { in: productIds }, stock: { lt: 0 } }, data: { stock: 0 } });
  await tx.product.updateMany({ where: { id: { in: productIds }, stock: { lt: 0 } }, data: { stock: 0 } });
}

export async function restoreOrderStock(tx: Tx, items: StockItem[]) {
  for (const item of items) {
    if (item.variantId) {
      await tx.productVariant.updateMany({ where: { id: item.variantId }, data: { stock: { increment: item.quantity } } });
    }
    await tx.product.updateMany({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
  }
}

/**
 * Marks an order paid if it is still PENDING. Returns true only for the call
 * that actually performed the transition (and reduced stock).
 */
export async function markOrderPaid(tx: Tx, orderId: string, items: StockItem[]): Promise<boolean> {
  const res = await tx.order.updateMany({ where: { id: orderId, status: "PENDING" }, data: { status: "PAID" } });
  if (res.count !== 1) return false;
  await deductOrderStock(tx, items);
  return true;
}

/**
 * Cancels an order from PENDING or PAID. Returns the previous status when this
 * call performed the cancellation, or null when the order was not cancellable.
 */
export async function cancelOrder(orderId: string): Promise<"PENDING" | "PAID" | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, payment: true },
  });
  if (!order || (order.status !== "PENDING" && order.status !== "PAID")) return null;
  const from = order.status;

  const done = await prisma.$transaction(async (tx) => {
    const res = await tx.order.updateMany({ where: { id: orderId, status: from }, data: { status: "CANCELLED" } });
    if (res.count !== 1) return false;
    if (from === "PAID") await restoreOrderStock(tx, order.items);
    if (order.payment?.status === "PENDING") {
      await tx.payment.update({ where: { id: order.payment.id }, data: { status: "CANCEL" } });
    }
    return true;
  });
  if (!done) return null;

  if (order.couponCode) {
    await releaseCouponUsage(order.couponCode).catch((err) =>
      console.error(`[Order] Gagal mengembalikan kuota kupon ${order.couponCode} (${order.orderNumber}):`, err)
    );
  }
  // A cancelled order must not stay payable at Midtrans
  if (order.payment?.status === "PENDING" && (order.payment.midtransTransactionId || order.payment.snapToken)) {
    await expireCharge(order.payment.midtransOrderId).catch((err) =>
      console.warn(`[Order] Charge ${order.payment?.midtransOrderId} gagal di-expire:`, err)
    );
  }
  return from;
}
