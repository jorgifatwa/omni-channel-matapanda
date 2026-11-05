import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  canAccessOrderPayment,
  getTransactionStatus,
  isPaymentMethod,
  midtransConfig,
  orderPaymentDeadline,
  toIdr,
  toInstructions,
  type PaymentInstructions,
} from "@/lib/midtrans";
import { applyMidtransStatus } from "@/lib/midtrans-payment";

const FINAL = new Set(["settlement", "capture", "expire", "cancel", "deny", "failure"]);

/**
 * POST /api/payment/status  { orderNumber, checkoutToken }
 *
 * Polled by the checkout while the buyer pays. Asks Midtrans for the current
 * charge status and applies final states through the same code path as the
 * webhook, so the order settles even when a webhook is delayed or missed.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { orderNumber?: unknown; checkoutToken?: unknown };
  const orderNumber = typeof body.orderNumber === "string" ? body.orderNumber.trim() : "";
  if (!orderNumber) {
    return NextResponse.json({ error: "Nomor pesanan wajib diisi." }, { status: 400 });
  }

  const load = () =>
    prisma.order.findFirst({ where: { orderNumber, deletedAt: null }, include: { payment: true } });

  let order = await load();
  if (!order) return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
  if (!(await canAccessOrderPayment(order, body.checkoutToken))) {
    return NextResponse.json({ error: "Akses tidak valid." }, { status: 403 });
  }

  let instructions: PaymentInstructions | null = null;
  const payment = order.payment;
  if (order.status === "PENDING" && payment?.status === "PENDING" && payment.midtransOrderId) {
    try {
      const status = await getTransactionStatus(payment.midtransOrderId);
      const tx = String(status.transaction_status || "");
      if (FINAL.has(tx)) {
        await applyMidtransStatus(status);
        order = (await load()) ?? order;
      } else if (tx === "pending" && isPaymentMethod(payment.paymentType)) {
        instructions = toInstructions(status, payment.paymentType, payment.midtransOrderId, toIdr(payment.grossAmount));
      }
    } catch (err) {
      console.warn(`[Payment] Status ${payment.midtransOrderId} tidak bisa dicek:`, err);
    }
  }

  return NextResponse.json({
    orderStatus: order.status,
    paymentStatus: order.payment?.status ?? "PENDING",
    method: order.payment?.paymentType ?? null,
    instructions,
    orderDeadline: orderPaymentDeadline(order.createdAt).toISOString(),
    isLive: midtransConfig().isProduction,
  });
}
