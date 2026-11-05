import { revalidatePath } from "next/cache";
import type { Announcement } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  type AdminAnnouncementItem,
  type AnnouncementMessage,
} from "@/lib/announcements";

export type { AdminAnnouncementItem, AnnouncementMessage };

/**
 * Announcement store backed purely by PostgreSQL (Prisma). No file cache and
 * no auto-seeding: an empty table yields an empty list, and database errors
 * are thrown so API routes can respond with an error status.
 */

function isUuid(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

function toAdminItem(a: Announcement): AdminAnnouncementItem {
  return {
    id: a.id,
    text: a.text,
    link: a.link,
    badge: a.badge,
    sortOrder: a.sortOrder,
    isActive: a.isActive,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

function revalidateAnnouncementPaths() {
  try {
    revalidatePath("/");
    revalidatePath("/admin/announcements");
  } catch {}
}

/** All announcements for the admin panel. Throws on database error. */
export async function getAllAnnouncementsStore(
  status?: "active" | "inactive"
): Promise<AdminAnnouncementItem[]> {
  const rows = await prisma.announcement.findMany({
    where:
      status === "active" ? { isActive: true } : status === "inactive" ? { isActive: false } : undefined,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  return rows.map(toAdminItem);
}

/** Single announcement by id, or null. Throws on database error. */
export async function getAnnouncementByIdStore(id: string): Promise<AdminAnnouncementItem | null> {
  if (!isUuid(id)) return null;
  const row = await prisma.announcement.findUnique({ where: { id } });
  return row ? toAdminItem(row) : null;
}

/** Active announcements for the storefront ticker. Throws on database error. */
export async function getActiveStorefrontAnnouncementsStore(): Promise<AnnouncementMessage[]> {
  const rows = await prisma.announcement.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  return rows.map((item) => ({
    id: item.id,
    text: item.text,
    link: item.link || undefined,
    badge: item.badge || undefined,
    isPromo: item.badge === "PROMO" || item.badge === "VOUCHER",
  }));
}

export interface AnnouncementInput {
  text: string;
  link?: string | null;
  badge?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

function toAnnouncementData(data: AnnouncementInput) {
  return {
    text: data.text.trim().toUpperCase(),
    link: data.link && data.link.trim() ? data.link.trim() : null,
    badge: data.badge && data.badge.trim() ? data.badge.trim().toUpperCase() : null,
    sortOrder: Number(data.sortOrder) || 0,
    isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
  };
}

/** Create an announcement. Throws on database error. */
export async function createAnnouncementStore(data: AnnouncementInput): Promise<AdminAnnouncementItem> {
  const row = await prisma.announcement.create({ data: toAnnouncementData(data) });
  revalidateAnnouncementPaths();
  return toAdminItem(row);
}

/** Update an announcement. Returns null when it does not exist. Throws on database error. */
export async function updateAnnouncementStore(
  id: string,
  data: AnnouncementInput
): Promise<AdminAnnouncementItem | null> {
  if (!isUuid(id)) return null;
  const existing = await prisma.announcement.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return null;
  const row = await prisma.announcement.update({ where: { id }, data: toAnnouncementData(data) });
  revalidateAnnouncementPaths();
  return toAdminItem(row);
}

/** Delete an announcement. Returns false when it does not exist. Throws on database error. */
export async function deleteAnnouncementStore(id: string): Promise<boolean> {
  if (!isUuid(id)) return false;
  const result = await prisma.announcement.deleteMany({ where: { id } });
  revalidateAnnouncementPaths();
  return result.count > 0;
}
