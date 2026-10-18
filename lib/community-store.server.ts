import fs from "fs";
import path from "path";
import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  INITIAL_COMMUNITY_POSTS,
  type CommunityPost,
} from "@/lib/community-store";

export type { CommunityPost };
export { INITIAL_COMMUNITY_POSTS };

const DATA_DIR = path.join(process.cwd(), "data");
const COMMUNITY_FILE = path.join(DATA_DIR, "community.json");

function isUuid(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

function ensureDataDir(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn("[community.server] Could not create data dir:", err);
  }
}

function normalizePost(post: CommunityPost): CommunityPost {
  if (isUuid(post.id)) return post;
  return {
    ...post,
    id: crypto.randomUUID(),
  };
}

export function readCommunityPostsFromFile(): CommunityPost[] {
  ensureDataDir();
  try {
    if (fs.existsSync(COMMUNITY_FILE)) {
      const raw = fs.readFileSync(COMMUNITY_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("[community.server] Error reading community.json:", err);
  }

  const initialWithUuids = INITIAL_COMMUNITY_POSTS.map((p) => normalizePost(p));
  writeCommunityPostsToFile(initialWithUuids);
  return initialWithUuids;
}

export function writeCommunityPostsToFile(posts: CommunityPost[]): void {
  ensureDataDir();
  try {
    fs.writeFileSync(COMMUNITY_FILE, JSON.stringify(posts, null, 2), "utf-8");
  } catch (err) {
    console.warn("[community.server] Error writing community.json:", err);
  }
}

/**
 * Get all community posts for Admin API with DB + File dual persistence
 */
export async function getAllCommunityPostsStore(status?: "active" | "inactive"): Promise<{
  posts: CommunityPost[];
  source: "database" | "file-cache";
}> {
  try {
    const whereClause: { isActive?: boolean } = {};
    if (status === "active") whereClause.isActive = true;
    if (status === "inactive") whereClause.isActive = false;

    const dbPosts = await prisma.communityPost.findMany({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    if (dbPosts && dbPosts.length > 0) {
      const formatted: CommunityPost[] = dbPosts.map((p) => ({
        id: p.id,
        image: p.image,
        accountHandle: p.accountHandle,
        accountAvatarUrl: p.accountAvatarUrl,
        caption: p.caption,
        postDate: p.postDate,
        instagramUrl: p.instagramUrl,
        sortOrder: p.sortOrder,
        isActive: p.isActive,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      }));

      if (!status) {
        writeCommunityPostsToFile(formatted);
      }

      return { posts: formatted, source: "database" };
    }

    // If DB is empty, auto-seed DB with initial items
    const seededList = readCommunityPostsFromFile();
    try {
      for (const item of seededList) {
        await prisma.communityPost.create({
          data: {
            id: isUuid(item.id) ? item.id : undefined,
            image: item.image,
            accountHandle: item.accountHandle,
            accountAvatarUrl: item.accountAvatarUrl || null,
            caption: item.caption,
            postDate: item.postDate || null,
            instagramUrl: item.instagramUrl || null,
            sortOrder: item.sortOrder,
            isActive: item.isActive,
          },
        });
      }
    } catch (seedErr) {
      console.warn("[community.server] Auto-seed DB failed:", seedErr);
    }
  } catch (dbError) {
    console.warn("[community.server] Database unavailable, reading file cache:", dbError);
  }

  const filePosts = readCommunityPostsFromFile();
  const filtered = status === "active"
    ? filePosts.filter((p) => p.isActive)
    : status === "inactive"
    ? filePosts.filter((p) => !p.isActive)
    : filePosts;

  return { posts: filtered, source: "file-cache" };
}

/**
 * Get active community posts for Storefront
 */
export async function getActiveCommunityPostsStore(): Promise<{
  posts: CommunityPost[];
  source: "database" | "file-cache";
}> {
  try {
    const dbPosts = await prisma.communityPost.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    if (dbPosts && dbPosts.length > 0) {
      const formatted: CommunityPost[] = dbPosts.map((p) => ({
        id: p.id,
        image: p.image,
        accountHandle: p.accountHandle,
        accountAvatarUrl: p.accountAvatarUrl,
        caption: p.caption,
        postDate: p.postDate,
        instagramUrl: p.instagramUrl,
        sortOrder: p.sortOrder,
        isActive: p.isActive,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      }));
      return { posts: formatted, source: "database" };
    }
  } catch (err) {
    console.warn("[community.server] DB offline for active posts:", err);
  }

  const filePosts = readCommunityPostsFromFile().filter((p) => p.isActive);
  return { posts: filePosts, source: "file-cache" };
}

/**
 * Save community post (create / update) with DB + file dual persistence
 */
export async function saveCommunityPostStore(data: {
  id?: string;
  image: string;
  accountHandle?: string;
  accountAvatarUrl?: string | null;
  caption: string;
  postDate?: string | null;
  instagramUrl?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}): Promise<CommunityPost> {
  const currentPosts = readCommunityPostsFromFile();
  const id = data.id && isUuid(data.id) ? data.id : crypto.randomUUID();
  const now = new Date().toISOString();

  const newOrUpdated: CommunityPost = {
    id,
    image: data.image.trim(),
    accountHandle: (data.accountHandle || "itsmatapanda").replace(/^@/, "").trim(),
    accountAvatarUrl: data.accountAvatarUrl ? data.accountAvatarUrl.trim() : null,
    caption: data.caption.trim(),
    postDate: data.postDate ? data.postDate.trim() : null,
    instagramUrl: data.instagramUrl ? data.instagramUrl.trim() : null,
    sortOrder: Number(data.sortOrder) || 0,
    isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
    createdAt: now,
    updatedAt: now,
  };

  // 1. File cache
  const existingIdx = currentPosts.findIndex((p) => p.id === (data.id || id));
  let updatedList: CommunityPost[];
  if (existingIdx >= 0) {
    newOrUpdated.createdAt = currentPosts[existingIdx].createdAt;
    updatedList = [...currentPosts];
    updatedList[existingIdx] = newOrUpdated;
  } else {
    updatedList = [...currentPosts, newOrUpdated];
  }
  writeCommunityPostsToFile(updatedList);

  // 2. Sync to PostgreSQL
  try {
    await prisma.communityPost.upsert({
      where: { id },
      create: {
        id,
        image: newOrUpdated.image,
        accountHandle: newOrUpdated.accountHandle,
        accountAvatarUrl: newOrUpdated.accountAvatarUrl,
        caption: newOrUpdated.caption,
        postDate: newOrUpdated.postDate,
        instagramUrl: newOrUpdated.instagramUrl,
        sortOrder: newOrUpdated.sortOrder,
        isActive: newOrUpdated.isActive,
      },
      update: {
        image: newOrUpdated.image,
        accountHandle: newOrUpdated.accountHandle,
        accountAvatarUrl: newOrUpdated.accountAvatarUrl,
        caption: newOrUpdated.caption,
        postDate: newOrUpdated.postDate,
        instagramUrl: newOrUpdated.instagramUrl,
        sortOrder: newOrUpdated.sortOrder,
        isActive: newOrUpdated.isActive,
      },
    });
  } catch (err) {
    console.warn("[community.server] PostgreSQL sync skipped:", err);
  }

  // 3. Invalidate paths
  try {
    revalidatePath("/");
    revalidatePath("/admin/community");
  } catch {}

  return newOrUpdated;
}

/**
 * Delete community post
 */
export async function deleteCommunityPostStore(id: string): Promise<boolean> {
  const currentPosts = readCommunityPostsFromFile();
  const updatedList = currentPosts.filter((p) => p.id !== id);
  writeCommunityPostsToFile(updatedList);

  try {
    if (isUuid(id)) {
      await prisma.communityPost.delete({ where: { id } }).catch(() => {});
    } else {
      await prisma.communityPost.deleteMany({
        where: { id },
      }).catch(() => {});
    }
  } catch (err) {
    console.warn("[community.server] PostgreSQL delete skipped:", err);
  }

  try {
    revalidatePath("/");
    revalidatePath("/admin/community");
  } catch {}

  return true;
}
