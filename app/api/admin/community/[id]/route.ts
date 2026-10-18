import { NextResponse } from "next/server";
import {
  saveCommunityPostStore,
  deleteCommunityPostStore,
  getAllCommunityPostsStore,
} from "@/lib/community-store.server";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { posts } = await getAllCommunityPostsStore();
    const item = posts.find((p) => p.id === params.id);

    if (!item) {
      return NextResponse.json({ error: "Post tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ post: item });
  } catch (error) {
    console.error("GET /api/admin/community/[id] error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data post." },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const {
      image,
      accountHandle,
      accountAvatarUrl,
      caption,
      postDate,
      instagramUrl,
      sortOrder,
      isActive,
    } = body;

    const { posts } = await getAllCommunityPostsStore();
    const existing = posts.find((p) => p.id === params.id);

    const saved = await saveCommunityPostStore({
      id: params.id,
      image: image !== undefined ? image : existing?.image || "",
      accountHandle: accountHandle !== undefined ? accountHandle : existing?.accountHandle,
      accountAvatarUrl: accountAvatarUrl !== undefined ? accountAvatarUrl : existing?.accountAvatarUrl,
      caption: caption !== undefined ? caption : existing?.caption || "",
      postDate: postDate !== undefined ? postDate : existing?.postDate,
      instagramUrl: instagramUrl !== undefined ? instagramUrl : existing?.instagramUrl,
      sortOrder: sortOrder !== undefined ? sortOrder : existing?.sortOrder ?? 0,
      isActive: isActive !== undefined ? isActive : existing?.isActive ?? true,
    });

    return NextResponse.json({ post: saved, success: true });
  } catch (error) {
    console.error("PUT /api/admin/community/[id] error:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui post." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await deleteCommunityPostStore(params.id);
    return NextResponse.json({ success: true, message: "Post berhasil dihapus." });
  } catch (error) {
    console.error("DELETE /api/admin/community/[id] error:", error);
    return NextResponse.json(
      { error: "Gagal menghapus post." },
      { status: 500 }
    );
  }
}
