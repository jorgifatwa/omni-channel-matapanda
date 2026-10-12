import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      orderId,
      grossAmount,
      customerDetails,
      itemDetails,
    } = body;

    const midtransOrderId =
      orderId || `ZDC-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const amount = Number(grossAmount) || 500000;

    const isProd = process.env.MIDTRANS_IS_PRODUCTION === "true";
    const serverKey =
      process.env.MIDTRANS_SERVER_KEY || "SB-Mid-server-demo";
    const snapUrl = isProd
      ? "https://app.midtrans.com/snap/v1/transactions"
      : "https://app.sandbox.midtrans.com/snap/v1/transactions";

    const payload = {
      transaction_details: {
        order_id: midtransOrderId,
        gross_amount: amount,
      },
      customer_details: {
        first_name: customerDetails?.firstName || "Customer",
        last_name: customerDetails?.lastName || "",
        email: customerDetails?.email || "customer@example.com",
        phone: customerDetails?.phone || "+6281234567890",
        billing_address: customerDetails?.billingAddress,
        shipping_address: customerDetails?.shippingAddress,
      },
      item_details: itemDetails || [
        {
          id: "DG-ITEM",
          price: amount,
          quantity: 1,
          name: "ZODIAC Streetwear Apparel",
        },
      ],
      credit_card: {
        secure: true,
      },
      callbacks: {
        finish: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/checkout/finish`,
      },
    };

    // If server key is configured, call Midtrans Snap API
    if (serverKey && serverKey !== "SB-Mid-server-demo") {
      try {
        const authHeader = `Basic ${Buffer.from(`${serverKey}:`).toString("base64")}`;
        const res = await fetch(snapUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: authHeader,
          },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const snapData = await res.json();
          return NextResponse.json({
            token: snapData.token,
            redirect_url: snapData.redirect_url,
            orderId: midtransOrderId,
            isLive: true,
          });
        }
      } catch (netErr) {
        console.warn("[Midtrans Snap API] Network unreachable, using development fallback:", netErr);
      }
    }

    // Fallback sandbox simulation token for development
    const mockToken = `snap_token_${Date.now()}_sandbox`;
    const mockRedirectUrl = `https://app.sandbox.midtrans.com/snap/v2/vtweb/${mockToken}`;

    // Optionally record in database if connected
    try {
      await prisma.payment.upsert({
        where: { midtransOrderId },
        update: {
          snapToken: mockToken,
          snapRedirectUrl: mockRedirectUrl,
          grossAmount: amount,
        },
        create: {
          midtransOrderId,
          snapToken: mockToken,
          snapRedirectUrl: mockRedirectUrl,
          grossAmount: amount,
          orderId: midtransOrderId,
        },
      });
    } catch {
      // Ignore if database is not connected
    }

    return NextResponse.json({
      token: mockToken,
      redirect_url: mockRedirectUrl,
      orderId: midtransOrderId,
      mode: "sandbox_simulation",
    });
  } catch (error) {
    console.error("Midtrans create transaction error:", error);
    return NextResponse.json(
      { error: "Gagal membuat transaksi Midtrans" },
      { status: 500 }
    );
  }
}
