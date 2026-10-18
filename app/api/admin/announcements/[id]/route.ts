import { NextResponse } from "next/server";
import {
  saveAnnouncementStore,
  deleteAnnouncementStore,
  getAllAnnouncementsStore,
} from "@/lib/announcements.server";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { announcements } = await getAllAnnouncementsStore();
    const item = announcements.find((a) => a.id === params.id);

    if (!item) {
      return NextResponse.json({ error: "Announcement tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ announcement: item });
  } catch (error) {
    console.error("GET /api/admin/announcements/[id] error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data announcement." },
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
      text,
      link,
      badge,
      sortOrder,
      isActive,
    } = body;

    const { announcements } = await getAllAnnouncementsStore();
    const existing = announcements.find((a) => a.id === params.id);

    const saved = await saveAnnouncementStore({
      id: params.id,
      text: text !== undefined ? text : existing?.text || "ANNOUNCEMENT",
      link: link !== undefined ? link : existing?.link,
      badge: badge !== undefined ? badge : existing?.badge,
      sortOrder: sortOrder !== undefined ? sortOrder : existing?.sortOrder ?? 0,
      isActive: isActive !== undefined ? isActive : existing?.isActive ?? true,
    });

    return NextResponse.json({ announcement: saved, success: true });
  } catch (error) {
    console.error("PUT /api/admin/announcements/[id] error:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui announcement." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await deleteAnnouncementStore(params.id);
    return NextResponse.json({ success: true, message: "Announcement berhasil dihapus." });
  } catch (error) {
    console.error("DELETE /api/admin/announcements/[id] error:", error);
    return NextResponse.json(
      { error: "Gagal menghapus announcement." },
      { status: 500 }
    );
  }
}
