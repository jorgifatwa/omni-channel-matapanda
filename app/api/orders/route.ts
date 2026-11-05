import { NextResponse } from "next/server";
import { POST as createOrderInDatabase } from "@/app/api/admin/orders/route";

/**
 * Public endpoint used by checkout to create a NEW order.
 * Customers can only create PENDING orders: payment, order and shipment
 * statuses and the tracking number are forced server-side, so a buyer can
 * never mark an order as paid or shipped. Existing orders cannot be modified
 * here (duplicates return 409); status changes happen via the Midtrans webhook
 * or the admin panel.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Data pesanan tidak valid." }, { status: 400 });
  }

  const sanitized = {
    ...body,
    paymentStatus: "PENDING",
    orderStatus: "PENDING",
    shipmentStatus: "PENDING",
    trackingNumber: "-",
    midtransTransactionId: null,
  };

  return createOrderInDatabase(
    new Request(request.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sanitized),
    })
  );
}
