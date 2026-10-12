import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  INITIAL_HERO_BANNERS,
  INITIAL_SECONDARY_BANNERS,
} from "@/lib/banner-store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const banners = await prisma.banner.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    const heroBanners = banners.filter((b) => b.type === "HERO_BANNER");
    const secondaryBanners = banners.filter((b) => b.type === "SECONDARY_BANNER");

    return NextResponse.json({
      heroBanners: heroBanners.length > 0 ? heroBanners : INITIAL_HERO_BANNERS,
      secondaryBanners:
        secondaryBanners.length > 0 ? secondaryBanners : INITIAL_SECONDARY_BANNERS,
      source: banners.length > 0 ? "database" : "defaults",
    });
  } catch (error) {
    console.warn("Public banners fallback active:", error);
    return NextResponse.json({
      heroBanners: INITIAL_HERO_BANNERS,
      secondaryBanners: INITIAL_SECONDARY_BANNERS,
      source: "fallback",
    });
  }
}
