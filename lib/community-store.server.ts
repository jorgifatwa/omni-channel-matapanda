import { revalidatePath } from "next/cache";
import type { CommunityPost as CommunityPostRow } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { type CommunityPost } from "@/lib/community-store";

export type { CommunityPost };

/**
 * Community post store backed purely by PostgreSQL (Prisma). No file cache and
 * no auto-seeding: an empty table yields an empty list, and database errors
 * are thrown so API routes can respond with an error status.
 */

function isUuid(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

function toCommunityPost(p: CommunityPostRow): CommunityPost {
  return {
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
  };
}

function revalidateCommunityPaths() {
  try {
    revalidatePath("/");
    revalidatePath("/admin/community");
  } catch {}
}

/** All community posts for the admin panel. Throws on database error. */
export async function getAllCommunityPostsStore(
  status?: "active" | "inactive"
): Promise<CommunityPost[]> {
  const rows = await prisma.communityPost.findMany({
    where:
      status === "active" ? { isActive: true } : status === "inactive" ? { isActive: false } : undefined,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  return rows.map(toCommunityPost);
}

/** Single post by id, or null. Throws on database error. */
export async function getCommunityPostByIdStore(id: string): Promise<CommunityPost | null> {
  if (!isUuid(id)) return null;
  const row = await prisma.communityPost.findUnique({ where: { id } });
  return row ? toCommunityPost(row) : null;
}

/** Active posts for the storefront. Throws on database error. */
export async function getActiveCommunityPostsStore(): Promise<CommunityPost[]> {
  return getAllCommunityPostsStore("active");
}

export interface CommunityPostInput {
  image: string;
  accountHandle?: string | null;
  accountAvatarUrl?: string | null;
  caption: string;
  postDate?: string | null;
  instagramUrl?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

function toPostData(data: CommunityPostInput) {
  return {
    image: data.image.trim(),
    accountHandle: (data.accountHandle || "itsmatapanda").replace(/^@/, "").trim(),
    accountAvatarUrl: data.accountAvatarUrl ? data.accountAvatarUrl.trim() : null,
    caption: data.caption.trim(),
    postDate: data.postDate ? data.postDate.trim() : null,
    instagramUrl: data.instagramUrl ? data.instagramUrl.trim() : null,
    sortOrder: Number(data.sortOrder) || 0,
    isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
  };
}

/** Create a post. Throws on database error. */
export async function createCommunityPostStore(data: CommunityPostInput): Promise<CommunityPost> {
  const row = await prisma.communityPost.create({ data: toPostData(data) });
  revalidateCommunityPaths();
  return toCommunityPost(row);
}

/** Update a post. Returns null when it does not exist. Throws on database error. */
export async function updateCommunityPostStore(
  id: string,
  data: CommunityPostInput
): Promise<CommunityPost | null> {
  if (!isUuid(id)) return null;
  const existing = await prisma.communityPost.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return null;
  const row = await prisma.communityPost.update({ where: { id }, data: toPostData(data) });
  revalidateCommunityPaths();
  return toCommunityPost(row);
}

/** Delete a post. Returns false when it does not exist. Throws on database error. */
export async function deleteCommunityPostStore(id: string): Promise<boolean> {
  if (!isUuid(id)) return false;
  const result = await prisma.communityPost.deleteMany({ where: { id } });
  revalidateCommunityPaths();
  return result.count > 0;
}
