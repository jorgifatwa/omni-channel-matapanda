import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OrderStatus, PaymentStatus, ShipmentStatus } from "@prisma/client";
import { cancelOrder, markOrderPaid } from "@/lib/order-lifecycle";
import { expireCharge } from "@/lib/midtrans";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Orders can be looked up by database id (UUID) or by order number. */
function orderLookup(id: string) {
  return UUID_RE.test(id) ? { id } : { orderNumber: id };
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const order = await prisma.order.findFirst({
      where: {
        ...orderLookup(id),
        deletedAt: null,
      },
      include: {
        user: true,
        address: true,
        items: {
          include: {
            product: {
              include: {
                images: { orderBy: { sortOrder: "asc" } },
              },
            },
          },
        },
        payment: true,
        shipment: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Pesanan tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (err) {
    console.error("[AdminOrdersAPI] Error fetching order:", err);
    return NextResponse.json({ error: "Gagal memuat pesanan dari database" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const {
      orderStatus,
      paymentStatus,
      shipmentStatus,
      trackingNumber,
      trackingHistory,
    } = body;

    const existing = await prisma.order.findFirst({
      where: { ...orderLookup(id), deletedAt: null },
      include: { payment: true, shipment: true, items: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Pesanan tidak ditemukan di database" },
        { status: 404 }
      );
    }

    // 1. Update Order status. PAID / CANCELLED go through the shared
    //    lifecycle so stock, coupon usage and the Midtrans charge stay consistent.
    if (orderStatus && orderStatus !== existing.status) {
      if (!Object.values(OrderStatus).includes(orderStatus as OrderStatus)) {
        return NextResponse.json({ error: "Status pesanan tidak valid" }, { status: 400 });
      }
      if (orderStatus === "PENDING") {
        // Going back to PENDING would let a late payment reduce stock twice
        return NextResponse.json(
          { error: "Status tidak bisa dikembalikan ke PENDING." },
          { status: 409 }
        );
      }
      if (orderStatus === "CANCELLED") {
        if (!(await cancelOrder(existing.id))) {
          return NextResponse.json(
            { error: "Hanya pesanan PENDING atau PAID yang bisa dibatalkan." },
            { status: 409 }
          );
        }
      } else if (orderStatus === "PAID" && existing.status === "PENDING") {
        // Manual payment confirmed by the admin
        await prisma.$transaction((tx) => markOrderPaid(tx, existing.id, existing.items));
        if (existing.payment?.status === "PENDING" && existing.payment.midtransTransactionId) {
          await expireCharge(existing.payment.midtransOrderId).catch(() => undefined);
        }
      } else if (existing.status === "CANCELLED") {
        return NextResponse.json(
          { error: "Pesanan yang sudah dibatalkan tidak bisa diaktifkan lagi. Buat pesanan baru." },
          { status: 409 }
        );
      } else {
        await prisma.order.update({
          where: { id: existing.id },
          data: { status: orderStatus as OrderStatus },
        });
      }
    }

    // 2. Update Payment status
    if (paymentStatus && existing.payment) {
      await prisma.payment.update({
        where: { id: existing.payment.id },
        data: {
          status: (paymentStatus as PaymentStatus) || existing.payment.status,
          paidAt: paymentStatus === "SETTLEMENT" ? new Date() : existing.payment.paidAt,
        },
      });
    }

    // 3. Update Shipment status & tracking
    if (existing.shipment) {
      await prisma.shipment.update({
        where: { id: existing.shipment.id },
        data: {
          status: shipmentStatus ? (shipmentStatus as ShipmentStatus) : existing.shipment.status,
          trackingNumber:
            trackingNumber && trackingNumber !== "-"
              ? trackingNumber
              : existing.shipment.trackingNumber,
          trackingHistory: trackingHistory !== undefined ? trackingHistory : existing.shipment.trackingHistory,
          shippedAt: shipmentStatus === "IN_TRANSIT" || shipmentStatus === "PICKED_UP"
            ? new Date()
            : existing.shipment.shippedAt,
          deliveredAt: shipmentStatus === "DELIVERED"
            ? new Date()
            : existing.shipment.deliveredAt,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[AdminOrdersAPI] Error updating order:", err);
    return NextResponse.json(
      { error: "Gagal memperbarui status pesanan di database" },
      { status: 500 }
    );
  }
}
