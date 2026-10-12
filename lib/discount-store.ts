/**
 * discount-store.ts
 *
 * Resilient JSON-backed storage for it's matapanda promotional discount campaigns.
 * Persists to data/discounts.json.
 */

import fs from "fs";
import path from "path";

export * from "@/lib/discount-types";
import { type DiscountCampaign } from "@/lib/discount-types";

const DATA_DIR = path.join(process.cwd(), "data");
const DISCOUNTS_FILE = path.join(DATA_DIR, "discounts.json");

function ensureFileExists(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DISCOUNTS_FILE)) {
      // Seed with initial example campaign if desired
      fs.writeFileSync(DISCOUNTS_FILE, JSON.stringify([], null, 2), "utf-8");
    }
  } catch (err) {
    console.warn("[DiscountStore] Failed to ensure discounts file:", err);
  }
}

export function getAllDiscounts(): DiscountCampaign[] {
  ensureFileExists();
  try {
    const raw = fs.readFileSync(DISCOUNTS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getActiveDiscounts(now = new Date()): DiscountCampaign[] {
  const all = getAllDiscounts();
  const nowIso = now.toISOString();

  return all.filter((d) => {
    if (!d.isActive) return false;
    if (d.startDate && d.startDate > nowIso) return false;
    if (d.endDate && d.endDate < nowIso) return false;
    return true;
  });
}

export function getDiscountById(id: string): DiscountCampaign | null {
  const all = getAllDiscounts();
  return all.find((d) => d.id === id) || null;
}

export function saveDiscount(
  campaign: Omit<DiscountCampaign, "id" | "createdAt" | "updatedAt"> & { id?: string }
): DiscountCampaign {
  ensureFileExists();
  const all = getAllDiscounts();
  const nowIso = new Date().toISOString();
  const id = campaign.id || `disc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const existingIdx = all.findIndex((d) => d.id === id);

  const newEntry: DiscountCampaign = {
    id,
    name: campaign.name.trim(),
    description: campaign.description?.trim() || "",
    bannerText: campaign.bannerText?.trim() || "",
    campaignType: campaign.campaignType || "CATALOG_DISCOUNT",
    discountType: campaign.discountType,
    discountValue: Number(campaign.discountValue) || 0,
    minSpend: campaign.minSpend !== undefined ? Number(campaign.minSpend) : undefined,
    maxDiscountAmount: campaign.maxDiscountAmount ? Number(campaign.maxDiscountAmount) : null,
    giftProductId: campaign.giftProductId || null,
    giftProductName: campaign.giftProductName || null,
    giftProductImage: campaign.giftProductImage || null,
    giftQuantity: campaign.giftQuantity ? Number(campaign.giftQuantity) : 1,
    targetType: campaign.targetType,
    targetCategoryIds: Array.isArray(campaign.targetCategoryIds) ? campaign.targetCategoryIds : [],
    targetProductIds: Array.isArray(campaign.targetProductIds) ? campaign.targetProductIds : [],
    startDate: campaign.startDate || nowIso,
    endDate: campaign.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    isActive: campaign.isActive !== undefined ? campaign.isActive : true,
    createdAt: existingIdx >= 0 ? all[existingIdx].createdAt : nowIso,
    updatedAt: nowIso,
  };

  if (existingIdx >= 0) {
    all[existingIdx] = newEntry;
  } else {
    all.unshift(newEntry);
  }

  try {
    fs.writeFileSync(DISCOUNTS_FILE, JSON.stringify(all, null, 2), "utf-8");
  } catch (err) {
    console.error("[DiscountStore] Failed to write discounts:", err);
  }

  return newEntry;
}

export function deleteDiscount(id: string): boolean {
  ensureFileExists();
  const all = getAllDiscounts();
  const filtered = all.filter((d) => d.id !== id);
  if (filtered.length === all.length) return false;

  try {
    fs.writeFileSync(DISCOUNTS_FILE, JSON.stringify(filtered, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("[DiscountStore] Failed to delete discount:", err);
    return false;
  }
}

export function toggleDiscountActive(id: string, isActive?: boolean): DiscountCampaign | null {
  ensureFileExists();
  const all = getAllDiscounts();
  const item = all.find((d) => d.id === id);
  if (!item) return null;

  item.isActive = isActive !== undefined ? isActive : !item.isActive;
  item.updatedAt = new Date().toISOString();

  try {
    fs.writeFileSync(DISCOUNTS_FILE, JSON.stringify(all, null, 2), "utf-8");
  } catch (err) {
    console.error("[DiscountStore] Failed to update discount status:", err);
  }

  return item;
}
