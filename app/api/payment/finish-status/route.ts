import { NextResponse } from "next/server";
import { getTransactionStatus } from "@/lib/midtrans";
import { applyMidtransStatus, findOrderForMidtransId } from "@/lib/midtrans-payment";
import { TOO_MANY_MESSAGE, clientIp, rateLimit } from "@/lib/rate-limit";

const FINAL = new Set(["settlement", "capture", "expire", "cancel", "deny", "failure"]);

export type FinishStatus = "paid" | "pending" | "failed" | "not_found";

/**
 * GET /api/payment/finish-status?order_id=<Midtrans order id or order number>
 *
 * Used by /checkout/finish. The redirect URL from Midtrans (or the checkout)
 * carries transaction_status, but anyone can edit a URL, so the page must not
 * trust it. This endpoint answers from the database, refreshing a still-pending
 * payment from Midtrans first. It returns only a coarse status, no order data.
 */
export async function GET(request: Request) {
  if (!(await rateLimit("finish-status-ip", clientIp(request), 30, 600))) {
    return NextResponse.json({ error: TOO_MANY_MESSAGE }, { status: 429 });
  }

  const orderId = new URL(request.url).searchParams.get("order_id")?.trim() ?? "";
  if (!orderId || orderId.length > 64) {
    return NextResponse.json({ status: "not_found" satisfies FinishStatus });
  }

  let order = await findOrderForMidtransId(orderId);
  if (!order || order.deletedAt) {
    return NextResponse.json({ status: "not_found" satisfies FinishStatus });
  }

  const payment = order.payment;
  if (order.status === "PENDING" && payment?.status === "PENDING" && payment.midtransOrderId) {
    try {
      const tx = await getTransactionStatus(payment.midtransOrderId);
      if (FINAL.has(String(tx.transaction_status || ""))) {
        await applyMidtransStatus(tx);
        order = (await findOrderForMidtransId(orderId)) ?? order;
      }
    } catch (err) {
      console.warn(`[Payment] finish-status ${payment.midtransOrderId} tidak bisa dicek:`, err);
    }
  }

  const paymentStatus = order.payment?.status ?? "PENDING";
  let status: FinishStatus;
  if (paymentStatus === "SETTLEMENT") status = "paid";
  else if (paymentStatus === "PENDING" && order.status === "PENDING") status = "pending";
  else status = "failed";

  return NextResponse.json({ status });
}
