import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { INITIAL_ORDERS, type AdminOrder, type AdminOrderItem } from "@/lib/admin-data";
import crypto from "crypto";
import { OrderStatus, PaymentStatus, ShipmentStatus, CourierType } from "@prisma/client";

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

    if (dbOrders && dbOrders.length > 0) {
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
          customerEmail: o.user?.email || "customer@example.com",
          customerPhone: o.address?.phone || o.user?.phone || "-",
          shippingAddress: {
            recipient: o.address?.recipient || o.user?.name || "Customer",
            phone: o.address?.phone || o.user?.phone || "-",
            street: o.address?.street || "Alamat Pengiriman",
            city: o.address?.city || "Jakarta",
            province: o.address?.province || "DKI Jakarta",
            postalCode: o.address?.postalCode || "12345",
            country: o.address?.country || "Indonesia",
          },
          subtotal: Number(o.subtotal),
          shippingCost: Number(o.shippingCost),
          discountAmount: Number(o.discountAmount),
          totalAmount: Number(o.totalAmount),
          paymentMethod: o.payment?.paymentType || "Midtrans Snap",
          midtransTransactionId:
            o.payment?.midtransTransactionId || o.payment?.midtransOrderId || "-",
          paymentStatus: pStatus,
          orderStatus: oStatus,
          shipmentStatus: sStatus,
          courier: (o.shipment?.courier as "JNE" | "DHL") || "JNE",
          courierService: o.shipment?.serviceName || "REG",
          trackingNumber: o.shipment?.trackingNumber || "-",
          items: o.items.map((it) => ({
            id: it.id,
            productId: it.productId,
            productName: it.productName,
            sku: it.sku,
            image:
              it.product?.images?.[0]?.url ||
              "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=800&q=80",
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
    }
  } catch (err) {
    console.warn("[AdminOrdersAPI] Failed to fetch orders from database:", err);
  }

  return NextResponse.json({ orders: INITIAL_ORDERS, source: "defaults" });
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

    try {
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
            street: shippingAddress.street || "Alamat",
            city: shippingAddress.city || "Jakarta",
            province: shippingAddress.province || "DKI Jakarta",
            postalCode: shippingAddress.postalCode || "12345",
            country: shippingAddress.country || "Indonesia",
          },
        });
      }

      // 3. Find fallback product if needed for items
      const defaultProduct = await prisma.product.findFirst({
        where: { isActive: true, deletedAt: null },
      });

      const orderId = crypto.randomUUID();
      const cleanOrderNumber = orderNumber || `IMP-${Date.now()}`;

      // 4. Create Order
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
            create: items.map((it: Partial<AdminOrderItem>) => ({
              id: crypto.randomUUID(),
              productId: isValidUuid(it.productId) ? it.productId : defaultProduct?.id || orderId,
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
              courier: courier === "DHL" ? CourierType.DHL : CourierType.JNE,
              serviceName: courierService || "REG",
              trackingNumber: trackingNumber && trackingNumber !== "-" ? trackingNumber : null,
              status: (shipmentStatus as ShipmentStatus) || ShipmentStatus.PENDING,
              shippingCost: Number(shippingCost || 0),
              destinationCity: shippingAddress?.city || "Jakarta",
              destinationCountry: shippingAddress?.country || "Indonesia",
              trackingHistory: Array.isArray(trackingHistory) ? trackingHistory : [],
            },
          },
        },
      });

      return NextResponse.json({ success: true, order: createdOrder }, { status: 201 });
    } catch (dbErr) {
      console.error("[AdminOrdersAPI] Database error creating order:", dbErr);
      return NextResponse.json(
        { error: "Gagal menyimpan pesanan ke database", details: String(dbErr) },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("[AdminOrdersAPI] Error handling POST order request:", err);
    return NextResponse.json({ error: "Permintaan tidak valid" }, { status: 400 });
  }
}
