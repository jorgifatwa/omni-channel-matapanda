import { NextResponse } from "next/server";
import {
  getBannerByIdStore,
  updateBannerStore,
  deleteBannerStore,
  type BannerType,
} from "@/lib/banner-store.server";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const banner = await getBannerByIdStore(params.id);
    if (!banner) {
      return NextResponse.json({ error: "Banner tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ banner });
  } catch (error) {
    console.error("GET /api/admin/banners/[id] error:", error);
    return NextResponse.json(
      { error: "Gagal memuat data banner dari database." },
      { status: 503 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  let body: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Format data tidak valid." }, { status: 400 });
  }

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

  try {
    // Preserve existing values for fields not sent (e.g. toggle / reorder)
    const existing = await getBannerByIdStore(params.id);
    if (!existing) {
      return NextResponse.json({ error: "Banner tidak ditemukan" }, { status: 404 });
    }

    const nextTitle = title !== undefined ? String(title).trim() : existing.title;
    const nextImageUrl = imageUrl !== undefined ? String(imageUrl).trim() : existing.imageUrl;
    if (!nextTitle || !nextImageUrl) {
      return NextResponse.json(
        { error: "Judul dan Gambar Banner wajib diisi." },
        { status: 400 }
      );
    }

    const banner = await updateBannerStore(params.id, {
      type: (type || existing.type) as BannerType,
      title: nextTitle,
      subtitle: subtitle !== undefined ? (subtitle?.trim() || null) : existing.subtitle,
      description: description !== undefined ? (description?.trim() || null) : existing.description,
      imageUrl: nextImageUrl,
      mobileImageUrl: mobileImageUrl !== undefined ? (mobileImageUrl?.trim() || null) : existing.mobileImageUrl,
      ctaText: ctaText !== undefined ? (ctaText?.trim() || null) : existing.ctaText,
      ctaLink: ctaLink !== undefined ? (ctaLink?.trim() || null) : existing.ctaLink,
      sortOrder: sortOrder !== undefined ? Number(sortOrder) : existing.sortOrder,
      isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
    });

    if (!banner) {
      return NextResponse.json({ error: "Banner tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ banner, success: true });
  } catch (error) {
    console.error("PUT /api/admin/banners/[id] error:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui banner di database." },
      { status: 503 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const deleted = await deleteBannerStore(params.id);
    if (!deleted) {
      return NextResponse.json({ error: "Banner tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: "Banner berhasil dihapus." });
  } catch (error) {
    console.error("DELETE /api/admin/banners/[id] error:", error);
    return NextResponse.json(
      { error: "Gagal menghapus banner dari database." },
      { status: 503 }
    );
  }
}
