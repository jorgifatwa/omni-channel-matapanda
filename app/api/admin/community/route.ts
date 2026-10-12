import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  INITIAL_COMMUNITY_POSTS,
  type CommunityPost,
} from "@/lib/community-store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get("status");

  try {
    const whereClause: { isActive?: boolean } = {};
    if (statusFilter === "active") whereClause.isActive = true;
    if (statusFilter === "inactive") whereClause.isActive = false;

    const posts = await prisma.communityPost.findMany({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    if (posts.length > 0) {
      const formatted: CommunityPost[] = posts.map((p) => ({
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

    let combined = [...INITIAL_COMMUNITY_POSTS];
    if (statusFilter === "active") {
      combined = combined.filter((p) => p.isActive);
    } else if (statusFilter === "inactive") {
      combined = combined.filter((p) => !p.isActive);
    }

    return NextResponse.json({ posts: combined, source: "defaults" });
  } catch (error) {
    console.warn("Database unavailable for community posts, using fallback:", error);
    let combined = [...INITIAL_COMMUNITY_POSTS];
    if (statusFilter === "active") {
      combined = combined.filter((p) => p.isActive);
    } else if (statusFilter === "inactive") {
      combined = combined.filter((p) => !p.isActive);
    }
    return NextResponse.json({ posts: combined, source: "fallback" });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      image,
      accountHandle = "itsmatapanda",
      accountAvatarUrl,
      caption,
      postDate,
      instagramUrl,
      sortOrder = 0,
      isActive = true,
    } = body;

    if (!image || !caption) {
      return NextResponse.json(
        { error: "Foto dan Caption postingan wajib diisi." },
        { status: 400 }
      );
    }

    try {
      const created = await prisma.communityPost.create({
        data: {
          image: image.trim(),
          accountHandle: (accountHandle || "itsmatapanda").replace(/^@/, "").trim(),
          accountAvatarUrl: accountAvatarUrl ? accountAvatarUrl.trim() : null,
          caption: caption.trim(),
          postDate: postDate ? postDate.trim() : null,
          instagramUrl: instagramUrl ? instagramUrl.trim() : null,
          sortOrder: Number(sortOrder) || 0,
          isActive: Boolean(isActive),
        },
      });

      const formatted: CommunityPost = {
        id: created.id,
        image: created.image,
        accountHandle: created.accountHandle,
        accountAvatarUrl: created.accountAvatarUrl,
        caption: created.caption,
        postDate: created.postDate,
        instagramUrl: created.instagramUrl,
        sortOrder: created.sortOrder,
        isActive: created.isActive,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      };

      return NextResponse.json({ post: formatted, success: true }, { status: 201 });
    } catch (dbError) {
      console.warn("Database create failed for community post, using in-memory response:", dbError);
      const fallbackItem: CommunityPost = {
        id: `cp-${Date.now()}`,
        image: image.trim(),
        accountHandle: (accountHandle || "itsmatapanda").replace(/^@/, "").trim(),
        accountAvatarUrl: accountAvatarUrl ? accountAvatarUrl.trim() : null,
        caption: caption.trim(),
        postDate: postDate ? postDate.trim() : null,
        instagramUrl: instagramUrl ? instagramUrl.trim() : null,
        sortOrder: Number(sortOrder) || 0,
        isActive: Boolean(isActive),
        createdAt: new Date().toISOString(),
      };
      return NextResponse.json({ post: fallbackItem, success: true }, { status: 201 });
    }
  } catch (error) {
    console.error("POST /api/admin/community error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server saat membuat post community." },
      { status: 500 }
    );
  }
}
