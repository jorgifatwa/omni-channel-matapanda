import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, waybill, email, phone } = body;

    const searchKey = (orderId || waybill || "").trim();
    const searchEmailOrPhone = (email || phone || "").trim().toLowerCase();

    if (!searchKey) {
      return NextResponse.json(
        { error: "Silakan masukkan Nomor Order ID atau Nomor Resi." },
        { status: 400 }
      );
    }

    // 1. Try querying PostgreSQL via Prisma
    try {
      const order = await prisma.order.findFirst({
        where: {
          deletedAt: null,
          OR: [
            { orderNumber: searchKey },
            ...(UUID_RE.test(searchKey) ? [{ id: searchKey }] : []),
            { shipment: { trackingNumber: searchKey } },
          ],
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
        return NextResponse.json(
          { error: "Pesanan tidak ditemukan. Periksa kembali Nomor Order ID atau Nomor Resi." },
          { status: 404 }
        );
      }

      // Optional verification if email/phone was entered
      if (searchEmailOrPhone) {
        const userEmail = order.user?.email?.toLowerCase() || "";
        const userPhone = order.user?.phone || order.address?.phone || "";
        const isEmailMatch = userEmail === searchEmailOrPhone || userEmail.includes(searchEmailOrPhone);
        const isPhoneMatch = userPhone.includes(searchEmailOrPhone);

        if (!isEmailMatch && !isPhoneMatch && !searchKey.startsWith("JNE") && !searchKey.startsWith("DHL")) {
          return NextResponse.json(
            { error: "Email atau No. Handphone tidak sesuai dengan pesanan ini." },
            { status: 403 }
          );
        }
      }

      return NextResponse.json({
        success: true,
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
            paymentType: order.payment?.paymentType || "-",
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
          shippingAddress: {
            recipient: order.address?.recipient || order.user?.name || "-",
            city: order.address?.city || "-",
            province: order.address?.province || "-",
            country: order.address?.country || "-",
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
      console.error("[TrackingLookupAPI] Database query failed:", dbErr);
      return NextResponse.json(
        { error: "Gagal memuat data pesanan dari database. Silakan coba lagi nanti." },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error("Public tracking lookup error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat melacak pesanan." },
      { status: 500 }
    );
  }
}
