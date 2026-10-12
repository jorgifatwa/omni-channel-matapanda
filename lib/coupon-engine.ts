/**
 * coupon-engine.ts
 *
 * Core coupon validation and calculation engine.
 * Supports stacking on top of already discounted catalog items (double discount).
 */

import { type Coupon, getCouponByCode } from "@/lib/coupon-store";

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
}

export function validateAndApplyCoupon(
  rawCode: string,
  subtotal: number,
  customCoupon?: Coupon | null
): CouponValidationResult {
  if (!rawCode || !rawCode.trim()) {
    return {
      valid: false,
      message: "Silakan masukkan kode kupon.",
      discountAmount: 0,
      subtotalAfterCoupon: subtotal,
    };
  }

  const coupon = customCoupon !== undefined ? customCoupon : getCouponByCode(rawCode);

  if (!coupon) {
    return {
      valid: false,
      message: `Kode kupon "${rawCode.trim().toUpperCase()}" tidak ditemukan atau tidak valid.`,
      discountAmount: 0,
      subtotalAfterCoupon: subtotal,
    };
  }

  // 1. Status Check
  if (!coupon.isActive) {
    return {
      valid: false,
      message: `Kupon "${coupon.code}" saat ini sedang dinonaktifkan.`,
      discountAmount: 0,
      subtotalAfterCoupon: subtotal,
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
    };
  }

  if (coupon.endDate && coupon.endDate < nowIso) {
    return {
      valid: false,
      message: `Kupon "${coupon.code}" sudah kedaluwarsa.`,
      discountAmount: 0,
      subtotalAfterCoupon: subtotal,
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
    };
  }

  // 5. Calculate Discount Amount
  let discountAmount = 0;

  if (coupon.discountType === "PERCENTAGE") {
    discountAmount = Math.round(subtotal * (coupon.discountValue / 100));
    if (coupon.maxDiscount && coupon.maxDiscount > 0) {
      discountAmount = Math.min(discountAmount, coupon.maxDiscount);
    }
  } else if (coupon.discountType === "FIXED_AMOUNT") {
    discountAmount = Math.min(subtotal, coupon.discountValue);
  }

  // Ensure discount doesn't exceed subtotal
  discountAmount = Math.min(discountAmount, subtotal);
  const subtotalAfterCoupon = Math.max(0, subtotal - discountAmount);

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
