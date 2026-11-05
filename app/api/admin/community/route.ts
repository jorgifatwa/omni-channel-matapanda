import { NextResponse } from "next/server";
import {
  getAllCommunityPostsStore,
  createCommunityPostStore,
} from "@/lib/community-store.server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get("status");

  try {
    const posts = await getAllCommunityPostsStore(
      statusFilter === "active" || statusFilter === "inactive" ? statusFilter : undefined
    );
    return NextResponse.json({ posts, source: "database" });
  } catch (error) {
    console.error("GET /api/admin/community error:", error);
    return NextResponse.json(
      { posts: [], error: "Gagal memuat community post dari database." },
      { status: 503 }
    );
  }
}

export async function POST(request: Request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Format data tidak valid." }, { status: 400 });
  }

  const {
    image,
    accountHandle,
    accountAvatarUrl,
    caption,
    postDate,
    instagramUrl,
    sortOrder = 0,
    isActive = true,
  } = body ?? {};

  if (typeof image !== "string" || !image.trim()) {
    return NextResponse.json({ error: "URL gambar wajib diisi." }, { status: 400 });
  }
  if (typeof caption !== "string" || !caption.trim()) {
    return NextResponse.json({ error: "Caption wajib diisi." }, { status: 400 });
  }

  try {
    const saved = await createCommunityPostStore({
      image,
      accountHandle,
      accountAvatarUrl,
      caption,
      postDate,
      instagramUrl,
      sortOrder,
      isActive,
    });
    return NextResponse.json({ post: saved, success: true }, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/community error:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan post ke database." },
      { status: 503 }
    );
  }
}
