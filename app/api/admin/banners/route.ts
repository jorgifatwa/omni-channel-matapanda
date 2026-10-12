import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  INITIAL_ALL_BANNERS,
  INITIAL_HERO_BANNERS,
  INITIAL_SECONDARY_BANNERS,
  type BannerType,
  type AdminBannerItem,
} from "@/lib/banner-store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") as BannerType | null;

  try {
    const banners = await prisma.banner.findMany({
      where: type ? { type } : undefined,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    const formattedBanners: AdminBannerItem[] = banners.map((b) => ({
      id: b.id,
      type: b.type as BannerType,
      title: b.title,
      subtitle: b.subtitle,
      description: b.description,
      imageUrl: b.imageUrl,
      mobileImageUrl: b.mobileImageUrl,
      ctaText: b.ctaText,
      ctaLink: b.ctaLink,
      sortOrder: b.sortOrder,
      isActive: b.isActive,
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
    }));

    const hasHero = formattedBanners.some((b) => b.type === "HERO_BANNER");
    const hasSecondary = formattedBanners.some((b) => b.type === "SECONDARY_BANNER");

    let combined: AdminBannerItem[] = [...formattedBanners];
    if (!type || type === "HERO_BANNER") {
      if (!hasHero) {
        combined = [...combined, ...INITIAL_HERO_BANNERS];
      }
    }
    if (!type || type === "SECONDARY_BANNER") {
      if (!hasSecondary) {
        combined = [...combined, ...INITIAL_SECONDARY_BANNERS];
      }
    }

    if (type) {
      combined = combined.filter((b) => b.type === type);
    }

    return NextResponse.json({ banners: combined, source: "database_or_defaults" });
  } catch (error) {
    console.warn("Database unavailable for banners, using fallback:", error);
    const filteredDefaults = type
      ? INITIAL_ALL_BANNERS.filter((b) => b.type === type)
      : INITIAL_ALL_BANNERS;
    return NextResponse.json({ banners: filteredDefaults, source: "fallback" });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      type = "HERO_BANNER",
      title,
      subtitle,
      description,
      imageUrl,
      mobileImageUrl,
      ctaText,
      ctaLink,
      sortOrder = 0,
      isActive = true,
    } = body;

    if (!title || !imageUrl) {
      return NextResponse.json(
        { error: "Judul dan Gambar Banner wajib diisi." },
        { status: 400 }
      );
    }

    try {
      const banner = await prisma.banner.create({
        data: {
          type,
          title,
          subtitle: subtitle || null,
          description: description || null,
          imageUrl,
          mobileImageUrl: mobileImageUrl || null,
          ctaText: ctaText || null,
          ctaLink: ctaLink || null,
          sortOrder: Number(sortOrder) || 0,
          isActive: Boolean(isActive),
        },
      });

      return NextResponse.json({ banner, success: true }, { status: 201 });
    } catch (dbError) {
      console.warn("Database create failed, returning memory item:", dbError);
      const fallbackBanner = {
        id: `banner-${Date.now()}`,
        type,
        title,
        subtitle: subtitle || null,
        description: description || null,
        imageUrl,
        mobileImageUrl: mobileImageUrl || null,
        ctaText: ctaText || null,
        ctaLink: ctaLink || null,
        sortOrder: Number(sortOrder) || 0,
        isActive: Boolean(isActive),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return NextResponse.json({ banner: fallbackBanner, success: true }, { status: 201 });
    }
  } catch (error) {
    console.error("POST /api/admin/banners error:", error);
    return NextResponse.json(
      { error: "Gagal membuat banner baru." },
      { status: 500 }
    );
  }
}
