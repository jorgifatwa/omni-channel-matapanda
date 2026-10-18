import { NextResponse } from "next/server";
import { getActiveCommunityPostsStore } from "@/lib/community-store.server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { posts, source } = await getActiveCommunityPostsStore();
    return NextResponse.json({ posts, source });
  } catch (error) {
    console.error("GET /api/community/active error:", error);
    return NextResponse.json({ posts: [], source: "error" }, { status: 500 });
  }
}
