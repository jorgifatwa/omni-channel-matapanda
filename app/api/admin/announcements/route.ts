import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  INITIAL_ANNOUNCEMENTS,
  type AdminAnnouncementItem,
} from "@/lib/announcements";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get("status"); // "active" | "inactive" | null

  try {
    const whereClause: { isActive?: boolean } = {};
    if (statusFilter === "active") whereClause.isActive = true;
    if (statusFilter === "inactive") whereClause.isActive = false;

    const announcements = await prisma.announcement.findMany({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    if (announcements.length > 0) {
      const formatted: AdminAnnouncementItem[] = announcements.map((a) => ({
        id: a.id,
        text: a.text,
        link: a.link,
        badge: a.badge,
        sortOrder: a.sortOrder,
        isActive: a.isActive,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      }));

      return NextResponse.json({ announcements: formatted, source: "database" });
    }

    // If database table is empty, return INITIAL_ANNOUNCEMENTS
    let combined = [...INITIAL_ANNOUNCEMENTS];
    if (statusFilter === "active") {
      combined = combined.filter((a) => a.isActive);
    } else if (statusFilter === "inactive") {
      combined = combined.filter((a) => !a.isActive);
    }

    return NextResponse.json({ announcements: combined, source: "defaults" });
  } catch (error) {
    console.warn("Database unavailable for announcements, using fallback:", error);
    let combined = [...INITIAL_ANNOUNCEMENTS];
    if (statusFilter === "active") {
      combined = combined.filter((a) => a.isActive);
    } else if (statusFilter === "inactive") {
      combined = combined.filter((a) => !a.isActive);
    }
    return NextResponse.json({ announcements: combined, source: "fallback" });
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

    try {
      const created = await prisma.announcement.create({
        data: {
          text: text.trim().toUpperCase(),
          link: link && link.trim() ? link.trim() : null,
          badge: badge && badge.trim() ? badge.trim().toUpperCase() : null,
          sortOrder: Number(sortOrder) || 0,
          isActive: Boolean(isActive),
        },
      });

      const formatted: AdminAnnouncementItem = {
        id: created.id,
        text: created.text,
        link: created.link,
        badge: created.badge,
        sortOrder: created.sortOrder,
        isActive: created.isActive,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      };

      return NextResponse.json({ announcement: formatted, success: true }, { status: 201 });
    } catch (dbError) {
      console.warn("Database create failed, using in-memory response:", dbError);
      const fallbackItem: AdminAnnouncementItem = {
        id: `ann-${Date.now()}`,
        text: text.trim().toUpperCase(),
        link: link && link.trim() ? link.trim() : null,
        badge: badge && badge.trim() ? badge.trim().toUpperCase() : null,
        sortOrder: Number(sortOrder) || 0,
        isActive: Boolean(isActive),
        createdAt: new Date().toISOString(),
      };
      return NextResponse.json({ announcement: fallbackItem, success: true }, { status: 201 });
    }
  } catch (error) {
    console.error("POST /api/admin/announcements error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server saat membuat announcement." },
      { status: 500 }
    );
  }
}
