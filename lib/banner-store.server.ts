import fs from "fs";
import path from "path";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  INITIAL_HERO_BANNERS,
  INITIAL_SECONDARY_BANNERS,
  INITIAL_ALL_BANNERS,
  type BannerType,
  type AdminBannerItem,
} from "@/lib/banner-store";

export type { BannerType, AdminBannerItem };
export { INITIAL_HERO_BANNERS, INITIAL_SECONDARY_BANNERS, INITIAL_ALL_BANNERS };

const DATA_DIR = path.join(process.cwd(), "data");
const BANNERS_FILE = path.join(DATA_DIR, "banners.json");

/**
 * File storage helpers for reliable server persistence
 */
function ensureDataDir(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn("[banner-store.server] Could not create data dir:", err);
  }
}

export function readBannersFromFile(): AdminBannerItem[] {
  ensureDataDir();
  try {
    if (fs.existsSync(BANNERS_FILE)) {
      const raw = fs.readFileSync(BANNERS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("[banner-store.server] Error reading banners.json:", err);
  }

  // Initialize file with defaults
  writeBannersToFile(INITIAL_ALL_BANNERS);
  return INITIAL_ALL_BANNERS;
}

export function writeBannersToFile(banners: AdminBannerItem[]): void {
  ensureDataDir();
  try {
    fs.writeFileSync(BANNERS_FILE, JSON.stringify(banners, null, 2), "utf-8");
  } catch (err) {
    console.warn("[banner-store.server] Error writing banners.json:", err);
  }
}

/**
 * Get all banners for Admin API with database + file-backed fallback
 */
export async function getAllBannersStore(type?: BannerType): Promise<{
  banners: AdminBannerItem[];
  source: "database" | "file-cache";
}> {
  // 1. Try PostgreSQL database first
  try {
    const dbBanners = await prisma.banner.findMany({
      where: type ? { type } : undefined,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    if (dbBanners && dbBanners.length > 0) {
      const formatted: AdminBannerItem[] = dbBanners.map((b) => ({
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
      }));

      // Mirror to file cache
      if (!type) {
        writeBannersToFile(formatted);
      }

      return { banners: formatted, source: "database" };
    }
  } catch (dbError) {
    console.warn("[banner-store.server] Database unavailable, reading from persistent file cache:", dbError);
  }

  // 2. Fallback to persistent file storage
  const fileBanners = readBannersFromFile();
  const filtered = type ? fileBanners.filter((b) => b.type === type) : fileBanners;
  return { banners: filtered, source: "file-cache" };
}

/**
 * Get active storefront banners (for Homepage SSR & Public API)
 */
export async function getActiveStorefrontBanners(): Promise<{
  heroBanners: AdminBannerItem[];
  secondaryBanners: AdminBannerItem[];
  source: "database" | "file-cache";
}> {
  try {
    const dbBanners = await prisma.banner.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    if (dbBanners && dbBanners.length > 0) {
      const formatted: AdminBannerItem[] = dbBanners.map((b) => ({
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
      }));

      return {
        heroBanners: formatted.filter((b) => b.type === "HERO_BANNER"),
        secondaryBanners: formatted.filter((b) => b.type === "SECONDARY_BANNER"),
        source: "database",
      };
    }
  } catch (err) {
    console.warn("[banner-store.server] DB offline for active banners, reading from persistent file:", err);
  }

  const fileBanners = readBannersFromFile().filter((b) => b.isActive);
  const heroBanners = fileBanners.filter((b) => b.type === "HERO_BANNER");
  const secondaryBanners = fileBanners.filter((b) => b.type === "SECONDARY_BANNER");

  return {
    heroBanners: heroBanners.length > 0 ? heroBanners : INITIAL_HERO_BANNERS,
    secondaryBanners: secondaryBanners.length > 0 ? secondaryBanners : INITIAL_SECONDARY_BANNERS,
    source: "file-cache",
  };
}

/**
 * Save / Create Banner with dual persistence (Database + File)
 */
export async function saveBannerStore(data: {
  id?: string;
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
}): Promise<AdminBannerItem> {
  const currentBanners = readBannersFromFile();
  const id = data.id || `banner-${Date.now()}`;
  const now = new Date().toISOString();

  const newOrUpdatedItem: AdminBannerItem = {
    id,
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
    createdAt: now,
    updatedAt: now,
  };

  // 1. Immediately persist to file cache
  const existingIdx = currentBanners.findIndex((b) => b.id === id);
  let updatedList: AdminBannerItem[];
  if (existingIdx >= 0) {
    newOrUpdatedItem.createdAt = currentBanners[existingIdx].createdAt;
    updatedList = [...currentBanners];
    updatedList[existingIdx] = newOrUpdatedItem;
  } else {
    updatedList = [...currentBanners, newOrUpdatedItem];
  }
  writeBannersToFile(updatedList);

  // 2. Asynchronously sync to Prisma database
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isUuid) {
      await prisma.banner.upsert({
        where: { id },
        create: {
          id,
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
        },
        update: {
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
        },
      });
    } else {
      // Find by title or create new
      const found = await prisma.banner.findFirst({
        where: { title: data.title, type: data.type },
      });
      if (found) {
        await prisma.banner.update({
          where: { id: found.id },
          data: {
            title: data.title,
            subtitle: data.subtitle || null,
            description: data.description || null,
            imageUrl: data.imageUrl,
            mobileImageUrl: data.mobileImageUrl || null,
            ctaText: data.ctaText || null,
            ctaLink: data.ctaLink || null,
            sortOrder: Number(data.sortOrder) || 0,
            isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
          },
        });
      } else {
        await prisma.banner.create({
          data: {
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
          },
        });
      }
    }
  } catch (err) {
    console.warn("[banner-store.server] Syncing banner to PostgreSQL skipped:", err);
  }

  // 3. Invalidate Next.js cache
  try {
    revalidatePath("/");
    revalidatePath("/admin/banners");
  } catch {}

  return newOrUpdatedItem;
}

/**
 * Delete Banner with dual persistence (Database + File)
 */
export async function deleteBannerStore(id: string): Promise<boolean> {
  const currentBanners = readBannersFromFile();
  const target = currentBanners.find((b) => b.id === id);
  const updatedList = currentBanners.filter((b) => b.id !== id);
  writeBannersToFile(updatedList);

  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isUuid) {
      await prisma.banner.delete({ where: { id } }).catch(() => {});
    } else if (target) {
      await prisma.banner.deleteMany({
        where: { title: target.title, type: target.type },
      }).catch(() => {});
    }
  } catch (err) {
    console.warn("[banner-store.server] DB delete error skipped:", err);
  }

  try {
    revalidatePath("/");
    revalidatePath("/admin/banners");
  } catch {}

  return true;
}

/**
 * Reset Banners to initial presets
 */
export async function resetBannersToDefaultStore(): Promise<AdminBannerItem[]> {
  writeBannersToFile(INITIAL_ALL_BANNERS);

  try {
    await prisma.banner.deleteMany({}).catch(() => {});
    for (const b of INITIAL_ALL_BANNERS) {
      await prisma.banner.create({
        data: {
          type: b.type,
          title: b.title,
          subtitle: b.subtitle || null,
          description: b.description || null,
          imageUrl: b.imageUrl,
          mobileImageUrl: b.mobileImageUrl || null,
          ctaText: b.ctaText || null,
          ctaLink: b.ctaLink || null,
          sortOrder: b.sortOrder,
          isActive: b.isActive,
        },
      }).catch(() => {});
    }
  } catch (err) {
    console.warn("[banner-store.server] Reset DB skipped:", err);
  }

  try {
    revalidatePath("/");
    revalidatePath("/admin/banners");
  } catch {}

  return INITIAL_ALL_BANNERS;
}
