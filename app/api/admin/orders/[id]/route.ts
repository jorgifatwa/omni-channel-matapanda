import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OrderStatus, PaymentStatus, ShipmentStatus } from "@prisma/client";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id }, { orderNumber: id }],
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
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
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
      where: { OR: [{ id }, { orderNumber: id }] },
      include: { payment: true, shipment: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Pesanan tidak ditemukan di database" },
        { status: 404 }
      );
    }

    // 1. Update Order status
    if (orderStatus) {
      await prisma.order.update({
        where: { id: existing.id },
        data: {
          status: (orderStatus as OrderStatus) || existing.status,
        },
      });
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
      { error: "Gagal memperbarui status pesanan", details: String(err) },
      { status: 500 }
    );
  }
}
