import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ORDER_PAYMENT_WINDOW_HOURS } from "@/lib/midtrans";
import { cancelOrder } from "@/lib/order-lifecycle";

export const dynamic = "force-dynamic";

/**
 * GET|POST /api/payment/expire-orders
 *
 * Daily Vercel Cron: cancels website orders still unpaid after the payment
 * window. With the Core API a buyer may leave before choosing a method, so
 * no Midtrans expiry notification would ever arrive for those orders.
 *
 * Protected by: Authorization: Bearer <CRON_SECRET>
 */
async function handle(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "CRON_SECRET belum dikonfigurasi" }, { status: 503 });
    }
  } else if (request.headers.get("Authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - ORDER_PAYMENT_WINDOW_HOURS * 3_600_000);
  try {
    const stale = await prisma.order.findMany({
      where: {
        status: "PENDING",
        deletedAt: null,
        createdAt: { lt: cutoff },
        OR: [{ payment: null }, { payment: { status: { not: "SETTLEMENT" } } }],
      },
      select: { id: true },
      take: 200,
    });

    let cancelled = 0;
    for (const order of stale) {
      // cancelOrder also stops the pending Midtrans charge and gives back the coupon use
      if (await cancelOrder(order.id)) cancelled++;
    }
    return NextResponse.json({ success: true, checked: stale.length, cancelled });
  } catch (error) {
    console.error("[Expire Orders] Failed:", error);
    return NextResponse.json({ error: "Expire orders failed" }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
