import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/admin-data";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { name, slug, logoUrl, isActive } = body;

    const existing = await prisma.brand.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Brand tidak ditemukan" }, { status: 404 });
    }

    const cleanName = name !== undefined ? name.trim() : existing.name;
    const cleanSlug = slug !== undefined ? slugify(slug.trim()) : existing.slug;

    const updated = await prisma.brand.update({
      where: { id },
      data: {
        name: cleanName,
        slug: cleanSlug,
        logoUrl: logoUrl !== undefined ? logoUrl : existing.logoUrl,
        isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
      },
    });

    return NextResponse.json({
      success: true,
      brand: {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        logoUrl: updated.logoUrl || "",
        isActive: updated.isActive,
        createdAt: updated.createdAt.toISOString().slice(0, 10),
      },
    });
  } catch (error) {
    console.error("[AdminBrandsAPI] Error updating brand:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui brand", details: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const existing = await prisma.brand.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });

    if (!existing) {
      return NextResponse.json({ success: true, message: "Brand sudah tidak ada" });
    }

    if (existing._count.products > 0) {
      await prisma.brand.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          isActive: false,
        },
      });
    } else {
      await prisma.brand.delete({ where: { id } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[AdminBrandsAPI] Error deleting brand:", error);
    return NextResponse.json(
      { error: "Gagal menghapus brand", details: String(error) },
      { status: 500 }
    );
  }
}
