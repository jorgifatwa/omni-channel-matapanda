import fs from "fs";
import path from "path";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export type BannerType = "HERO_BANNER" | "SECONDARY_BANNER";

export interface AdminBannerItem {
  id: string;
  type: BannerType;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  imageUrl: string;
  mobileImageUrl?: string | null;
  ctaText?: string | null;
  ctaLink?: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const BANNERS_FILE = path.join(DATA_DIR, "banners.json");

export const INITIAL_HERO_BANNERS: AdminBannerItem[] = [
  {
    id: "hero-new-in",
    type: "HERO_BANNER",
    title: "New in",
    subtitle: "Koleksi Tas Terbaru it'smatapanda",
    imageUrl:
      "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=2000&q=85",
    mobileImageUrl:
      "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1080&h=1440&q=85",
    ctaText: "Discover New in",
    ctaLink: "/new-arrivals",
    sortOrder: 0,
    isActive: true,
    createdAt: "2026-10-01",
  },
  {
    id: "hero-tote-bags",
    type: "HERO_BANNER",
    title: "Tote Bags",
    subtitle: "Tas Tote Fungsional & Daily Carry",
    imageUrl:
      "https://images.unsplash.com/photo-1597484661643-2f5fef640dd1?auto=format&fit=crop&w=2000&q=85",
    mobileImageUrl:
      "https://images.unsplash.com/photo-1597484661643-2f5fef640dd1?auto=format&fit=crop&w=1080&h=1440&q=85",
    ctaText: "Discover Tote Bags",
    ctaLink: "/categories/tote-bags",
    sortOrder: 1,
    isActive: true,
    createdAt: "2026-10-01",
  },
  {
    id: "hero-dumpling-sling",
    type: "HERO_BANNER",
    title: "Dumpling & Sling",
    subtitle: "Siluet Gathered & Crossbody Ringan",
    imageUrl:
      "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=2000&q=85",
    mobileImageUrl:
      "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=1080&h=1440&q=85",
    ctaText: "Discover Sling Bags",
    ctaLink: "/categories/sling-crossbody",
    sortOrder: 2,
    isActive: true,
    createdAt: "2026-10-01",
  },
  {
    id: "hero-shoulder-bags",
    type: "HERO_BANNER",
    title: "Shoulder Bags",
    subtitle: "Puffer & Hobo Modern",
    imageUrl:
      "https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&w=2000&q=85",
    mobileImageUrl:
      "https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&w=1080&h=1440&q=85",
    ctaText: "Discover Shoulder Bags",
    ctaLink: "/categories/shoulder-bags",
    sortOrder: 3,
    isActive: true,
    createdAt: "2026-10-01",
  },
  {
    id: "hero-backpacks",
    type: "HERO_BANNER",
    title: "Backpacks",
    subtitle: "Ransel Urban & Commuter",
    imageUrl:
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=2000&q=85",
    mobileImageUrl:
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1080&h=1440&q=85",
    ctaText: "Discover Backpacks",
    ctaLink: "/categories/backpacks",
    sortOrder: 4,
    isActive: true,
    createdAt: "2026-10-01",
  },
  {
    id: "hero-pouches",
    type: "HERO_BANNER",
    title: "Small Goods",
    subtitle: "Pouches, Cardholders & Straps",
    imageUrl:
      "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=2000&q=85",
    mobileImageUrl:
      "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1080&h=1440&q=85",
    ctaText: "Discover Small Goods",
    ctaLink: "/categories/pouches-small-goods",
    sortOrder: 5,
    isActive: true,
    createdAt: "2026-10-01",
  },
];

export const INITIAL_SECONDARY_BANNERS: AdminBannerItem[] = [
  {
    id: "sec-free-shipping",
    type: "SECONDARY_BANNER",
    title: "Free shipping",
    subtitle: "With minimum spend inclusive of custom duties and taxes",
    description:
      "Nikmati pengiriman gratis ke seluruh Indonesia untuk setiap pembelian tas it'smatapanda",
    imageUrl:
      "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=2000&q=85",
    mobileImageUrl:
      "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1080&h=1440&q=85",
    ctaText: "Shop The Collection",
    ctaLink: "/new-arrivals",
    sortOrder: 0,
    isActive: true,
    createdAt: "2026-10-01",
  },
  {
    id: "sec-everyday-carryalls",
    type: "SECONDARY_BANNER",
    title: "Everyday carryalls",
    subtitle: "Lightweight, water-resistant & made for modern living",
    description:
      "Eksplorasi koleksi tas fungsional dengan palet warna vibran dan material premium tahan air",
    imageUrl:
      "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=2000&q=85",
    mobileImageUrl:
      "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=1080&h=1440&q=85",
    ctaText: "Explore Bags",
    ctaLink: "/categories/sling-crossbody",
    sortOrder: 1,
    isActive: true,
    createdAt: "2026-10-01",
  },
  {
    id: "sec-colourblock-series",
    type: "SECONDARY_BANNER",
    title: "Colourblock Series",
    subtitle: "Playful tones designed for your everyday adventures",
    description:
      "Temukan perpaduan warna kontras yang ceria dan material nilon tahan lama khas it'smatapanda",
    imageUrl:
      "https://images.unsplash.com/photo-1575032617751-6ddec2089882?auto=format&fit=crop&w=2000&q=85",
    mobileImageUrl:
      "https://images.unsplash.com/photo-1575032617751-6ddec2089882?auto=format&fit=crop&w=1080&h=1440&q=85",
    ctaText: "Discover Colours",
    ctaLink: "/categories/bags-totes",
    sortOrder: 2,
    isActive: true,
    createdAt: "2026-10-01",
  },
  {
    id: "sec-urban-utility",
    type: "SECONDARY_BANNER",
    title: "Urban Utility",
    subtitle: "Modular pouches, straps & versatile commuter bags",
    description:
      "Aksesoris modular dan tas kompartemen praktis untuk aktivitas harianmu yang dinamis",
    imageUrl:
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=2000&q=85",
    mobileImageUrl:
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1080&h=1440&q=85",
    ctaText: "Shop Urban Gear",
    ctaLink: "/categories/backpacks",
    sortOrder: 3,
    isActive: true,
    createdAt: "2026-10-01",
  },
];

export const INITIAL_ALL_BANNERS: AdminBannerItem[] = [
  ...INITIAL_HERO_BANNERS,
  ...INITIAL_SECONDARY_BANNERS,
];

/**
 * File storage helpers for reliable server persistence
 */
function ensureDataDir(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn("[banner-store] Could not create data dir:", err);
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
    console.warn("[banner-store] Error reading banners.json:", err);
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
    console.warn("[banner-store] Error writing banners.json:", err);
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
    console.warn("[banner-store] Database unavailable, reading from persistent file cache:", dbError);
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
    console.warn("[banner-store] DB offline for active banners, reading from persistent file:", err);
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
    console.warn("[banner-store] Syncing banner to PostgreSQL skipped:", err);
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
    console.warn("[banner-store] DB delete error skipped:", err);
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
    console.warn("[banner-store] Reset DB skipped:", err);
  }

  try {
    revalidatePath("/");
    revalidatePath("/admin/banners");
  } catch {}

  return INITIAL_ALL_BANNERS;
}
