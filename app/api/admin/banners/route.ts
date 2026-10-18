import { NextResponse } from "next/server";
import {
  getAllBannersStore,
  saveBannerStore,
  type BannerType,
} from "@/lib/banner-store.server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") as BannerType | null;

  try {
    const { banners, source } = await getAllBannersStore(type || undefined);
    return NextResponse.json({ banners, source });
  } catch (error) {
    console.error("GET /api/admin/banners error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data banner." },
      { status: 500 }
    );
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

    const banner = await saveBannerStore({
      type,
      title: title.trim(),
      subtitle: subtitle?.trim() || null,
      description: description?.trim() || null,
      imageUrl: imageUrl.trim(),
      mobileImageUrl: mobileImageUrl?.trim() || null,
      ctaText: ctaText?.trim() || null,
      ctaLink: ctaLink?.trim() || null,
      sortOrder: Number(sortOrder) || 0,
      isActive: Boolean(isActive),
    });

    return NextResponse.json({ banner, success: true }, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/banners error:", error);
    return NextResponse.json(
      { error: "Gagal membuat banner baru." },
      { status: 500 }
    );
  }
}
