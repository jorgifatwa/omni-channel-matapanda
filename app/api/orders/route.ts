import { NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { POST as createOrderInDatabase } from "@/app/api/admin/orders/route";
import { priceCheckoutOrder, OrderPricingError, type OrderPricing } from "@/lib/order-pricing";
import { incrementCouponUsage, releaseCouponUsage } from "@/lib/coupon-store";

/**
 * Public endpoint used by checkout to create a NEW order.
 *
 * - Customers can only create PENDING orders: payment, order and shipment
 *   statuses and the tracking number are forced server-side, so a buyer can
 *   never mark an order as paid or shipped. Existing orders cannot be modified
 *   here (duplicates return 409); status changes happen via the Midtrans
 *   webhook or the admin panel.
 * - Prices are tamper-proof: unit prices, subtotal, discounts (catalog
 *   campaigns, Paket Diskon, Paket Hadiah, coupon) and the total are
 *   recomputed from the database by {@link priceCheckoutOrder}. Client-sent
 *   amounts are ignored; only the selected shipping fee is accepted after a
 *   sanity check.
 * - A coupon use is claimed atomically (respecting its usage limit) when the
 *   order is saved, and given back if saving fails.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Data pesanan tidak valid." }, { status: 400 });
  }

  // Contact & address must be real buyer input (no placeholder fallbacks).
  const input = body as {
    customerEmail?: unknown;
    customerPhone?: unknown;
    shippingAddress?: { street?: unknown; city?: unknown } | null;
  };
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str(input.customerEmail))) {
    return NextResponse.json({ error: "Email pembeli wajib diisi dengan benar." }, { status: 400 });
  }
  if (str(input.customerPhone).replace(/\D/g, "").length < 8) {
    return NextResponse.json({ error: "Nomor handphone / WhatsApp wajib diisi." }, { status: 400 });
  }
  if (!str(input.shippingAddress?.street) || !str(input.shippingAddress?.city)) {
    return NextResponse.json({ error: "Alamat dan kota pengiriman wajib diisi." }, { status: 400 });
  }

  let pricing: OrderPricing;
  try {
    pricing = await priceCheckoutOrder(body as Record<string, unknown>);
  } catch (err) {
    if (err instanceof OrderPricingError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[OrdersAPI] Failed to price order from database:", err);
    return NextResponse.json(
      { error: "Harga pesanan tidak dapat dihitung karena database tidak tersedia. Silakan coba lagi." },
      { status: 503 }
    );
  }

  // Claim one coupon use atomically before saving the order.
  let claimedCoupon: string | null = null;
  if (pricing.couponCode) {
    try {
      const claimed = await incrementCouponUsage(pricing.couponCode);
      if (!claimed) {
        return NextResponse.json(
          {
            error: `Kupon "${pricing.couponCode}" tidak dapat digunakan lagi (kuota habis atau sudah tidak aktif). Hapus kupon lalu coba lagi.`,
          },
          { status: 409 }
        );
      }
      claimedCoupon = pricing.couponCode;
    } catch (err) {
      console.error("[OrdersAPI] Failed to claim coupon usage:", err);
      return NextResponse.json(
        { error: "Kupon tidak dapat diproses karena database tidak tersedia. Silakan coba lagi." },
        { status: 503 }
      );
    }
  }

  // Secret token proving this buyer created the order; only its hash is stored.
  const checkoutToken = randomBytes(24).toString("hex");
  const checkoutTokenHash = createHash("sha256").update(checkoutToken).digest("hex");

  // Order numbers are generated here (never taken from the browser): random,
  // not guessable, and never ending in "-<digits>" (reserved for payment retries).
  const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const rand = randomBytes(6);
  const suffix = Array.from(rand, (b) => LETTERS[b % LETTERS.length]).join("");
  const ymd = new Date(Date.now() + 7 * 3_600_000).toISOString().slice(2, 10).replace(/-/g, "");
  const orderNumber = `ZDC-${ymd}-${suffix}`;

  const sanitized = {
    ...body,
    orderNumber,
    couponCode: pricing.couponCode || null,
    subtotal: pricing.subtotal,
    shippingCost: pricing.shippingCost,
    discountAmount: pricing.discountAmount,
    totalAmount: pricing.totalAmount,
    courier: pricing.courier,
    courierService: pricing.courierService,
    items: pricing.items.map((it) => ({
      productId: it.productId,
      variantId: it.variantId,
      productName: it.productName,
      sku: it.sku,
      image: it.image,
      size: it.size,
      color: it.color,
      unitPrice: it.unitPrice,
      quantity: it.quantity,
      subtotal: it.subtotal,
    })),
    paymentStatus: "PENDING",
    orderStatus: "PENDING",
    shipmentStatus: "PENDING",
    trackingNumber: "-",
    midtransTransactionId: null,
  };

  let response: Response;
  try {
    response = await createOrderInDatabase(
      new Request(request.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...sanitized, checkoutTokenHash }),
      })
    );
  } catch (err) {
    console.error("[OrdersAPI] Unexpected error saving order:", err);
    response = NextResponse.json({ error: "Gagal menyimpan pesanan ke database" }, { status: 500 });
  }

  const data = (await response.json().catch(() => ({}))) as {
    error?: string;
    order?: { id?: string; orderNumber?: string };
  };

  if (!response.ok) {
    if (claimedCoupon) {
      await releaseCouponUsage(claimedCoupon).catch((err) =>
        console.error("[OrdersAPI] Failed to release coupon usage:", err)
      );
    }
    return NextResponse.json(data, { status: response.status });
  }

  // Return the order exactly as priced and saved by the server.
  return NextResponse.json(
    {
      success: true,
      order: {
        ...sanitized,
        id: data.order?.id,
        orderNumber: data.order?.orderNumber ?? sanitized.orderNumber,
      },
      checkoutToken,
      pricing: {
        subtotal: pricing.subtotal,
        bundleDiscount: pricing.bundleDiscount,
        bundleName: pricing.bundleName,
        couponCode: pricing.couponCode,
        couponDiscount: pricing.couponDiscount,
        discountAmount: pricing.discountAmount,
        shippingCost: pricing.shippingCost,
        totalAmount: pricing.totalAmount,
      },
    },
    { status: 201 }
  );
}
