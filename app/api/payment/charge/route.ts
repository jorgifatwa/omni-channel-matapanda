import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  MidtransError,
  canAccessOrderPayment,
  createCharge,
  expireCharge,
  getTransactionStatus,
  instructionsComplete,
  isPaymentMethod,
  methodFromMidtrans,
  midtransConfig,
  nextMidtransOrderId,
  orderPaymentDeadline,
  toIdr,
  toInstructions,
} from "@/lib/midtrans";
import { applyMidtransStatus } from "@/lib/midtrans-payment";
import { cancelOrder } from "@/lib/order-lifecycle";

/**
 * POST /api/payment/charge  { orderNumber, checkoutToken, method }
 *
 * Creates a Midtrans Core API charge for an existing order and returns the
 * instructions (VA number, QR code, app link) the checkout renders itself.
 * Amount and items always come from the database, never from the request.
 *
 * Calling it again with the same method returns the existing pending charge;
 * a different method expires the old charge and creates a new one.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    orderNumber?: unknown;
    checkoutToken?: unknown;
    method?: unknown;
  };
  const orderNumber = typeof body.orderNumber === "string" ? body.orderNumber.trim() : "";
  const method = body.method;

  if (!orderNumber) {
    return NextResponse.json({ error: "Nomor pesanan wajib diisi." }, { status: 400 });
  }
  if (!isPaymentMethod(method)) {
    return NextResponse.json({ error: "Metode pembayaran tidak dikenal." }, { status: 400 });
  }
  if (!midtransConfig().serverKey) {
    console.error("[Payment] MIDTRANS_SERVER_KEY belum dikonfigurasi.");
    return NextResponse.json(
      { error: "Pembayaran online belum tersedia. Silakan hubungi admin toko." },
      { status: 503 }
    );
  }

  let order;
  try {
    order = await prisma.order.findFirst({
      where: { orderNumber, deletedAt: null },
      include: { items: true, user: true, address: true, payment: true, shipment: true },
    });
  } catch (dbErr) {
    console.error("[Payment] Gagal memuat pesanan:", dbErr);
    return NextResponse.json({ error: "Gagal memuat data pesanan." }, { status: 500 });
  }
  if (!order) {
    return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
  }
  if (!(await canAccessOrderPayment(order, body.checkoutToken))) {
    return NextResponse.json(
      { error: "Akses pembayaran untuk pesanan ini tidak valid. Silakan checkout ulang." },
      { status: 403 }
    );
  }

  const payment = order.payment;
  if (order.status !== "PENDING" || payment?.status === "SETTLEMENT" || payment?.status === "REFUND") {
    return NextResponse.json(
      { error: "Pesanan ini sudah dibayar atau dibatalkan." },
      { status: 409 }
    );
  }
  if (Date.now() >= orderPaymentDeadline(order.createdAt).getTime()) {
    await cancelOrder(order.id);
    return NextResponse.json(
      { error: "Batas waktu pembayaran pesanan ini sudah lewat. Silakan checkout ulang." },
      { status: 409 }
    );
  }
  if (order.items.length === 0) {
    return NextResponse.json({ error: "Pesanan tidak memiliki item." }, { status: 422 });
  }

  const grossAmount = toIdr(order.totalAmount);
  if (grossAmount < 1) {
    return NextResponse.json({ error: "Total pembayaran pesanan tidak valid." }, { status: 422 });
  }

  // 1. Reuse the current charge when the buyer asks for the same method again
  //    (page refresh, double click) and it can still be paid.
  //    The payment row is created together with the order, so only treat its
  //    id as a previous charge once Midtrans actually issued one.
  const hadCharge = Boolean(payment?.midtransTransactionId || payment?.snapToken);
  const previousId =
    hadCharge && payment?.midtransOrderId?.startsWith(orderNumber) ? payment.midtransOrderId : null;
  if (previousId && payment?.status === "PENDING") {
    try {
      const status = await getTransactionStatus(previousId);
      if (status.transaction_status === "settlement" || status.transaction_status === "capture") {
        await applyMidtransStatus(status);
        return NextResponse.json({ error: "Pesanan ini sudah dibayar.", paid: true }, { status: 409 });
      }
      const stillPending = status.transaction_status === "pending";
      if (stillPending && methodFromMidtrans(status) === method) {
        const instructions = toInstructions(status, method, previousId, grossAmount);
        if (instructionsComplete(instructions)) {
          return NextResponse.json({ instructions, isLive: midtransConfig().isProduction });
        }
      }
      if (stillPending) await expireCharge(previousId);
    } catch (err) {
      console.warn(`[Payment] Status charge ${previousId} tidak bisa dicek:`, err);
      // Never leave the old charge payable next to a new one
      await expireCharge(previousId).catch(() => undefined);
    }
  }

  // 2. Create a new charge (suffixed id when replacing an earlier one)
  let midtransOrderId = nextMidtransOrderId(orderNumber, previousId);
  const appUrl = (process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const finishUrl = `${appUrl}/checkout/finish?order_id=${encodeURIComponent(orderNumber)}&transaction_status=pending`;

  let charge;
  try {
    // A charge may exist at Midtrans that we failed to record (timeout, DB
    // error). Midtrans then rejects the id with 406; move to the next suffix.
    for (let attempt = 0; ; attempt++) {
      try {
        charge = await createCharge(order, method, midtransOrderId, finishUrl);
        break;
      } catch (err) {
        if ((err as MidtransError).statusCode !== "406" || attempt >= 3) throw err;
        await expireCharge(midtransOrderId).catch(() => undefined);
        midtransOrderId = nextMidtransOrderId(orderNumber, midtransOrderId);
      }
    }
  } catch (err) {
    const e = err as MidtransError;
    console.error(`[Payment] Charge ${midtransOrderId} (${method}) ditolak:`, e.statusCode, e.message, e.details);
    const notActive = e.statusCode === "402" || /not activated|not enabled|channel/i.test(e.message);
    return NextResponse.json(
      {
        error: notActive
          ? "Metode pembayaran ini belum aktif. Silakan pilih metode lain."
          : "Gagal membuat tagihan pembayaran. Silakan coba lagi atau pilih metode lain.",
      },
      { status: 502 }
    );
  }

  // 3. Persist the current charge
  try {
    await prisma.payment.upsert({
      where: { orderId: order.id },
      update: {
        midtransOrderId,
        midtransTransactionId: charge.transaction_id || null,
        paymentType: method,
        status: "PENDING",
        grossAmount,
        snapToken: null,
        snapRedirectUrl: null,
      },
      create: {
        orderId: order.id,
        midtransOrderId,
        midtransTransactionId: charge.transaction_id || null,
        paymentType: method,
        grossAmount,
      },
    });
  } catch (dbErr) {
    console.error(`[Payment] Gagal menyimpan charge ${midtransOrderId}:`, dbErr);
    await expireCharge(midtransOrderId).catch(() => undefined);
    return NextResponse.json(
      { error: "Tagihan gagal disimpan. Silakan coba lagi." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    instructions: toInstructions(charge, method, midtransOrderId, grossAmount),
    isLive: midtransConfig().isProduction,
  });
}
