import { NextResponse } from "next/server";
import {
  getAllAnnouncementsStore,
  saveAnnouncementStore,
} from "@/lib/announcements.server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get("status") as "active" | "inactive" | null;

  try {
    const { announcements, source } = await getAllAnnouncementsStore(
      statusFilter === "active" || statusFilter === "inactive" ? statusFilter : undefined
    );
    return NextResponse.json({ announcements, source });
  } catch (error) {
    console.error("GET /api/admin/announcements error:", error);
    return NextResponse.json(
      { error: "Gagal memuat announcements." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      text,
      link,
      badge,
      sortOrder = 0,
      isActive = true,
    } = body;

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: "Teks announcement wajib diisi." },
        { status: 400 }
      );
    }

    const saved = await saveAnnouncementStore({
      text,
      link,
      badge,
      sortOrder,
      isActive,
    });

    return NextResponse.json(
      { announcement: saved, success: true },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/admin/announcements error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server saat membuat announcement." },
      { status: 500 }
    );
  }
}
