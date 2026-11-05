import { NextResponse } from "next/server";
import {
  getAllAnnouncementsStore,
  createAnnouncementStore,
} from "@/lib/announcements.server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get("status");

  try {
    const announcements = await getAllAnnouncementsStore(
      statusFilter === "active" || statusFilter === "inactive" ? statusFilter : undefined
    );
    return NextResponse.json({ announcements, source: "database" });
  } catch (error) {
    console.error("GET /api/admin/announcements error:", error);
    return NextResponse.json(
      { announcements: [], error: "Gagal memuat announcement dari database." },
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

  const { text, link, badge, sortOrder = 0, isActive = true } = body ?? {};

  if (typeof text !== "string" || !text.trim()) {
    return NextResponse.json(
      { error: "Teks announcement wajib diisi." },
      { status: 400 }
    );
  }

  try {
    const saved = await createAnnouncementStore({ text, link, badge, sortOrder, isActive });
    return NextResponse.json({ announcement: saved, success: true }, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/announcements error:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan announcement ke database." },
      { status: 503 }
    );
  }
}
