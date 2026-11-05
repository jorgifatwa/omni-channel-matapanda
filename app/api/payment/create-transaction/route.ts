import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createHash, timingSafeEqual } from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Creates (or reuses) a Midtrans Snap transaction for an order that already
 * exists in the database.
 *
 * The client only sends the order number. Amount, line items and customer
 * details are always taken from the database record, never from the request.
 */

type MidtransItem = {
  id: string;
  price: number;
  quantity: number;
  name: string;
};

const toIdr = (value: unknown): number => Math.round(Number(value) || 0);

/** Snap payment window; the checkout page shows a countdown to this time. */
const PAYMENT_WINDOW_HOURS = 24;
const clip = (value: string, max = 50): string => value.slice(0, max);

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const rawOrderNumber =
    (body as { orderNumber?: unknown; orderId?: unknown }).orderNumber ??
    (body as { orderId?: unknown }).orderId;
  const orderNumber = typeof rawOrderNumber === "string" ? rawOrderNumber.trim() : "";

  if (!orderNumber) {
    return NextResponse.json({ error: "Nomor pesanan wajib diisi." }, { status: 400 });
  }

  const serverKey = process.env.MIDTRANS_SERVER_KEY?.trim();
  if (!serverKey) {
    console.error("[Midtrans] MIDTRANS_SERVER_KEY belum dikonfigurasi.");
    return NextResponse.json(
      {
        error:
          "Pembayaran online belum tersedia: kunci server Midtrans belum dikonfigurasi. Silakan hubungi admin toko.",
      },
      { status: 503 }
    );
  }

  const isProd = process.env.MIDTRANS_IS_PRODUCTION === "true";
  // Public key for snap.js (Snap Embed). Read at runtime so no rebuild is needed.
  const clientKey =
    process.env.MIDTRANS_CLIENT_KEY?.trim() ||
    process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY?.trim() ||
    null;
  const snapUrl = isProd
    ? "https://app.midtrans.com/snap/v1/transactions"
    : "https://app.sandbox.midtrans.com/snap/v1/transactions";

  // 1. Load the order from the database
  let order;
  try {
    order = await prisma.order.findFirst({
      where: { orderNumber, deletedAt: null },
      include: { items: true, user: true, address: true, payment: true, shipment: true },
    });
  } catch (dbErr) {
    console.error("[Midtrans] Gagal memuat pesanan dari database:", dbErr);
    return NextResponse.json(
      { error: "Gagal memuat data pesanan dari database." },
      { status: 500 }
    );
  }

  if (!order) {
    return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
  }

  // Only the buyer who created the order (secret checkout token) or an admin
  // may start payment, so order numbers alone can't expose customer details.
  const providedToken =
    typeof (body as { checkoutToken?: unknown }).checkoutToken === "string"
      ? ((body as { checkoutToken: string }).checkoutToken).trim()
      : "";
  let authorized = false;
  if (providedToken && order.checkoutTokenHash) {
    const providedHash = createHash("sha256").update(providedToken).digest();
    const storedHash = Buffer.from(order.checkoutTokenHash, "hex");
    authorized =
      storedHash.length === providedHash.length && timingSafeEqual(storedHash, providedHash);
  }
  if (!authorized) {
    const session = await getServerSession(authOptions).catch(() => null);
    authorized = (session?.user as { role?: string } | undefined)?.role === "ADMIN";
  }
  if (!authorized) {
    return NextResponse.json(
      { error: "Akses pembayaran untuk pesanan ini tidak valid. Silakan checkout ulang." },
      { status: 403 }
    );
  }

  if (order.status !== "PENDING" || (order.payment && order.payment.status !== "PENDING")) {
    return NextResponse.json(
      { error: "Pesanan ini sudah dibayar, dibatalkan, atau tidak lagi menunggu pembayaran." },
      { status: 409 }
    );
  }

  if (order.items.length === 0) {
    return NextResponse.json({ error: "Pesanan tidak memiliki item." }, { status: 422 });
  }

  const grossAmount = toIdr(order.totalAmount);
  if (grossAmount < 1) {
    return NextResponse.json({ error: "Total pembayaran pesanan tidak valid." }, { status: 422 });
  }

  const expiresAt = new Date(order.createdAt.getTime() + PAYMENT_WINDOW_HOURS * 3_600_000);

  // 2. Reuse an existing Snap token for the same order and amount.
  //    Midtrans rejects a second transaction with the same order_id.
  if (order.payment?.snapToken && order.payment.snapRedirectUrl) {
    if (toIdr(order.payment.grossAmount) === grossAmount) {
      return NextResponse.json({
        token: order.payment.snapToken,
        redirect_url: order.payment.snapRedirectUrl,
        orderId: order.payment.midtransOrderId,
        isLive: isProd,
        clientKey,
        expiresAt: expiresAt.toISOString(),
      });
    }
    return NextResponse.json(
      { error: "Total pesanan berubah setelah pembayaran dibuat. Silakan buat pesanan baru." },
      { status: 409 }
    );
  }

  // 3. Build item_details from the DB so that sum(price * qty) == gross_amount
  const itemDetails: MidtransItem[] = order.items.map((it) => ({
    id: clip(it.sku || it.productId),
    price: toIdr(it.unitPrice),
    quantity: it.quantity,
    name: clip([it.productName, it.size, it.color].filter(Boolean).join(" / ")),
  }));

  const shippingCost = toIdr(order.shippingCost);
  if (shippingCost > 0) {
    itemDetails.push({
      id: "SHIPPING",
      price: shippingCost,
      quantity: 1,
      name: clip(`Ongkos Kirim${order.shipment ? ` ${order.shipment.courier} ${order.shipment.serviceName}` : ""}`),
    });
  }

  const discount = toIdr(order.discountAmount);
  if (discount > 0) {
    itemDetails.push({ id: "DISCOUNT", price: -discount, quantity: 1, name: "Diskon" });
  }

  const itemsSum = itemDetails.reduce((sum, it) => sum + it.price * it.quantity, 0);
  const diff = grossAmount - itemsSum;
  if (diff !== 0) {
    // Only expected from rounding decimals to whole rupiah
    if (Math.abs(diff) > itemDetails.length) {
      console.warn(
        `[Midtrans] Total pesanan ${order.orderNumber} (${grossAmount}) tidak sama dengan jumlah item (${itemsSum}); menambahkan baris penyesuaian.`
      );
    }
    itemDetails.push({ id: "ADJUSTMENT", price: diff, quantity: 1, name: "Penyesuaian Pembulatan" });
  }

  const recipient = order.address?.recipient || order.user?.name || "Customer";
  const [firstName, ...rest] = recipient.trim().split(/\s+/);
  const phone = order.address?.phone || order.user?.phone || undefined;
  const shippingAddress = order.address
    ? {
        first_name: firstName,
        last_name: rest.join(" "),
        phone,
        address: order.address.street,
        city: order.address.city,
        postal_code: order.address.postalCode || undefined,
      }
    : undefined;

  const appUrl = (
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");

  const payload = {
    transaction_details: {
      order_id: order.orderNumber,
      gross_amount: grossAmount,
    },
    item_details: itemDetails,
    customer_details: {
      first_name: firstName || "Customer",
      last_name: rest.join(" "),
      email: order.user?.email || undefined,
      phone,
      billing_address: shippingAddress,
      shipping_address: shippingAddress,
    },
    credit_card: { secure: true },
    expiry: { unit: "hours", duration: PAYMENT_WINDOW_HOURS },
    callbacks: { finish: `${appUrl}/checkout/finish` },
  };

  // 4. Call the Midtrans Snap API
  let snapData: { token?: string; redirect_url?: string; error_messages?: string[] };
  try {
    const res = await fetch(snapUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Basic ${Buffer.from(`${serverKey}:`).toString("base64")}`,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    snapData = await res.json().catch(() => ({}));

    if (!res.ok || !snapData.token || !snapData.redirect_url) {
      console.error(
        `[Midtrans] Snap API menolak transaksi ${order.orderNumber} (HTTP ${res.status}):`,
        snapData.error_messages
      );
      return NextResponse.json(
        {
          error: "Gagal membuat transaksi pembayaran Midtrans.",
          details: snapData.error_messages,
        },
        { status: 502 }
      );
    }
  } catch (netErr) {
    console.error("[Midtrans] Gagal menghubungi Snap API:", netErr);
    return NextResponse.json(
      { error: "Tidak dapat menghubungi Midtrans. Silakan coba lagi." },
      { status: 502 }
    );
  }

  // 5. Persist the payment record (FK uses the order's UUID)
  try {
    await prisma.payment.upsert({
      where: { orderId: order.id },
      update: {
        midtransOrderId: order.orderNumber,
        snapToken: snapData.token,
        snapRedirectUrl: snapData.redirect_url,
        grossAmount,
      },
      create: {
        orderId: order.id,
        midtransOrderId: order.orderNumber,
        snapToken: snapData.token,
        snapRedirectUrl: snapData.redirect_url,
        grossAmount,
      },
    });
  } catch (dbErr) {
    console.error(`[Midtrans] Gagal menyimpan data pembayaran ${order.orderNumber}:`, dbErr);
    return NextResponse.json(
      { error: "Transaksi dibuat, tetapi data pembayaran gagal disimpan. Silakan coba lagi." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    token: snapData.token,
    redirect_url: snapData.redirect_url,
    orderId: order.orderNumber,
    isLive: isProd,
    clientKey,
    expiresAt: expiresAt.toISOString(),
  });
}
