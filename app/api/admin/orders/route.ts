import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { type AdminOrder, type AdminOrderItem } from "@/lib/admin-data";
import crypto from "crypto";
import { OrderStatus, PaymentStatus, ShipmentStatus, CourierType } from "@prisma/client";

function toCourierType(courier: unknown): CourierType {
  const code = String(courier || "").toUpperCase().replace(/[^A-Z]/g, "");
  return (Object.values(CourierType) as string[]).includes(code)
    ? (code as CourierType)
    : CourierType.JNE;
}

function isValidUuid(id?: string | null): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

export async function GET() {
  try {
    const dbOrders = await prisma.order.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
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

    const formatted: AdminOrder[] = dbOrders.map((o) => {
      let pStatus: AdminOrder["paymentStatus"] = "PENDING";
      if (o.payment?.status === PaymentStatus.SETTLEMENT) pStatus = "SETTLEMENT";
      else if (o.payment?.status === PaymentStatus.CANCEL) pStatus = "CANCEL";
      else if (o.payment?.status === PaymentStatus.EXPIRE) pStatus = "EXPIRE";

      let oStatus: AdminOrder["orderStatus"] = "PENDING";
      if (o.status === OrderStatus.PAID) oStatus = "PAID";
      else if (o.status === OrderStatus.SHIPPED) oStatus = "SHIPPED";
      else if (o.status === OrderStatus.COMPLETED) oStatus = "COMPLETED";
      else if (o.status === OrderStatus.CANCELLED) oStatus = "CANCELLED";

      let sStatus: AdminOrder["shipmentStatus"] = "PENDING";
      if (o.shipment?.status === ShipmentStatus.PICKED_UP) sStatus = "PICKED_UP";
      else if (o.shipment?.status === ShipmentStatus.IN_TRANSIT) sStatus = "IN_TRANSIT";
      else if (o.shipment?.status === ShipmentStatus.OUT_FOR_DELIVERY) sStatus = "OUT_FOR_DELIVERY";
      else if (o.shipment?.status === ShipmentStatus.DELIVERED) sStatus = "DELIVERED";

      const rawHistory = o.shipment?.trackingHistory;
      const trackingHistory = Array.isArray(rawHistory)
        ? (rawHistory as AdminOrder["trackingHistory"])
        : [];

      return {
        id: o.id,
        orderNumber: o.orderNumber,
        customerId: o.userId,
        customerName: o.address?.recipient || o.user?.name || "Customer",
        customerEmail: o.user?.email || "-",
        customerPhone: o.address?.phone || o.user?.phone || "-",
        shippingAddress: {
          recipient: o.address?.recipient || o.user?.name || "Customer",
          phone: o.address?.phone || o.user?.phone || "-",
          street: o.address?.street || "-",
          city: o.address?.city || "-",
          province: o.address?.province || "-",
          postalCode: o.address?.postalCode || "-",
          country: o.address?.country || "-",
        },
        subtotal: Number(o.subtotal),
        shippingCost: Number(o.shippingCost),
        discountAmount: Number(o.discountAmount),
        totalAmount: Number(o.totalAmount),
        paymentMethod: o.payment?.paymentType || "-",
        midtransTransactionId:
          o.payment?.midtransTransactionId || o.payment?.midtransOrderId || "-",
        paymentStatus: pStatus,
        orderStatus: oStatus,
        shipmentStatus: sStatus,
        courier: o.shipment?.courier || "-",
        courierService: o.shipment?.serviceName || "-",
        trackingNumber: o.shipment?.trackingNumber || "-",
        items: o.items.map((it) => ({
          id: it.id,
          productId: it.productId,
          productName: it.productName,
          sku: it.sku,
          image: it.product?.images?.[0]?.url || "",
          size: it.size,
          color: it.color,
          unitPrice: Number(it.unitPrice),
          quantity: it.quantity,
          subtotal: Number(it.subtotal),
        })),
        trackingHistory,
        createdAt: o.createdAt.toISOString().slice(0, 10),
      };
    });

    return NextResponse.json({ orders: formatted, source: "database" });
  } catch (err) {
    console.error("[AdminOrdersAPI] Failed to fetch orders from database:", err);
    return NextResponse.json(
      { orders: [], error: "Gagal memuat pesanan dari database" },
      { status: 503 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      orderNumber,
      customerEmail,
      customerName,
      customerPhone,
      shippingAddress,
      subtotal,
      shippingCost,
      discountAmount,
      totalAmount,
      paymentMethod,
      midtransTransactionId,
      paymentStatus = "PENDING",
      orderStatus = "PENDING",
      shipmentStatus = "PENDING",
      courier = "JNE",
      courierService = "REG",
      trackingNumber = "-",
      items = [],
      trackingHistory = [],
    } = body;

    const email = customerEmail ? customerEmail.trim().toLowerCase() : `guest-${Date.now()}@itsmatapanda.com`;
    const name = customerName ? customerName.trim() : "Customer";
    const phone = customerPhone ? customerPhone.trim() : "-";

    const orderItems: Partial<AdminOrderItem>[] = Array.isArray(items) ? items : [];
    if (orderItems.length === 0 || orderItems.some((it) => !isValidUuid(it.productId))) {
      return NextResponse.json(
        { error: "Data produk pada pesanan tidak valid" },
        { status: 400 }
      );
    }

    try {
      if (orderNumber) {
        const duplicate = await prisma.order.findUnique({ where: { orderNumber } });
        if (duplicate) {
          return NextResponse.json(
            { error: "Nomor pesanan sudah tersimpan di database", orderId: duplicate.id },
            { status: 409 }
          );
        }
      }

      // 1. Find or create user
      let user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            id: crypto.randomUUID(),
            email,
            name,
            phone,
            role: "CUSTOMER",
          },
        });
      }

      // 2. Find or create address
      let address = null;
      if (shippingAddress) {
        address = await prisma.address.create({
          data: {
            id: crypto.randomUUID(),
            userId: user.id,
            recipient: shippingAddress.recipient || name,
            phone: shippingAddress.phone || phone,
            street: shippingAddress.street || "-",
            city: shippingAddress.city || "-",
            province: shippingAddress.province || "-",
            postalCode: shippingAddress.postalCode || "-",
            country: shippingAddress.country || "-",
          },
        });
      }

      const orderId = crypto.randomUUID();
      const cleanOrderNumber = orderNumber || `IMP-${Date.now()}`;

      // 3. Create Order
      const createdOrder = await prisma.order.create({
        data: {
          id: orderId,
          orderNumber: cleanOrderNumber,
          userId: user.id,
          addressId: address?.id || null,
          status: (orderStatus as OrderStatus) || OrderStatus.PENDING,
          subtotal: Number(subtotal || totalAmount || 0),
          shippingCost: Number(shippingCost || 0),
          discountAmount: Number(discountAmount || 0),
          totalAmount: Number(totalAmount || 0),
          items: {
            create: orderItems.map((it) => ({
              id: crypto.randomUUID(),
              productId: it.productId as string,
              productName: it.productName || "Produk",
              sku: it.sku || "IMP-ITEM",
              size: it.size || "Standard",
              color: it.color || "Default",
              unitPrice: Number(it.unitPrice || 0),
              quantity: Number(it.quantity || 1),
              subtotal: Number(it.subtotal || it.unitPrice || 0),
            })),
          },
          payment: {
            create: {
              id: crypto.randomUUID(),
              midtransOrderId: cleanOrderNumber,
              midtransTransactionId: midtransTransactionId || null,
              paymentType: paymentMethod || "Midtrans Snap",
              status: (paymentStatus as PaymentStatus) || PaymentStatus.PENDING,
              grossAmount: Number(totalAmount || 0),
            },
          },
          shipment: {
            create: {
              id: crypto.randomUUID(),
              courier: toCourierType(courier),
              serviceName: courierService || "REG",
              trackingNumber: trackingNumber && trackingNumber !== "-" ? trackingNumber : null,
              status: (shipmentStatus as ShipmentStatus) || ShipmentStatus.PENDING,
              shippingCost: Number(shippingCost || 0),
              destinationCity: shippingAddress?.city || "-",
              destinationCountry: shippingAddress?.country || "-",
              trackingHistory: Array.isArray(trackingHistory) ? trackingHistory : [],
            },
          },
        },
      });

      return NextResponse.json({ success: true, order: createdOrder }, { status: 201 });
    } catch (dbErr) {
      console.error("[AdminOrdersAPI] Database error creating order:", dbErr);
      return NextResponse.json(
        { error: "Gagal menyimpan pesanan ke database" },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("[AdminOrdersAPI] Error handling POST order request:", err);
    return NextResponse.json({ error: "Permintaan tidak valid" }, { status: 400 });
  }
}
