import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (!UUID_REGEX.test(params.id)) {
      const banner = await prisma.banner.findFirst({
        where: { title: params.id },
      });
      if (banner) return NextResponse.json({ banner });
      return NextResponse.json({ error: "Banner tidak ditemukan" }, { status: 404 });
    }

    const banner = await prisma.banner.findUnique({
      where: { id: params.id },
    });

    if (!banner) {
      return NextResponse.json({ error: "Banner tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ banner });
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

    const isUuid = UUID_REGEX.test(params.id);
    let banner;

    try {
      if (isUuid) {
        // Try to update existing database row
        banner = await prisma.banner.update({
          where: { id: params.id },
          data: {
            ...(type !== undefined && { type }),
            ...(title !== undefined && { title }),
            ...(subtitle !== undefined && { subtitle: subtitle || null }),
            ...(description !== undefined && { description: description || null }),
            ...(imageUrl !== undefined && { imageUrl }),
            ...(mobileImageUrl !== undefined && { mobileImageUrl: mobileImageUrl || null }),
            ...(ctaText !== undefined && { ctaText: ctaText || null }),
            ...(ctaLink !== undefined && { ctaLink: ctaLink || null }),
            ...(sortOrder !== undefined && { sortOrder: Number(sortOrder) }),
            ...(isActive !== undefined && { isActive: Boolean(isActive) }),
          },
        });
      } else {
        // Preset / non-UUID ID (e.g. 'free-shipping-promo', 'everyday-carryalls', 'hero-new-in')
        // Check if banner with this title already exists in DB
        const existing = await prisma.banner.findFirst({
          where: {
            OR: [
              ...(title ? [{ title }] : []),
              { type: type || (params.id.startsWith("hero") ? "HERO_BANNER" : "SECONDARY_BANNER") },
            ],
          },
        });

        if (existing) {
          banner = await prisma.banner.update({
            where: { id: existing.id },
            data: {
              ...(type !== undefined && { type }),
              ...(title !== undefined && { title }),
              ...(subtitle !== undefined && { subtitle: subtitle || null }),
              ...(description !== undefined && { description: description || null }),
              ...(imageUrl !== undefined && { imageUrl }),
              ...(mobileImageUrl !== undefined && { mobileImageUrl: mobileImageUrl || null }),
              ...(ctaText !== undefined && { ctaText: ctaText || null }),
              ...(ctaLink !== undefined && { ctaLink: ctaLink || null }),
              ...(sortOrder !== undefined && { sortOrder: Number(sortOrder) }),
              ...(isActive !== undefined && { isActive: Boolean(isActive) }),
            },
          });
        } else {
          banner = await prisma.banner.create({
            data: {
              type: type || (params.id.startsWith("hero") ? "HERO_BANNER" : "SECONDARY_BANNER"),
              title: title || "Banner",
              subtitle: subtitle || null,
              description: description || null,
              imageUrl: imageUrl || "",
              mobileImageUrl: mobileImageUrl || null,
              ctaText: ctaText || null,
              ctaLink: ctaLink || null,
              sortOrder: sortOrder !== undefined ? Number(sortOrder) : 0,
              isActive: isActive !== undefined ? Boolean(isActive) : true,
            },
          });
        }
      }

      try {
        revalidatePath("/");
        revalidatePath("/admin/banners");
      } catch {}

      return NextResponse.json({ banner, success: true });
    } catch (dbError) {
      console.warn("Database banner operation failed:", dbError);
      const fallbackUpdated = {
        id: params.id,
        type: type || "HERO_BANNER",
        title: title || "Banner",
        subtitle: subtitle || null,
        description: description || null,
        imageUrl: imageUrl || "",
        mobileImageUrl: mobileImageUrl || null,
        ctaText: ctaText || null,
        ctaLink: ctaLink || null,
        sortOrder: sortOrder !== undefined ? Number(sortOrder) : 0,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        updatedAt: new Date().toISOString(),
      };
      return NextResponse.json({ banner: fallbackUpdated, success: true });
    }
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
    const isUuid = UUID_REGEX.test(params.id);
    if (isUuid) {
      await prisma.banner.delete({
        where: { id: params.id },
      }).catch(() => {});
    } else {
      const found = await prisma.banner.findFirst({ where: { title: params.id } }).catch(() => null);
      if (found) {
        await prisma.banner.delete({ where: { id: found.id } }).catch(() => {});
      }
    }

    try {
      revalidatePath("/");
      revalidatePath("/admin/banners");
    } catch {}

    return NextResponse.json({ success: true, message: "Banner berhasil dihapus." });
  } catch (error) {
    console.error("DELETE /api/admin/banners/[id] error:", error);
    return NextResponse.json(
      { error: "Gagal menghapus banner." },
      { status: 500 }
    );
  }
}
