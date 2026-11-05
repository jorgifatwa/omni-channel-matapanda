/**
 * coupon-engine.ts
 *
 * Core coupon validation and calculation engine.
 * Supports stacking on top of already discounted catalog items (double discount).
 */

import { getCouponByCode } from "@/lib/coupon-store";
import { type Coupon } from "@/lib/coupon-types";

/** Why a coupon was rejected (undefined when valid). */
export type CouponRejectReason =
  | "EMPTY"
  | "NOT_FOUND"
  | "INACTIVE"
  | "NOT_STARTED"
  | "EXPIRED"
  | "QUOTA_EXHAUSTED"
  | "MIN_SPEND";

export interface CouponValidationResult {
  valid: boolean;
  message: string;
  coupon?: {
    id: string;
    code: string;
    name: string;
    discountType: "PERCENTAGE" | "FIXED_AMOUNT";
    discountValue: number;
    minSpend: number;
    maxDiscount?: number | null;
  };
  discountAmount: number;
  subtotalAfterCoupon: number;
  reason?: CouponRejectReason;
}

/**
 * Looks the coupon up in the database and evaluates it against the subtotal.
 * Throws when the database cannot be reached.
 */
export async function validateAndApplyCoupon(
  rawCode: string,
  subtotal: number
): Promise<CouponValidationResult> {
  const coupon = rawCode && rawCode.trim() ? await getCouponByCode(rawCode) : null;
  return evaluateCoupon(rawCode, subtotal, coupon);
}

/**
 * Pure coupon evaluation.
 * - `subtotal` is used for the minimum-spend check.
 * - `discountBase` (defaults to `subtotal`) is the amount the coupon discount is
 *   calculated on, e.g. the subtotal after a bundle discount (mirrors the cart).
 */
export function evaluateCoupon(
  rawCode: string,
  subtotal: number,
  coupon: Coupon | null,
  discountBase: number = subtotal
): CouponValidationResult {
  if (!rawCode || !rawCode.trim()) {
    return {
      valid: false,
      message: "Silakan masukkan kode kupon.",
      discountAmount: 0,
      subtotalAfterCoupon: subtotal,
      reason: "EMPTY",
    };
  }

  if (!coupon) {
    return {
      valid: false,
      message: `Kode kupon "${rawCode.trim().toUpperCase()}" tidak ditemukan atau tidak valid.`,
      discountAmount: 0,
      subtotalAfterCoupon: subtotal,
      reason: "NOT_FOUND",
    };
  }

  // 1. Status Check
  if (!coupon.isActive) {
    return {
      valid: false,
      message: `Kupon "${coupon.code}" saat ini sedang dinonaktifkan.`,
      discountAmount: 0,
      subtotalAfterCoupon: subtotal,
      reason: "INACTIVE",
    };
  }

  // 2. Schedule Check
  const now = new Date();
  const nowIso = now.toISOString();

  if (coupon.startDate && coupon.startDate > nowIso) {
    const startStr = new Date(coupon.startDate).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    return {
      valid: false,
      message: `Kupon "${coupon.code}" belum berlaku (mulai aktif ${startStr}).`,
      discountAmount: 0,
      subtotalAfterCoupon: subtotal,
      reason: "NOT_STARTED",
    };
  }

  if (coupon.endDate && coupon.endDate < nowIso) {
    return {
      valid: false,
      message: `Kupon "${coupon.code}" sudah kedaluwarsa.`,
      discountAmount: 0,
      subtotalAfterCoupon: subtotal,
      reason: "EXPIRED",
    };
  }

  // 3. Usage Limit Check
  if (coupon.usageLimit !== null && coupon.usageLimit !== undefined && coupon.usageLimit > 0) {
    if (coupon.usageCount >= coupon.usageLimit) {
      return {
        valid: false,
        message: `Kuota penggunaan kupon "${coupon.code}" sudah habis.`,
        discountAmount: 0,
        subtotalAfterCoupon: subtotal,
      reason: "QUOTA_EXHAUSTED",
      };
    }
  }

  // 4. Minimum Spend Check
  if (coupon.minSpend > 0 && subtotal < coupon.minSpend) {
    const formattedMin = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(coupon.minSpend);

    return {
      valid: false,
      message: `Minimal belanja untuk menggunakan kupon ini adalah ${formattedMin}.`,
      discountAmount: 0,
      subtotalAfterCoupon: subtotal,
      reason: "MIN_SPEND",
    };
  }

  // 5. Calculate Discount Amount
  let discountAmount = 0;

  const base = Math.max(0, discountBase);

  if (coupon.discountType === "PERCENTAGE") {
    discountAmount = Math.round(base * (coupon.discountValue / 100));
    if (coupon.maxDiscount && coupon.maxDiscount > 0) {
      discountAmount = Math.min(discountAmount, coupon.maxDiscount);
    }
  } else if (coupon.discountType === "FIXED_AMOUNT") {
    discountAmount = Math.min(base, coupon.discountValue);
  }

  // Ensure discount doesn't exceed the amount it is applied to
  discountAmount = Math.min(discountAmount, base);
  const subtotalAfterCoupon = Math.max(0, base - discountAmount);

  return {
    valid: true,
    message: `Kupon "${coupon.code}" berhasil diterapkan!`,
    coupon: {
      id: coupon.id,
      code: coupon.code,
      name: coupon.name,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      minSpend: coupon.minSpend,
      maxDiscount: coupon.maxDiscount,
    },
    discountAmount,
    subtotalAfterCoupon,
  };
}
