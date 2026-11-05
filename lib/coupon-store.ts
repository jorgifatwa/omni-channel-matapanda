/**
 * coupon-store.ts
 *
 * Database-backed (Prisma) storage for promotional coupons & influencer vouchers.
 * Server-only. There is no file fallback and no sample data: an empty table
 * means there are no coupons, and database errors are thrown to the caller.
 */

import { Prisma, type Coupon as DbCoupon } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export * from "@/lib/coupon-types";
import { type Coupon, type CouponDiscountType } from "@/lib/coupon-types";

export type CouponInput = Omit<Coupon, "id" | "usageCount" | "createdAt" | "updatedAt"> & {
  id?: string;
  usageCount?: number;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(id: unknown): id is string {
  return typeof id === "string" && UUID_RE.test(id);
}

export function normalizeCouponCode(rawCode: string): string {
  return (rawCode || "").trim().toUpperCase();
}

function toCoupon(row: DbCoupon): Coupon {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description || "",
    discountType: row.discountType as CouponDiscountType,
    discountValue: Number(row.discountValue),
    minSpend: Number(row.minSpend),
    maxDiscount: row.maxDiscount !== null ? Number(row.maxDiscount) : null,
    usageLimit: row.usageLimit,
    usageCount: row.usageCount,
    startDate: row.startDate.toISOString(),
    endDate: row.endDate.toISOString(),
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toDate(value: string | undefined | null, fallback: Date): Date {
  if (!value) return fallback;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

export async function getAllCoupons(): Promise<Coupon[]> {
  const rows = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map(toCoupon);
}

export async function getCouponById(id: string): Promise<Coupon | null> {
  if (!isUuid(id)) return null;
  const row = await prisma.coupon.findUnique({ where: { id } });
  return row ? toCoupon(row) : null;
}

export async function getCouponByCode(rawCode: string): Promise<Coupon | null> {
  const code = normalizeCouponCode(rawCode);
  if (!code) return null;
  const row = await prisma.coupon.findUnique({ where: { code } });
  return row ? toCoupon(row) : null;
}

/** Thrown when another coupon already uses the same code. */
export class DuplicateCouponCodeError extends Error {
  constructor(code: string) {
    super(`Kode kupon "${code}" sudah digunakan oleh kupon lain.`);
    this.name = "DuplicateCouponCodeError";
  }
}

/**
 * Create (no id) or update (id) a coupon.
 * Returns null when updating a coupon id that does not exist.
 */
export async function saveCoupon(coupon: CouponInput): Promise<Coupon | null> {
  const now = new Date();
  const code = normalizeCouponCode(coupon.code);
  const data = {
    code,
    name: coupon.name.trim(),
    description: coupon.description?.trim() || null,
    discountType: coupon.discountType,
    discountValue: Number(coupon.discountValue) || 0,
    minSpend: Number(coupon.minSpend) || 0,
    maxDiscount: coupon.maxDiscount ? Number(coupon.maxDiscount) : null,
    usageLimit: coupon.usageLimit ? Math.floor(Number(coupon.usageLimit)) : null,
    startDate: toDate(coupon.startDate, now),
    endDate: toDate(coupon.endDate, new Date(now.getTime() + 30 * 86400000)),
    isActive: coupon.isActive !== undefined ? Boolean(coupon.isActive) : true,
  };

  try {
    if (coupon.id) {
      if (!isUuid(coupon.id)) return null;
      const existing = await prisma.coupon.findUnique({ where: { id: coupon.id } });
      if (!existing) return null;
      const row = await prisma.coupon.update({
        where: { id: coupon.id },
        data: {
          ...data,
          ...(coupon.usageCount !== undefined ? { usageCount: coupon.usageCount } : {}),
        },
      });
      return toCoupon(row);
    }

    const row = await prisma.coupon.create({
      data: { ...data, usageCount: coupon.usageCount ?? 0 },
    });
    return toCoupon(row);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new DuplicateCouponCodeError(code);
    }
    throw err;
  }
}

export async function deleteCoupon(id: string): Promise<boolean> {
  if (!isUuid(id)) return false;
  const result = await prisma.coupon.deleteMany({ where: { id } });
  return result.count > 0;
}

export async function toggleCouponActive(id: string, isActive?: boolean): Promise<Coupon | null> {
  if (!isUuid(id)) return null;
  const existing = await prisma.coupon.findUnique({ where: { id } });
  if (!existing) return null;
  const row = await prisma.coupon.update({
    where: { id },
    data: { isActive: isActive !== undefined ? Boolean(isActive) : !existing.isActive },
  });
  return toCoupon(row);
}

/**
 * Atomically records one use of a coupon.
 *
 * A single conditional UPDATE increments `usageCount` only while the coupon is
 * active, inside its schedule and below its usage limit, so concurrent
 * checkouts can never push the count past `usageLimit`.
 * Returns true when a use was recorded, false when the coupon does not exist
 * or can no longer be used.
 */
export async function incrementCouponUsage(rawCode: string): Promise<boolean> {
  const code = normalizeCouponCode(rawCode);
  if (!code) return false;
  const now = new Date();
  const result = await prisma.coupon.updateMany({
    where: {
      code,
      isActive: true,
      startDate: { lte: now },
      endDate: { gte: now },
      OR: [
        { usageLimit: null },
        { usageLimit: { lte: 0 } },
        { usageCount: { lt: prisma.coupon.fields.usageLimit } },
      ],
    },
    data: { usageCount: { increment: 1 } },
  });
  return result.count > 0;
}

/** Gives back one use (e.g. when the order that claimed it failed to save). */
export async function releaseCouponUsage(rawCode: string): Promise<void> {
  const code = normalizeCouponCode(rawCode);
  if (!code) return;
  await prisma.coupon.updateMany({
    where: { code, usageCount: { gt: 0 } },
    data: { usageCount: { decrement: 1 } },
  });
}
