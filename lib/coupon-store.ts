/**
 * coupon-store.ts
 *
 * Resilient JSON-backed storage for it's matapanda promotional coupons & influencer vouchers.
 * Persists to data/coupons.json.
 */

import fs from "fs";
import path from "path";

export type CouponDiscountType = "PERCENTAGE" | "FIXED_AMOUNT";

export interface Coupon {
  id: string;
  code: string; // e.g. "INFLUENCER10", "TIKTOK50K" (stored in uppercase)
  name: string; // e.g. "Influencer Collab: Sarah", "TikTok Live Special"
  description?: string;
  discountType: CouponDiscountType;
  discountValue: number; // e.g. 10 for 10%, or 50000 for Rp 50.000
  minSpend: number; // minimum subtotal to apply (0 for no min)
  maxDiscount?: number | null; // optional cap for percentage discounts (e.g. max Rp 100.000)
  usageLimit?: number | null; // maximum total uses (null for unlimited)
  usageCount: number; // how many times coupon has been used
  startDate: string; // ISO datetime
  endDate: string; // ISO datetime
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const COUPONS_FILE = path.join(DATA_DIR, "coupons.json");

const SEED_COUPONS: Coupon[] = [
  {
    id: "coup-influencer-10",
    code: "INFLUENCER10",
    name: "Influencer Partner Special 10%",
    description: "Kode voucher eksklusif influencer partner it'smatapanda diskon 10%",
    discountType: "PERCENTAGE",
    discountValue: 10,
    minSpend: 150000,
    maxDiscount: 100000,
    usageLimit: 500,
    usageCount: 12,
    startDate: new Date(Date.now() - 7 * 86400000).toISOString(),
    endDate: new Date(Date.now() + 60 * 86400000).toISOString(),
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "coup-tiktok-50k",
    code: "TIKTOK50K",
    name: "TikTok Live Voucher Rp 50.000",
    description: "Potongan langsung Rp 50.000 untuk penonton setia TikTok Live",
    discountType: "FIXED_AMOUNT",
    discountValue: 50000,
    minSpend: 350000,
    maxDiscount: null,
    usageLimit: 100,
    usageCount: 28,
    startDate: new Date(Date.now() - 3 * 86400000).toISOString(),
    endDate: new Date(Date.now() + 30 * 86400000).toISOString(),
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function ensureFileExists(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(COUPONS_FILE)) {
      fs.writeFileSync(COUPONS_FILE, JSON.stringify(SEED_COUPONS, null, 2), "utf-8");
    }
  } catch (err) {
    console.warn("[CouponStore] Failed to ensure coupons file:", err);
  }
}

export function getAllCoupons(): Coupon[] {
  ensureFileExists();
  try {
    const raw = fs.readFileSync(COUPONS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getCouponById(id: string): Coupon | null {
  const all = getAllCoupons();
  return all.find((c) => c.id === id) || null;
}

export function getCouponByCode(rawCode: string): Coupon | null {
  if (!rawCode) return null;
  const normalized = rawCode.trim().toUpperCase();
  const all = getAllCoupons();
  return all.find((c) => c.code.toUpperCase() === normalized) || null;
}

export function saveCoupon(
  coupon: Omit<Coupon, "id" | "usageCount" | "createdAt" | "updatedAt"> & {
    id?: string;
    usageCount?: number;
  }
): Coupon {
  ensureFileExists();
  const all = getAllCoupons();
  const nowIso = new Date().toISOString();
  const id = coupon.id || `coup-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const code = coupon.code.trim().toUpperCase();

  const existingIdx = all.findIndex((c) => c.id === id);

  const newEntry: Coupon = {
    id,
    code,
    name: coupon.name.trim(),
    description: coupon.description?.trim() || "",
    discountType: coupon.discountType,
    discountValue: Number(coupon.discountValue) || 0,
    minSpend: Number(coupon.minSpend) || 0,
    maxDiscount: coupon.maxDiscount ? Number(coupon.maxDiscount) : null,
    usageLimit: coupon.usageLimit ? Number(coupon.usageLimit) : null,
    usageCount: coupon.usageCount !== undefined ? coupon.usageCount : (existingIdx >= 0 ? all[existingIdx].usageCount : 0),
    startDate: coupon.startDate || nowIso,
    endDate: coupon.endDate || new Date(Date.now() + 30 * 86400000).toISOString(),
    isActive: coupon.isActive !== undefined ? coupon.isActive : true,
    createdAt: existingIdx >= 0 ? all[existingIdx].createdAt : nowIso,
    updatedAt: nowIso,
  };

  if (existingIdx >= 0) {
    all[existingIdx] = newEntry;
  } else {
    all.unshift(newEntry);
  }

  try {
    fs.writeFileSync(COUPONS_FILE, JSON.stringify(all, null, 2), "utf-8");
  } catch (err) {
    console.error("[CouponStore] Failed to write coupons:", err);
  }

  return newEntry;
}

export function deleteCoupon(id: string): boolean {
  ensureFileExists();
  const all = getAllCoupons();
  const filtered = all.filter((c) => c.id !== id);
  if (filtered.length === all.length) return false;

  try {
    fs.writeFileSync(COUPONS_FILE, JSON.stringify(filtered, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("[CouponStore] Failed to delete coupon:", err);
    return false;
  }
}

export function toggleCouponActive(id: string, isActive?: boolean): Coupon | null {
  ensureFileExists();
  const all = getAllCoupons();
  const item = all.find((c) => c.id === id);
  if (!item) return null;

  item.isActive = isActive !== undefined ? isActive : !item.isActive;
  item.updatedAt = new Date().toISOString();

  try {
    fs.writeFileSync(COUPONS_FILE, JSON.stringify(all, null, 2), "utf-8");
  } catch (err) {
    console.error("[CouponStore] Failed to toggle coupon:", err);
  }

  return item;
}

export function incrementCouponUsage(rawCode: string): boolean {
  ensureFileExists();
  const normalized = rawCode.trim().toUpperCase();
  const all = getAllCoupons();
  const item = all.find((c) => c.code.toUpperCase() === normalized);
  if (!item) return false;

  item.usageCount = (item.usageCount || 0) + 1;
  item.updatedAt = new Date().toISOString();

  try {
    fs.writeFileSync(COUPONS_FILE, JSON.stringify(all, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("[CouponStore] Failed to increment coupon usage:", err);
    return false;
  }
}
