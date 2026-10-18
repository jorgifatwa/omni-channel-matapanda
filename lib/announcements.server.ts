import fs from "fs";
import path from "path";
import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  INITIAL_ANNOUNCEMENTS,
  type AdminAnnouncementItem,
  type AnnouncementMessage,
} from "@/lib/announcements";

export type { AdminAnnouncementItem, AnnouncementMessage };
export { INITIAL_ANNOUNCEMENTS };

const DATA_DIR = path.join(process.cwd(), "data");
const ANNOUNCEMENTS_FILE = path.join(DATA_DIR, "announcements.json");

function isUuid(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

function ensureDataDir(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn("[announcements.server] Could not create data dir:", err);
  }
}

/**
 * Normalizes an announcement item to ensure its ID is a valid UUID
 */
function normalizeItem(item: AdminAnnouncementItem): AdminAnnouncementItem {
  if (isUuid(item.id)) return item;
  // Map legacy string ids to clean UUIDs
  return {
    ...item,
    id: crypto.randomUUID(),
  };
}

export function readAnnouncementsFromFile(): AdminAnnouncementItem[] {
  ensureDataDir();
  try {
    if (fs.existsSync(ANNOUNCEMENTS_FILE)) {
      const raw = fs.readFileSync(ANNOUNCEMENTS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("[announcements.server] Error reading announcements.json:", err);
  }

  const initialWithUuids = INITIAL_ANNOUNCEMENTS.map((a) => normalizeItem(a));
  writeAnnouncementsToFile(initialWithUuids);
  return initialWithUuids;
}

export function writeAnnouncementsToFile(items: AdminAnnouncementItem[]): void {
  ensureDataDir();
  try {
    fs.writeFileSync(ANNOUNCEMENTS_FILE, JSON.stringify(items, null, 2), "utf-8");
  } catch (err) {
    console.warn("[announcements.server] Error writing announcements.json:", err);
  }
}

/**
 * Get all announcements for Admin API with DB + File dual persistence
 */
export async function getAllAnnouncementsStore(status?: "active" | "inactive"): Promise<{
  announcements: AdminAnnouncementItem[];
  source: "database" | "file-cache";
}> {
  // 1. Try PostgreSQL database first
  try {
    const whereClause: { isActive?: boolean } = {};
    if (status === "active") whereClause.isActive = true;
    if (status === "inactive") whereClause.isActive = false;

    const dbItems = await prisma.announcement.findMany({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    if (dbItems && dbItems.length > 0) {
      const formatted: AdminAnnouncementItem[] = dbItems.map((a) => ({
        id: a.id,
        text: a.text,
        link: a.link,
        badge: a.badge,
        sortOrder: a.sortOrder,
        isActive: a.isActive,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      }));

      if (!status) {
        writeAnnouncementsToFile(formatted);
      }

      return { announcements: formatted, source: "database" };
    }

    // If DB is empty, auto-seed DB with initial items
    const seededList = readAnnouncementsFromFile();
    try {
      for (const item of seededList) {
        await prisma.announcement.create({
          data: {
            id: isUuid(item.id) ? item.id : undefined,
            text: item.text,
            link: item.link || null,
            badge: item.badge || null,
            sortOrder: item.sortOrder,
            isActive: item.isActive,
          },
        });
      }
    } catch (seedErr) {
      console.warn("[announcements.server] Auto-seed DB failed:", seedErr);
    }
  } catch (dbError) {
    console.warn("[announcements.server] Database unavailable, reading file cache:", dbError);
  }

  // 2. Fallback to file storage
  const fileItems = readAnnouncementsFromFile();
  const filtered = status === "active"
    ? fileItems.filter((a) => a.isActive)
    : status === "inactive"
    ? fileItems.filter((a) => !a.isActive)
    : fileItems;

  return { announcements: filtered, source: "file-cache" };
}

/**
 * Get active announcements for Storefront
 */
export async function getActiveStorefrontAnnouncementsStore(): Promise<{
  announcements: AnnouncementMessage[];
  source: "database" | "file-cache";
}> {
  try {
    const dbItems = await prisma.announcement.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    if (dbItems && dbItems.length > 0) {
      const formatted: AnnouncementMessage[] = dbItems.map((item) => ({
        id: item.id,
        text: item.text,
        link: item.link || undefined,
        badge: item.badge || undefined,
        isPromo: item.badge === "PROMO" || item.badge === "VOUCHER",
      }));
      return { announcements: formatted, source: "database" };
    }
  } catch (err) {
    console.warn("[announcements.server] DB offline for active announcements:", err);
  }

  const fileItems = readAnnouncementsFromFile().filter((a) => a.isActive);
  const fallback = fileItems.map((item) => ({
    id: item.id,
    text: item.text,
    link: item.link || undefined,
    badge: item.badge || undefined,
    isPromo: item.badge === "PROMO" || item.badge === "VOUCHER",
  }));

  return { announcements: fallback, source: "file-cache" };
}

/**
 * Save announcement (create / update) with DB + file dual persistence
 */
export async function saveAnnouncementStore(data: {
  id?: string;
  text: string;
  link?: string | null;
  badge?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}): Promise<AdminAnnouncementItem> {
  const currentItems = readAnnouncementsFromFile();
  const id = data.id && isUuid(data.id) ? data.id : crypto.randomUUID();
  const now = new Date().toISOString();

  const newOrUpdated: AdminAnnouncementItem = {
    id,
    text: data.text.trim().toUpperCase(),
    link: data.link && data.link.trim() ? data.link.trim() : null,
    badge: data.badge && data.badge.trim() ? data.badge.trim().toUpperCase() : null,
    sortOrder: Number(data.sortOrder) || 0,
    isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
    createdAt: now,
    updatedAt: now,
  };

  // 1. Persist to file cache
  const existingIdx = currentItems.findIndex((a) => a.id === (data.id || id));
  let updatedList: AdminAnnouncementItem[];
  if (existingIdx >= 0) {
    newOrUpdated.createdAt = currentItems[existingIdx].createdAt;
    updatedList = [...currentItems];
    updatedList[existingIdx] = newOrUpdated;
  } else {
    updatedList = [...currentItems, newOrUpdated];
  }
  writeAnnouncementsToFile(updatedList);

  // 2. Sync to PostgreSQL
  try {
    await prisma.announcement.upsert({
      where: { id },
      create: {
        id,
        text: newOrUpdated.text,
        link: newOrUpdated.link,
        badge: newOrUpdated.badge,
        sortOrder: newOrUpdated.sortOrder,
        isActive: newOrUpdated.isActive,
      },
      update: {
        text: newOrUpdated.text,
        link: newOrUpdated.link,
        badge: newOrUpdated.badge,
        sortOrder: newOrUpdated.sortOrder,
        isActive: newOrUpdated.isActive,
      },
    });
  } catch (err) {
    console.warn("[announcements.server] PostgreSQL sync skipped:", err);
  }

  // 3. Invalidate paths
  try {
    revalidatePath("/");
    revalidatePath("/admin/announcements");
  } catch {}

  return newOrUpdated;
}

/**
 * Delete announcement
 */
export async function deleteAnnouncementStore(id: string): Promise<boolean> {
  const currentItems = readAnnouncementsFromFile();
  const updatedList = currentItems.filter((a) => a.id !== id);
  writeAnnouncementsToFile(updatedList);

  try {
    if (isUuid(id)) {
      await prisma.announcement.delete({ where: { id } }).catch(() => {});
    } else {
      await prisma.announcement.deleteMany({
        where: { id },
      }).catch(() => {});
    }
  } catch (err) {
    console.warn("[announcements.server] PostgreSQL delete skipped:", err);
  }

  try {
    revalidatePath("/");
    revalidatePath("/admin/announcements");
  } catch {}

  return true;
}

/**
 * Reset announcements to default presets
 */
export async function resetAnnouncementsToDefaultStore(): Promise<AdminAnnouncementItem[]> {
  const initialWithUuids = INITIAL_ANNOUNCEMENTS.map((a) => normalizeItem(a));
  writeAnnouncementsToFile(initialWithUuids);

  try {
    await prisma.announcement.deleteMany({}).catch(() => {});
    for (const item of initialWithUuids) {
      await prisma.announcement.create({
        data: {
          id: item.id,
          text: item.text,
          link: item.link || null,
          badge: item.badge || null,
          sortOrder: item.sortOrder,
          isActive: item.isActive,
        },
      }).catch(() => {});
    }
  } catch (err) {
    console.warn("[announcements.server] Reset DB skipped:", err);
  }

  try {
    revalidatePath("/");
    revalidatePath("/admin/announcements");
  } catch {}

  return initialWithUuids;
}
