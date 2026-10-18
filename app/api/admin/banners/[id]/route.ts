import { NextResponse } from "next/server";
import {
  saveBannerStore,
  deleteBannerStore,
  readBannersFromFile,
  type BannerType,
} from "@/lib/banner-store.server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Try DB
    if (UUID_REGEX.test(params.id)) {
      try {
        const banner = await prisma.banner.findUnique({
          where: { id: params.id },
        });
        if (banner) return NextResponse.json({ banner });
      } catch {}
    }

    // 2. Try file store
    const fileBanners = readBannersFromFile();
    const banner = fileBanners.find((b) => b.id === params.id || b.title === params.id);
    if (banner) return NextResponse.json({ banner });

    return NextResponse.json({ error: "Banner tidak ditemukan" }, { status: 404 });
  } catch (error) {
    console.error("GET /api/admin/banners/[id] error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data banner." },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const {
      type,
      title,
      subtitle,
      description,
      imageUrl,
      mobileImageUrl,
      ctaText,
      ctaLink,
      sortOrder,
      isActive,
    } = body;

    // Get current item to preserve existing values if not specified
    const fileBanners = readBannersFromFile();
    const existing = fileBanners.find((b) => b.id === params.id || b.title === params.id);

    const banner = await saveBannerStore({
      id: existing?.id || params.id,
      type: (type || existing?.type || "HERO_BANNER") as BannerType,
      title: title !== undefined ? title.trim() : (existing?.title || "Banner"),
      subtitle: subtitle !== undefined ? (subtitle?.trim() || null) : existing?.subtitle,
      description: description !== undefined ? (description?.trim() || null) : existing?.description,
      imageUrl: imageUrl !== undefined ? imageUrl.trim() : (existing?.imageUrl || ""),
      mobileImageUrl: mobileImageUrl !== undefined ? (mobileImageUrl?.trim() || null) : existing?.mobileImageUrl,
      ctaText: ctaText !== undefined ? (ctaText?.trim() || null) : existing?.ctaText,
      ctaLink: ctaLink !== undefined ? (ctaLink?.trim() || null) : existing?.ctaLink,
      sortOrder: sortOrder !== undefined ? Number(sortOrder) : (existing?.sortOrder || 0),
      isActive: isActive !== undefined ? Boolean(isActive) : (existing?.isActive ?? true),
    });

    return NextResponse.json({ banner, success: true });
  } catch (error) {
    console.error("PUT /api/admin/banners/[id] error:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui banner." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await deleteBannerStore(params.id);
    return NextResponse.json({ success: true, message: "Banner berhasil dihapus." });
  } catch (error) {
    console.error("DELETE /api/admin/banners/[id] error:", error);
    return NextResponse.json(
      { error: "Gagal menghapus banner." },
      { status: 500 }
    );
  }
}
