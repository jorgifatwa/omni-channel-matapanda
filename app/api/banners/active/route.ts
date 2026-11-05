import { NextResponse } from "next/server";
import { getActiveStorefrontBanners } from "@/lib/banner-store.server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { heroBanners, secondaryBanners } = await getActiveStorefrontBanners();
    return NextResponse.json({ heroBanners, secondaryBanners, source: "database" });
  } catch (error) {
    console.error("Public active banners error:", error);
    return NextResponse.json(
      { heroBanners: [], secondaryBanners: [], error: "Gagal memuat banner dari database." },
      { status: 503 }
    );
  }
}
