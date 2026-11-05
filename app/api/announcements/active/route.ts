import { NextResponse } from "next/server";
import { getActiveStorefrontAnnouncementsStore } from "@/lib/announcements.server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const announcements = await getActiveStorefrontAnnouncementsStore();
    return NextResponse.json({ announcements, source: "database" });
  } catch (error) {
    console.error("GET /api/announcements/active error:", error);
    return NextResponse.json(
      { announcements: [], error: "Gagal memuat announcement dari database." },
      { status: 503 }
    );
  }
}
