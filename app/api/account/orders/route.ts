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

      if (dbOrders && dbOrders.length > 0) {
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
          paymentMethod: o.payment?.paymentType || "Midtrans Snap",
          courier: o.shipment?.courier || "JNE",
          courierService: o.shipment?.serviceName || "REG",
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
            image: it.product?.images?.[0]?.url || "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80",
          })),
        }));

        return NextResponse.json({ orders: formatted });
      }
    } catch (dbErr) {
      console.warn("DB query for orders error / offline:", dbErr);
    }

    // Fallback: return mock orders for demo testing
    return NextResponse.json({
      orders: [
        {
          id: "ord-demo-001",
          orderNumber: "ZDC-2026-9812",
          date: "2026-09-29",
          createdAt: new Date().toISOString(),
          status: "PAID",
          totalAmount: 12010,
          subtotal: 10,
          shippingCost: 12000,
          currency: "IDR",
          paymentStatus: "SETTLEMENT",
          paymentMethod: "Midtrans Snap (QRIS / GoPay)",
          courier: "JNE",
          courierService: "JNE Reguler (REG)",
          trackingNumber: "JNE009823718291",
          shipmentStatus: "IN_TRANSIT",
          itemCount: 1,
          items: [
            {
              id: "oi-01",
              productName: "Dawn Gong Sunburn 01 T-shirt",
              sku: "DG-SB01-WHT-M",
              size: "M",
              color: "White",
              quantity: 1,
              unitPrice: 10,
              subtotal: 10,
              image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80",
            },
          ],
        },
      ],
    });
  } catch (error) {
    console.error("Account orders fetch error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil daftar pesanan" },
      { status: 500 }
    );
  }
}
