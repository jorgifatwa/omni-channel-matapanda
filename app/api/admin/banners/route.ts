import { NextResponse } from "next/server";
import {
  getAllBannersStore,
  createBannerStore,
  type BannerType,
} from "@/lib/banner-store.server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") as BannerType | null;

  try {
    const banners = await getAllBannersStore(type || undefined);
    return NextResponse.json({ banners, source: "database" });
  } catch (error) {
    console.error("GET /api/admin/banners error:", error);
    return NextResponse.json(
      { banners: [], error: "Gagal memuat data banner dari database." },
      { status: 503 }
    );
  }
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Format data tidak valid." }, { status: 400 });
  }

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
  } = body as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

  if (!title || !imageUrl) {
    return NextResponse.json(
      { error: "Judul dan Gambar Banner wajib diisi." },
      { status: 400 }
    );
  }

  try {
    const banner = await createBannerStore({
      type: type as BannerType,
      title: String(title).trim(),
      subtitle: subtitle?.trim() || null,
      description: description?.trim() || null,
      imageUrl: String(imageUrl).trim(),
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
      { error: "Gagal menyimpan banner baru ke database." },
      { status: 503 }
    );
  }
}
