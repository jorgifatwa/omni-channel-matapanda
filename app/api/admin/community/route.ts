import { NextResponse } from "next/server";
import {
  getAllCommunityPostsStore,
  saveCommunityPostStore,
} from "@/lib/community-store.server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get("status") as "active" | "inactive" | null;

  try {
    const { posts, source } = await getAllCommunityPostsStore(
      statusFilter === "active" || statusFilter === "inactive" ? statusFilter : undefined
    );
    return NextResponse.json({ posts, source });
  } catch (error) {
    console.error("GET /api/admin/community error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data community posts." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      image,
      accountHandle,
      accountAvatarUrl,
      caption,
      postDate,
      instagramUrl,
      sortOrder = 0,
      isActive = true,
    } = body;

    if (!image || !image.trim()) {
      return NextResponse.json(
        { error: "URL gambar wajib diisi." },
        { status: 400 }
      );
    }

    if (!caption || !caption.trim()) {
      return NextResponse.json(
        { error: "Caption wajib diisi." },
        { status: 400 }
      );
    }

    const saved = await saveCommunityPostStore({
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
      { error: "Terjadi kesalahan pada server saat menambahkan post." },
      { status: 500 }
    );
  }
}
