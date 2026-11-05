import { NextResponse } from "next/server";
import {
  getAnnouncementByIdStore,
  updateAnnouncementStore,
  deleteAnnouncementStore,
} from "@/lib/announcements.server";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const item = await getAnnouncementByIdStore(params.id);
    if (!item) {
      return NextResponse.json({ error: "Announcement tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ announcement: item });
  } catch (error) {
    console.error("GET /api/admin/announcements/[id] error:", error);
    return NextResponse.json(
      { error: "Gagal memuat announcement dari database." },
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
  const { text, link, badge, sortOrder, isActive } = body ?? {};

  try {
    const existing = await getAnnouncementByIdStore(params.id);
    if (!existing) {
      return NextResponse.json({ error: "Announcement tidak ditemukan" }, { status: 404 });
    }

    const nextText = text !== undefined ? String(text) : existing.text;
    if (!nextText.trim()) {
      return NextResponse.json({ error: "Teks announcement wajib diisi." }, { status: 400 });
    }

    const saved = await updateAnnouncementStore(params.id, {
      text: nextText,
      link: link !== undefined ? link : existing.link,
      badge: badge !== undefined ? badge : existing.badge,
      sortOrder: sortOrder !== undefined ? sortOrder : existing.sortOrder,
      isActive: isActive !== undefined ? isActive : existing.isActive,
    });
    if (!saved) {
      return NextResponse.json({ error: "Announcement tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ announcement: saved, success: true });
  } catch (error) {
    console.error("PUT /api/admin/announcements/[id] error:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui announcement di database." },
      { status: 503 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const deleted = await deleteAnnouncementStore(params.id);
    if (!deleted) {
      return NextResponse.json({ error: "Announcement tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: "Announcement berhasil dihapus." });
  } catch (error) {
    console.error("DELETE /api/admin/announcements/[id] error:", error);
    return NextResponse.json(
      { error: "Gagal menghapus announcement dari database." },
      { status: 503 }
    );
  }
}
