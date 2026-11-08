/**
 * order-pricing.ts
 *
 * Server-side (tamper-proof) pricing for storefront checkout orders.
 * Every price is recomputed from the database: product / variant, active
 * discount campaigns (catalog, Paket Diskon, Paket Hadiah) and the coupon.
 * Client-sent prices, subtotals and discount amounts are never trusted.
 *
 * Server-only.
 */

import { prisma } from "@/lib/prisma";
import { getActiveDiscounts } from "@/lib/discount-store";
import {
  calculateProductDiscount,
  calculateBundlePackageDiscount,
  calculateGiftPackageReward,
  type CartItemForDiscount,
} from "@/lib/discount-engine";
import { getCouponByCode, normalizeCouponCode } from "@/lib/coupon-store";
import { evaluateCoupon } from "@/lib/coupon-engine";
import { parcelWeightGrams, quoteDomesticShipping, type WeighedLine } from "@/lib/shipping-quote";

/** Upper bound for a single order's shipping fee (Rp 10.000.000). */
export const MAX_SHIPPING_COST = 10_000_000;
const MAX_QTY_PER_LINE = 999;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface PricedOrderItem {
  productId: string;
  variantId: string | null;
  productName: string;
  sku: string;
  image: string;
  size: string;
  color: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  isGift: boolean;
}

export interface OrderPricing {
  items: PricedOrderItem[];
  subtotal: number;
  bundleDiscount: number;
  bundleName: string | null;
  couponCode: string | null;
  couponDiscount: number;
  discountAmount: number;
  shippingCost: number;
  /** Parcel weight in grams (product weights from the database + packaging). */
  weightGrams: number;
  totalAmount: number;
  courier: string;
  courierService: string;
}

/** A pricing failure that should be shown to the customer. */
export class OrderPricingError extends Error {
  constructor(message: string, public status: number = 400) {
    super(message);
    this.name = "OrderPricingError";
  }
}

function cleanText(value: unknown, fallback: string, maxLength = 80): string {
  const text = typeof value === "string" ? value.trim() : "";
  return (text || fallback).slice(0, maxLength);
}

function sameText(a: string | null | undefined, b: string | null | undefined): boolean {
  return (a || "").trim().toLowerCase() === (b || "").trim().toLowerCase();
}

/** Gift lines are always rebuilt by the server, so client gift lines are ignored. */
function isClientGiftLine(it: Record<string, unknown>): boolean {
  if (it.isGift === true) return true;
  return (
    Number(it.unitPrice) === 0 &&
    sameText(String(it.size ?? ""), "Free") &&
    sameText(String(it.color ?? ""), "Hadiah")
  );
}

function money(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Recomputes all prices and totals of a checkout order from the database.
 * Throws {@link OrderPricingError} for problems the customer must fix and lets
 * database errors propagate (callers should answer 503).
 */
export async function priceCheckoutOrder(body: Record<string, unknown>): Promise<OrderPricing> {
  // ---------- 1. Parse client lines (only ids, size/color and quantity are used) ----------
  const rawItems = Array.isArray(body.items) ? (body.items as Record<string, unknown>[]) : [];
  const lines = rawItems
    .filter((it) => it && typeof it === "object" && !isClientGiftLine(it))
    .map((it) => ({
      productId: String(it.productId ?? ""),
      variantId: typeof it.variantId === "string" ? it.variantId : null,
      size: cleanText(it.size, "Standard"),
      color: cleanText(it.color, "Default"),
      image: typeof it.image === "string" ? it.image.slice(0, 1000) : "",
      quantity: Number(it.quantity),
    }));

  if (lines.length === 0) {
    throw new OrderPricingError("Keranjang belanja kosong.");
  }
  for (const line of lines) {
    if (!UUID_RE.test(line.productId)) {
      throw new OrderPricingError("Data produk pada pesanan tidak valid.");
    }
    if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > MAX_QTY_PER_LINE) {
      throw new OrderPricingError("Jumlah produk pada pesanan tidak valid.");
    }
  }

  // ---------- 2. Shipping selection (the fee itself is re-quoted in step 7) ----------
  const address =
    body.shippingAddress && typeof body.shippingAddress === "object"
      ? (body.shippingAddress as Record<string, unknown>)
      : {};
  const destinationCity = cleanText(address.city, "", 120);
  const destinationPostalCode = cleanText(address.postalCode, "", 10);
  const shippingRateId = cleanText(body.shippingRateId, "", 80);
  const clientCourier = cleanText(body.courier, "", 20);
  const clientCourierService = cleanText(body.courierService, "", 120);
  if (!destinationCity) {
    throw new OrderPricingError("Kota pengiriman wajib diisi.");
  }

  // ---------- 3. Load products & campaigns from the database ----------
  const productIds = Array.from(new Set(lines.map((l) => l.productId)));
  const [products, campaigns] = await Promise.all([
    prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true, deletedAt: null },
      include: {
        variants: { where: { deletedAt: null } },
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
      },
    }),
    getActiveDiscounts(),
  ]);
  const productById = new Map(products.map((p) => [p.id, p]));

  // ---------- 4. Price each line from the DB ----------
  const stockUse = new Map<string, { needed: number; available: number; name: string }>();
  const pricedItems: PricedOrderItem[] = [];
  const weighedLines: WeighedLine[] = [];
  const discountInputs: CartItemForDiscount[] = [];

  for (const line of lines) {
    const product = productById.get(line.productId);
    if (!product) {
      throw new OrderPricingError(
        "Salah satu produk di keranjang sudah tidak tersedia. Hapus produk tersebut lalu coba lagi.",
        409
      );
    }

    const variant =
      (line.variantId && product.variants.find((v) => v.id === line.variantId)) ||
      product.variants.find((v) => sameText(v.size, line.size) && sameText(v.color, line.color)) ||
      null;

    // A product with variants must be ordered as one of them; otherwise the
    // order would skip the variant stock check and variant stock would drift.
    if (!variant && product.variants.length > 0) {
      throw new OrderPricingError(
        `Ukuran/warna untuk "${product.name}" tidak tersedia. Hapus produk tersebut dari keranjang lalu pilih varian yang ada.`,
        409
      );
    }

    const stockKey = variant ? `v:${variant.id}` : `p:${product.id}`;
    const stockEntry = stockUse.get(stockKey) || {
      needed: 0,
      available: variant ? variant.stock : product.stock,
      name: variant ? `${product.name} (${variant.size} / ${variant.color})` : product.name,
    };
    stockEntry.needed += line.quantity;
    stockUse.set(stockKey, stockEntry);

    const resolved = calculateProductDiscount(
      {
        id: product.id,
        price: Number(product.price),
        discountPrice: product.discountPrice !== null ? Number(product.discountPrice) : null,
        categoryId: product.categoryId,
      },
      campaigns
    );
    const unitPrice = money(resolved.discountPrice);

    pricedItems.push({
      productId: product.id,
      variantId: variant?.id ?? null,
      productName: product.name,
      sku: variant?.sku || product.sku,
      image: variant?.image || product.images[0]?.url || line.image,
      size: variant?.size ?? line.size,
      color: variant?.color ?? line.color,
      unitPrice,
      quantity: line.quantity,
      subtotal: money(unitPrice * line.quantity),
      isGift: false,
    });
    weighedLines.push({ weightGrams: product.weightGrams, quantity: line.quantity });
    discountInputs.push({
      productId: product.id,
      priceNumber: unitPrice,
      quantity: line.quantity,
      categoryId: product.categoryId,
    });
  }

  for (const entry of Array.from(stockUse.values())) {
    if (entry.needed > entry.available) {
      throw new OrderPricingError(
        entry.available > 0
          ? `Stok ${entry.name} tidak mencukupi (tersisa ${entry.available}).`
          : `Stok ${entry.name} sudah habis.`,
        409
      );
    }
  }

  const subtotal = money(pricedItems.reduce((sum, it) => sum + it.subtotal, 0));

  // ---------- 5. Paket Diskon (bundle) ----------
  const bundle = calculateBundlePackageDiscount(discountInputs, campaigns);
  const bundleDiscount = bundle.isEligible ? Math.min(bundle.discountAmount, subtotal) : 0;

  // ---------- 6. Paket Hadiah (gift) — added by the server only ----------
  const gift = calculateGiftPackageReward(discountInputs, campaigns);
  if (gift.isEligible && gift.giftProductId && UUID_RE.test(gift.giftProductId)) {
    const giftProduct = await prisma.product.findFirst({
      where: { id: gift.giftProductId, isActive: true, deletedAt: null },
      include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
    });
    const giftQty = Math.max(1, gift.giftQuantity || 1);
    const alreadyNeeded = stockUse.get(`p:${gift.giftProductId}`)?.needed ?? 0;
    if (giftProduct && giftProduct.stock - alreadyNeeded >= giftQty) {
      pricedItems.push({
        productId: giftProduct.id,
        variantId: null,
        productName: `${giftProduct.name} (Hadiah Gratis)`,
        sku: giftProduct.sku,
        image: giftProduct.images[0]?.url || gift.giftProductImage || "",
        size: "Free",
        color: "Hadiah",
        unitPrice: 0,
        quantity: giftQty,
        subtotal: 0,
        isGift: true,
      });
      weighedLines.push({ weightGrams: giftProduct.weightGrams, quantity: giftQty });
    } else {
      console.warn(
        "[OrderPricing] Gift product unavailable or out of stock, gift skipped:",
        gift.giftProductId
      );
    }
  }

  // ---------- 7. Shipping fee, re-quoted from the real parcel weight ----------
  const weightGrams = parcelWeightGrams(weighedLines);
  const quote = await quoteDomesticShipping(destinationCity, destinationPostalCode, weightGrams);
  const rate =
    (shippingRateId && quote.rates.find((r) => r.id === shippingRateId)) ||
    quote.rates.find(
      (r) => sameText(r.courier, clientCourier) && sameText(r.name, clientCourierService)
    );
  if (!rate) {
    throw new OrderPricingError(
      "Layanan pengiriman yang dipilih sudah tidak tersedia. Silakan pilih ulang layanan pengiriman.",
      409
    );
  }
  const shippingCost = Math.round(rate.cost);
  if (!Number.isFinite(shippingCost) || shippingCost <= 0 || shippingCost > MAX_SHIPPING_COST) {
    throw new OrderPricingError("Ongkos kirim tidak valid. Silakan pilih ulang layanan pengiriman.");
  }
  const courier = rate.courier.slice(0, 20);
  const courierService = rate.name.slice(0, 120);

  // ---------- 8. Coupon (validated server-side) ----------
  const rawCouponCode = typeof body.couponCode === "string" ? body.couponCode : "";
  let couponCode: string | null = null;
  let couponDiscount = 0;
  if (rawCouponCode.trim()) {
    const coupon = await getCouponByCode(rawCouponCode);
    const result = evaluateCoupon(
      rawCouponCode,
      subtotal,
      coupon,
      Math.max(0, subtotal - bundleDiscount)
    );
    if (result.valid) {
      couponCode = normalizeCouponCode(rawCouponCode);
      couponDiscount = money(result.discountAmount);
    } else if (result.reason !== "MIN_SPEND") {
      // Same as the cart: below minimum spend just means no coupon discount.
      throw new OrderPricingError(`${result.message} Hapus kupon lalu coba lagi.`);
    }
  }

  // ---------- 9. Totals ----------
  const discountAmount = money(Math.min(subtotal, bundleDiscount + couponDiscount));
  const totalAmount = money(Math.max(0, subtotal - discountAmount) + shippingCost);

  return {
    items: pricedItems,
    subtotal,
    bundleDiscount: money(bundleDiscount),
    bundleName: bundle.isEligible ? bundle.name || null : null,
    couponCode: couponDiscount > 0 ? couponCode : null,
    couponDiscount,
    discountAmount,
    shippingCost,
    weightGrams,
    totalAmount,
    courier,
    courierService,
  };
}
