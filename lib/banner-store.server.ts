import { revalidatePath } from "next/cache";
import type { Banner } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { type BannerType, type AdminBannerItem } from "@/lib/banner-store";

export type { BannerType, AdminBannerItem };

/**
 * Banner store backed purely by PostgreSQL (Prisma). No file cache and no
 * built-in sample banners: when the table is empty an empty list is returned,
 * and database errors are thrown so API routes can respond with an error.
 */

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function toAdminBanner(b: Banner): AdminBannerItem {
  return {
    id: b.id,
    type: b.type as BannerType,
    title: b.title,
    subtitle: b.subtitle,
    description: b.description,
    imageUrl: b.imageUrl,
    mobileImageUrl: b.mobileImageUrl,
    ctaText: b.ctaText,
    ctaLink: b.ctaLink,
    sortOrder: b.sortOrder,
    isActive: b.isActive,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  };
}

function revalidateBannerPaths() {
  try {
    revalidatePath("/");
    revalidatePath("/admin/banners");
  } catch {}
}

/** All banners for the admin panel. Throws on database error. */
export async function getAllBannersStore(type?: BannerType): Promise<AdminBannerItem[]> {
  const rows = await prisma.banner.findMany({
    where: type ? { type } : undefined,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  return rows.map(toAdminBanner);
}

/** Single banner by id, or null when it does not exist. Throws on database error. */
export async function getBannerByIdStore(id: string): Promise<AdminBannerItem | null> {
  if (!UUID_REGEX.test(id)) return null;
  const row = await prisma.banner.findUnique({ where: { id } });
  return row ? toAdminBanner(row) : null;
}

/** Active storefront banners (homepage SSR & public API). Throws on database error. */
export async function getActiveStorefrontBanners(): Promise<{
  heroBanners: AdminBannerItem[];
  secondaryBanners: AdminBannerItem[];
}> {
  const rows = await prisma.banner.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  const formatted = rows.map(toAdminBanner);
  return {
    heroBanners: formatted.filter((b) => b.type === "HERO_BANNER"),
    secondaryBanners: formatted.filter((b) => b.type === "SECONDARY_BANNER"),
  };
}

export interface BannerInput {
  type: BannerType;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  imageUrl: string;
  mobileImageUrl?: string | null;
  ctaText?: string | null;
  ctaLink?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

function toBannerData(data: BannerInput) {
  return {
    type: data.type,
    title: data.title,
    subtitle: data.subtitle || null,
    description: data.description || null,
    imageUrl: data.imageUrl,
    mobileImageUrl: data.mobileImageUrl || null,
    ctaText: data.ctaText || null,
    ctaLink: data.ctaLink || null,
    sortOrder: Number(data.sortOrder) || 0,
    isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
  };
}

/** Create a banner in the database. Throws on database error. */
export async function createBannerStore(data: BannerInput): Promise<AdminBannerItem> {
  const row = await prisma.banner.create({ data: toBannerData(data) });
  revalidateBannerPaths();
  return toAdminBanner(row);
}

/** Update an existing banner. Returns null when it does not exist. Throws on database error. */
export async function updateBannerStore(
  id: string,
  data: BannerInput
): Promise<AdminBannerItem | null> {
  if (!UUID_REGEX.test(id)) return null;
  const existing = await prisma.banner.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return null;
  const row = await prisma.banner.update({ where: { id }, data: toBannerData(data) });
  revalidateBannerPaths();
  return toAdminBanner(row);
}

/** Delete a banner. Returns false when it does not exist. Throws on database error. */
export async function deleteBannerStore(id: string): Promise<boolean> {
  if (!UUID_REGEX.test(id)) return false;
  const result = await prisma.banner.deleteMany({ where: { id } });
  revalidateBannerPaths();
  return result.count > 0;
}
