import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/admin-data";

function isValidUuid(id?: string | null): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { name, slug, parentId, isActive } = body;

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Kategori tidak ditemukan" }, { status: 404 });
    }

    const cleanName = name !== undefined ? name.trim() : existing.name;
    const cleanSlug = slug !== undefined ? slugify(slug.trim()) : existing.slug;

    let validParentId: string | null = existing.parentId;
    if (parentId !== undefined) {
      if (isValidUuid(parentId) && parentId !== id) {
        const parent = await prisma.category.findUnique({ where: { id: parentId } });
        validParentId = parent ? parentId : null;
      } else {
        validParentId = null;
      }
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        name: cleanName,
        slug: cleanSlug,
        parentId: validParentId,
        isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
      },
      include: {
        parent: true,
      },
    });

    return NextResponse.json({
      success: true,
      category: {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        parentId: updated.parentId,
        parentName: updated.parent?.name ?? null,
        isActive: updated.isActive,
        createdAt: updated.createdAt.toISOString().slice(0, 10),
      },
    });
  } catch (error) {
    console.error("[AdminCategoriesAPI] Error updating category:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui kategori", details: String(error) },
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

    const existing = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true, children: true } } },
    });

    if (!existing) {
      return NextResponse.json({ success: true, message: "Kategori sudah tidak ada" });
    }

    // If category has products, soft delete so we don't break product foreign keys
    if (existing._count.products > 0 || existing._count.children > 0) {
      await prisma.category.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          isActive: false,
        },
      });
    } else {
      await prisma.category.delete({ where: { id } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[AdminCategoriesAPI] Error deleting category:", error);
    return NextResponse.json(
      { error: "Gagal menghapus kategori", details: String(error) },
      { status: 500 }
    );
  }
}
