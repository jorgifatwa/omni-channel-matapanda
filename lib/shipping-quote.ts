/**
 * shipping-quote.ts
 *
 * Server-side parcel weight and domestic shipping quotes.
 * - The parcel weight is always computed from product weights in the
 *   database (never trusted from the browser) plus packaging.
 * - Quotes come from RajaOngkir when configured, otherwise from a local
 *   JNE rate table. The same function is used by the checkout shipping API
 *   and when an order is created, so the fee saved on the order matches the
 *   weight of what is actually being shipped.
 *
 * Server-only.
 */

import { prisma } from "@/lib/prisma";
import {
  calculateRajaOngkirRates,
  getOriginId,
  isRajaOngkirConfigured,
  resolveDestinationId,
  type ShippingRateOption,
} from "@/lib/rajaongkir";

/** Weight of the packaging (polymailer, tag, etc.) added once per parcel. */
export const PACKAGING_GRAMS = 100;
/** Weight used for a product without a valid weight in the database. */
export const DEFAULT_PRODUCT_GRAMS = 250;
const MAX_QTY_PER_LINE = 999;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface WeighedLine {
  weightGrams: number | null | undefined;
  quantity: number;
}

/** Total parcel weight in grams: sum of product weights × quantity + packaging. */
export function parcelWeightGrams(lines: WeighedLine[]): number {
  const items = lines.reduce((sum, line) => {
    const unit =
      Number.isFinite(line.weightGrams) && Number(line.weightGrams) > 0
        ? Number(line.weightGrams)
        : DEFAULT_PRODUCT_GRAMS;
    return sum + unit * Math.max(0, line.quantity);
  }, 0);
  return Math.round(items + PACKAGING_GRAMS);
}

/**
 * Weighs cart lines sent by the browser ({ productId, quantity }) using the
 * product weights stored in the database. Unknown products are ignored.
 */
export async function weighCartLines(rawItems: unknown): Promise<number> {
  const lines = (Array.isArray(rawItems) ? rawItems : [])
    .filter((it): it is Record<string, unknown> => !!it && typeof it === "object")
    .map((it) => ({
      productId: String(it.productId ?? ""),
      quantity: Math.min(MAX_QTY_PER_LINE, Math.max(0, Math.floor(Number(it.quantity) || 0))),
    }))
    .filter((l) => UUID_RE.test(l.productId) && l.quantity > 0);

  if (lines.length === 0) return parcelWeightGrams([]);

  const products = await prisma.product.findMany({
    where: { id: { in: Array.from(new Set(lines.map((l) => l.productId))) }, deletedAt: null },
    select: { id: true, weightGrams: true },
  });
  const weightById = new Map(products.map((p) => [p.id, p.weightGrams]));

  return parcelWeightGrams(
    lines
      .filter((l) => weightById.has(l.productId))
      .map((l) => ({ weightGrams: weightById.get(l.productId), quantity: l.quantity }))
  );
}

export interface ShippingQuote {
  provider: "rajaongkir" | "local_estimation";
  rates: ShippingRateOption[];
  destinationId?: number;
  originId?: number;
}

/** Local JNE rate table used when RajaOngkir is not configured or fails. */
function localRates(destinationCity: string, weightGrams: number): ShippingRateOption[] {
  // Couriers bill per started kilogram.
  const weightKg = Math.max(1, Math.ceil(weightGrams / 1000));
  const city = destinationCity.toLowerCase();

  let regRate = 12000;
  let yesRate = 24000;
  let okeRate = 10000;

  if (["bandung", "bogor", "bekasi", "depok", "tangerang"].some((c) => city.includes(c))) {
    regRate = 14000;
    yesRate = 26000;
    okeRate = 11000;
  } else if (["surabaya", "semarang", "yogyakarta", "solo", "malang"].some((c) => city.includes(c))) {
    regRate = 19000;
    yesRate = 35000;
    okeRate = 16000;
  } else if (["bali", "denpasar"].some((c) => city.includes(c))) {
    regRate = 22000;
    yesRate = 42000;
    okeRate = 18000;
  } else if (["medan", "makassar", "palembang", "batam"].some((c) => city.includes(c))) {
    regRate = 32000;
    yesRate = 58000;
    okeRate = 27000;
  }

  return [
    {
      id: "JNE_REG",
      courier: "JNE",
      courierName: "JNE",
      service: "REG",
      name: "JNE Reguler (REG)",
      cost: regRate * weightKg,
      currency: "IDR",
      estimatedDays: "2-3 Hari",
    },
    {
      id: "JNE_YES",
      courier: "JNE",
      courierName: "JNE",
      service: "YES",
      name: "JNE Yakin Esok Sampai (YES)",
      cost: yesRate * weightKg,
      currency: "IDR",
      estimatedDays: "1 Hari (Besok Sampai)",
    },
    {
      id: "JNE_OKE",
      courier: "JNE",
      courierName: "JNE",
      service: "OKE",
      name: "JNE Ongkos Kirim Ekonomis (OKE)",
      cost: okeRate * weightKg,
      currency: "IDR",
      estimatedDays: "3-5 Hari",
    },
  ];
}

/** Quotes domestic shipping rates for a parcel of the given weight. */
export async function quoteDomesticShipping(
  destinationCity: string,
  destinationPostalCode: string,
  weightGrams: number
): Promise<ShippingQuote> {
  const weight = Math.max(1, Math.round(weightGrams));

  if (isRajaOngkirConfigured()) {
    try {
      const [originId, destinationId] = await Promise.all([
        getOriginId(),
        resolveDestinationId(destinationCity, destinationPostalCode),
      ]);
      if (destinationId) {
        const rates = await calculateRajaOngkirRates(originId, destinationId, weight);
        if (rates.length > 0) {
          return { provider: "rajaongkir", rates, destinationId, originId };
        }
      } else {
        console.warn(`[RajaOngkir] Destination not found for "${destinationCity}"`);
      }
    } catch (err) {
      console.warn("RajaOngkir live API call failed, falling back to local rate table:", err);
    }
  }

  return { provider: "local_estimation", rates: localRates(destinationCity, weight) };
}
