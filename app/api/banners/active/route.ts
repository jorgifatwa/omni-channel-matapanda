import { NextResponse } from "next/server";
import { getActiveStorefrontBanners } from "@/lib/banner-store.server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { heroBanners, secondaryBanners, source } = await getActiveStorefrontBanners();

    return NextResponse.json({
      heroBanners,
      secondaryBanners,
      source,
    });
  } catch (error) {
    console.error("Public active banners error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data banner aktif." },
      { status: 500 }
    );
  }
}
