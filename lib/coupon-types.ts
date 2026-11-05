/**
 * coupon-types.ts
 *
 * Pure TypeScript types for coupons / vouchers.
 * Safe to import in both client and server components (no Prisma / Node.js deps).
 */

export type CouponDiscountType = "PERCENTAGE" | "FIXED_AMOUNT";

export interface Coupon {
  id: string;
  code: string; // e.g. "INFLUENCER10" (stored in uppercase)
  name: string;
  description?: string;
  discountType: CouponDiscountType;
  discountValue: number; // e.g. 10 for 10%, or 50000 for Rp 50.000
  minSpend: number; // minimum subtotal to apply (0 for no min)
  maxDiscount?: number | null; // optional cap for percentage discounts
  usageLimit?: number | null; // maximum total uses (null for unlimited)
  usageCount: number; // how many times coupon has been used
  startDate: string; // ISO datetime
  endDate: string; // ISO datetime
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
