import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  INITIAL_ANNOUNCEMENTS,
  type AnnouncementMessage,
} from "@/lib/announcements";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const dbItems = await prisma.announcement.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    if (dbItems && dbItems.length > 0) {
      const formatted: AnnouncementMessage[] = dbItems.map((item) => ({
        id: item.id,
        text: item.text,
        link: item.link || undefined,
        badge: item.badge || undefined,
        isPromo: item.badge === "PROMO" || item.badge === "VOUCHER",
      }));
      return NextResponse.json({ announcements: formatted, source: "database" });
    }

    const fallback = INITIAL_ANNOUNCEMENTS.filter((item) => item.isActive).map((item) => ({
      id: item.id,
      text: item.text,
      link: item.link || undefined,
      badge: item.badge || undefined,
      isPromo: item.badge === "PROMO" || item.badge === "VOUCHER",
    }));

    return NextResponse.json({ announcements: fallback, source: "defaults" });
  } catch (error) {
    console.warn("Public announcements fallback active:", error);
    const fallback = INITIAL_ANNOUNCEMENTS.filter((item) => item.isActive).map((item) => ({
      id: item.id,
      text: item.text,
      link: item.link || undefined,
      badge: item.badge || undefined,
      isPromo: item.badge === "PROMO" || item.badge === "VOUCHER",
    }));

    return NextResponse.json({ announcements: fallback, source: "fallback" });
  }
}
