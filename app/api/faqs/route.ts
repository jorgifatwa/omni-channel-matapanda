import { NextResponse } from "next/server";
import { getActiveFaqsStore } from "@/lib/faq-store.server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") || undefined;
  const search = searchParams.get("search")?.toLowerCase().trim() || undefined;

  try {
    const { faqs, source } = await getActiveFaqsStore({
      category,
      search,
    });
    return NextResponse.json({ faqs, source });
  } catch (error) {
    console.error("GET /api/faqs error:", error);
    return NextResponse.json({ faqs: [], source: "error" }, { status: 500 });
  }
}
