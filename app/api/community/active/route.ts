import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  INITIAL_COMMUNITY_POSTS,
  type CommunityPost,
} from "@/lib/community-store";

export const dynamic = "force-dynamic";

export async function GET() {
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
      return NextResponse.json({ posts: formatted, source: "database" });
    }

    return NextResponse.json({
      posts: INITIAL_COMMUNITY_POSTS.filter((p) => p.isActive),
      source: "defaults",
    });
  } catch (error) {
    console.warn("Public community posts fallback active:", error);
    return NextResponse.json({
      posts: INITIAL_COMMUNITY_POSTS.filter((p) => p.isActive),
      source: "fallback",
    });
  }
}
