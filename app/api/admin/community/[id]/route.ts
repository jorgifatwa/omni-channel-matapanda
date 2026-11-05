import { NextResponse } from "next/server";
import {
  getCommunityPostByIdStore,
  updateCommunityPostStore,
  deleteCommunityPostStore,
} from "@/lib/community-store.server";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const item = await getCommunityPostByIdStore(params.id);
    if (!item) {
      return NextResponse.json({ error: "Post tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ post: item });
  } catch (error) {
    console.error("GET /api/admin/community/[id] error:", error);
    return NextResponse.json(
      { error: "Gagal memuat post dari database." },
      { status: 503 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
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
    sortOrder,
    isActive,
  } = body ?? {};

  try {
    const existing = await getCommunityPostByIdStore(params.id);
    if (!existing) {
      return NextResponse.json({ error: "Post tidak ditemukan" }, { status: 404 });
    }

    const nextImage = image !== undefined ? String(image) : existing.image;
    const nextCaption = caption !== undefined ? String(caption) : existing.caption;
    if (!nextImage.trim() || !nextCaption.trim()) {
      return NextResponse.json({ error: "Gambar dan caption wajib diisi." }, { status: 400 });
    }

    const saved = await updateCommunityPostStore(params.id, {
      image: nextImage,
      accountHandle: accountHandle !== undefined ? accountHandle : existing.accountHandle,
      accountAvatarUrl: accountAvatarUrl !== undefined ? accountAvatarUrl : existing.accountAvatarUrl,
      caption: nextCaption,
      postDate: postDate !== undefined ? postDate : existing.postDate,
      instagramUrl: instagramUrl !== undefined ? instagramUrl : existing.instagramUrl,
      sortOrder: sortOrder !== undefined ? sortOrder : existing.sortOrder,
      isActive: isActive !== undefined ? isActive : existing.isActive,
    });
    if (!saved) {
      return NextResponse.json({ error: "Post tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ post: saved, success: true });
  } catch (error) {
    console.error("PUT /api/admin/community/[id] error:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui post di database." },
      { status: 503 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const deleted = await deleteCommunityPostStore(params.id);
    if (!deleted) {
      return NextResponse.json({ error: "Post tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: "Post berhasil dihapus." });
  } catch (error) {
    console.error("DELETE /api/admin/community/[id] error:", error);
    return NextResponse.json(
      { error: "Gagal menghapus post dari database." },
      { status: 503 }
    );
  }
}
