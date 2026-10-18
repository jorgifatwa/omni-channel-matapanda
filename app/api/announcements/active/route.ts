import { NextResponse } from "next/server";
import { getActiveStorefrontAnnouncementsStore } from "@/lib/announcements.server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { announcements, source } = await getActiveStorefrontAnnouncementsStore();
    return NextResponse.json({ announcements, source });
  } catch (error) {
    console.error("GET /api/announcements/active error:", error);
    return NextResponse.json({ announcements: [], source: "error" }, { status: 500 });
  }
}
