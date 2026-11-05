/**
 * discount-store.ts
 *
 * Database-backed (Prisma) storage for promotional discount campaigns.
 * Server-only. There is no file fallback and no sample data: an empty table
 * means there are no campaigns, and database errors are thrown to the caller.
 */

import { type DiscountCampaign as DbDiscountCampaign, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export * from "@/lib/discount-types";
import {
  type CampaignType,
  type DiscountCampaign,
  type DiscountTargetType,
  type DiscountType,
} from "@/lib/discount-types";

export type DiscountCampaignInput = Omit<DiscountCampaign, "id" | "createdAt" | "updatedAt"> & {
  id?: string;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(id: unknown): id is string {
  return typeof id === "string" && UUID_RE.test(id);
}

function toStringArray(value: Prisma.JsonValue | unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

function toCampaign(row: DbDiscountCampaign): DiscountCampaign {
  return {
    id: row.id,
    name: row.name,
    description: row.description || "",
    bannerText: row.bannerText || "",
    campaignType: row.campaignType as CampaignType,
    discountType: row.discountType as DiscountType,
    discountValue: Number(row.discountValue),
    minSpend: row.minSpend !== null ? Number(row.minSpend) : undefined,
    maxDiscountAmount: row.maxDiscountAmount !== null ? Number(row.maxDiscountAmount) : null,
    giftProductId: row.giftProductId,
    giftProductName: row.giftProductName,
    giftProductImage: row.giftProductImage,
    giftQuantity: row.giftQuantity,
    targetType: row.targetType as DiscountTargetType,
    targetCategoryIds: toStringArray(row.targetCategoryIds),
    targetProductIds: toStringArray(row.targetProductIds),
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

export async function getAllDiscounts(): Promise<DiscountCampaign[]> {
  const rows = await prisma.discountCampaign.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map(toCampaign);
}

/** Campaigns that are switched on and inside their schedule right now. */
export async function getActiveDiscounts(now = new Date()): Promise<DiscountCampaign[]> {
  const rows = await prisma.discountCampaign.findMany({
    where: {
      isActive: true,
      startDate: { lte: now },
      endDate: { gte: now },
    },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toCampaign);
}

export async function getDiscountById(id: string): Promise<DiscountCampaign | null> {
  if (!isUuid(id)) return null;
  const row = await prisma.discountCampaign.findUnique({ where: { id } });
  return row ? toCampaign(row) : null;
}

/**
 * Create (no id) or update (id) a campaign.
 * Returns null when updating a campaign id that does not exist.
 */
export async function saveDiscount(campaign: DiscountCampaignInput): Promise<DiscountCampaign | null> {
  const now = new Date();
  const data = {
    name: campaign.name.trim(),
    description: campaign.description?.trim() || null,
    bannerText: campaign.bannerText?.trim() || null,
    campaignType: campaign.campaignType || "CATALOG_DISCOUNT",
    discountType: campaign.discountType || "PERCENTAGE",
    discountValue: Number(campaign.discountValue) || 0,
    minSpend:
      campaign.minSpend !== undefined && campaign.minSpend !== null && !Number.isNaN(Number(campaign.minSpend))
        ? Number(campaign.minSpend)
        : null,
    maxDiscountAmount: campaign.maxDiscountAmount ? Number(campaign.maxDiscountAmount) : null,
    giftProductId: isUuid(campaign.giftProductId) ? campaign.giftProductId : null,
    giftProductName: campaign.giftProductName || null,
    giftProductImage: campaign.giftProductImage || null,
    giftQuantity: campaign.giftQuantity ? Math.max(1, Math.floor(Number(campaign.giftQuantity))) : 1,
    targetType: campaign.targetType || "ALL_PRODUCTS",
    targetCategoryIds: toStringArray(campaign.targetCategoryIds),
    targetProductIds: toStringArray(campaign.targetProductIds),
    startDate: toDate(campaign.startDate, now),
    endDate: toDate(campaign.endDate, new Date(now.getTime() + 30 * 86400000)),
    isActive: campaign.isActive !== undefined ? Boolean(campaign.isActive) : true,
  };

  if (campaign.id) {
    if (!isUuid(campaign.id)) return null;
    const existing = await prisma.discountCampaign.findUnique({ where: { id: campaign.id } });
    if (!existing) return null;
    const row = await prisma.discountCampaign.update({ where: { id: campaign.id }, data });
    return toCampaign(row);
  }

  const row = await prisma.discountCampaign.create({ data });
  return toCampaign(row);
}

export async function deleteDiscount(id: string): Promise<boolean> {
  if (!isUuid(id)) return false;
  const result = await prisma.discountCampaign.deleteMany({ where: { id } });
  return result.count > 0;
}

export async function toggleDiscountActive(
  id: string,
  isActive?: boolean
): Promise<DiscountCampaign | null> {
  if (!isUuid(id)) return null;
  const existing = await prisma.discountCampaign.findUnique({ where: { id } });
  if (!existing) return null;
  const row = await prisma.discountCampaign.update({
    where: { id },
    data: { isActive: isActive !== undefined ? Boolean(isActive) : !existing.isActive },
  });
  return toCampaign(row);
}
