import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized. Silakan masuk terlebih dahulu." },
        { status: 401 }
      );
    }

    const userId = (session.user as { id?: string }).id;
    const userEmail = session.user.email?.toLowerCase();

    // 1. Fetch orders from PostgreSQL via Prisma
    try {
      const dbOrders = await prisma.order.findMany({
        where: {
          deletedAt: null,
          OR: [
            ...(userId ? [{ userId }] : []),
            ...(userEmail ? [{ user: { email: userEmail } }] : []),
          ],
        },
        include: {
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
        orderBy: {
          createdAt: "desc",
        },
      });

      const formatted = dbOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        date: o.createdAt.toISOString().slice(0, 10),
        createdAt: o.createdAt.toISOString(),
        status: o.status,
        totalAmount: Number(o.totalAmount),
        subtotal: Number(o.subtotal),
        shippingCost: Number(o.shippingCost),
        currency: o.currency || "IDR",
        paymentStatus: o.payment?.status || (o.status === "PAID" || o.status === "COMPLETED" ? "SETTLEMENT" : "PENDING"),
        paymentMethod: o.payment?.paymentType || "-",
        courier: o.shipment?.courier || "-",
        courierService: o.shipment?.serviceName || "-",
        trackingNumber: o.shipment?.trackingNumber || null,
        shipmentStatus: o.shipment?.status || "PENDING",
        itemCount: o.items.reduce((acc, it) => acc + it.quantity, 0),
        items: o.items.map((it) => ({
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
      }));

      return NextResponse.json({ orders: formatted });
    } catch (dbErr) {
      console.error("[AccountOrdersAPI] Database query failed:", dbErr);
      return NextResponse.json(
        { orders: [], error: "Gagal memuat daftar pesanan dari database" },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error("Account orders fetch error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil daftar pesanan" },
      { status: 500 }
    );
  }
}
