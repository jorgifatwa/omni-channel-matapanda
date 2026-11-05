import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { paymentMethodLabel } from "@/lib/payment-methods";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized. Silakan login terlebih dahulu." },
        { status: 401 }
      );
    }

    const orderIdOrNumber = params.id;
    const userId = (session.user as { id?: string }).id;
    const userEmail = session.user.email?.toLowerCase();

    // 1. Query PostgreSQL via Prisma
    try {
      const order = await prisma.order.findFirst({
        where: {
          ...(UUID_RE.test(orderIdOrNumber)
            ? { id: orderIdOrNumber }
            : { orderNumber: orderIdOrNumber }),
          deletedAt: null,
        },
        include: {
          user: true,
          items: {
            include: {
              product: {
                include: {
                  images: true,
                },
              },
            },
          },
          shipment: true,
          payment: true,
          address: true,
        },
      });

      if (!order) {
        return NextResponse.json({ error: "Pesanan tidak ditemukan" }, { status: 404 });
      }

      // Authorization check: Only order owner or admin can view
      const isOwner =
        order.userId === userId ||
        order.user?.email?.toLowerCase() === userEmail;
      const isAdmin = (session.user as { role?: string }).role === "ADMIN";

      if (!isOwner && !isAdmin) {
        return NextResponse.json(
          { error: "Forbidden. Anda tidak memiliki akses ke pesanan ini." },
          { status: 403 }
        );
      }

      return NextResponse.json({
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          date: order.createdAt.toISOString().slice(0, 10),
          createdAt: order.createdAt.toISOString(),
          status: order.status,
          totalAmount: Number(order.totalAmount),
          subtotal: Number(order.subtotal),
          shippingCost: Number(order.shippingCost),
          discountAmount: Number(order.discountAmount),
          currency: order.currency || "IDR",
          payment: {
            status: order.payment?.status || (order.status === "PAID" ? "SETTLEMENT" : "PENDING"),
            paymentType: paymentMethodLabel(order.payment?.paymentType),
            snapRedirectUrl: order.payment?.snapRedirectUrl || null,
            paidAt: order.payment?.paidAt?.toISOString() || null,
          },
          shipment: {
            courier: order.shipment?.courier || "-",
            serviceName: order.shipment?.serviceName || "-",
            trackingNumber: order.shipment?.trackingNumber || null,
            status: order.shipment?.status || "PENDING",
            originCity: order.shipment?.originCity || "-",
            destinationCity: order.shipment?.destinationCity || order.address?.city || "-",
            destinationCountry: order.shipment?.destinationCountry || order.address?.country || "-",
            estimatedDays: order.shipment?.estimatedDays || "-",
            trackingHistory: order.shipment?.trackingHistory || null,
          },
          shippingAddress: order.address
            ? {
                recipient: order.address.recipient,
                phone: order.address.phone,
                street: order.address.street,
                apartment: order.address.apartment,
                city: order.address.city,
                province: order.address.province,
                postalCode: order.address.postalCode,
                country: order.address.country,
              }
            : {
                recipient: order.user?.name || "-",
                phone: order.user?.phone || "-",
                street: "-",
                city: "-",
                province: "-",
                postalCode: "-",
                country: "-",
              },
          items: order.items.map((it) => ({
            id: it.id,
            productName: it.productName,
            sku: it.sku,
            size: it.size,
            color: it.color,
            quantity: it.quantity,
            unitPrice: Number(it.unitPrice),
            subtotal: Number(it.subtotal),
            image: it.product?.images?.[0]?.url || "",
          })),
        },
      });
    } catch (dbErr) {
      console.error("[AccountOrderDetailAPI] Database query failed:", dbErr);
      return NextResponse.json(
        { error: "Gagal memuat detail pesanan dari database" },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error("Order detail error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil detail pesanan" },
      { status: 500 }
    );
  }
}
