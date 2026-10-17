import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { INITIAL_CATEGORIES, type AdminCategory, slugify } from "@/lib/admin-data";
import crypto from "crypto";

function isValidUuid(id?: string | null): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

const NON_BAG_PATTERNS = [
  "apparel",
  "t-shirt",
  "tshirt",
  "outerwear",
  "outer",
  "headwear",
  "caps-hats",
  "clothing",
  "baju",
  "kaos",
];

function isNonBagCategory(slug: string, name?: string): boolean {
  const s = (slug || "").toLowerCase();
  const n = (name || "").toLowerCase();
  return NON_BAG_PATTERNS.some((p) => s.includes(p) || n.includes(p));
}

export async function GET() {
  try {
    try {
      await prisma.category.updateMany({
        where: {
          OR: [
            { slug: { in: ["apparel", "t-shirts", "outerwear-jackets", "headwear", "caps-hats"] } },
            { name: { in: ["Apparel", "T-Shirts", "Outerwear & Jackets", "Headwear", "Caps & Hats"] } },
          ],
          isActive: true,
        },
        data: {
          isActive: false,
          deletedAt: new Date(),
        },
      });
    } catch {
      // Ignore if DB is not reachable
    }

    const dbCategories = await prisma.category.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      include: {
        parent: true,
        _count: {
          select: { products: { where: { deletedAt: null } } },
        },
      },
    });

    const bagCategories = dbCategories ? dbCategories.filter((c) => !isNonBagCategory(c.slug, c.name)) : [];

    if (bagCategories.length > 0) {
      const formatted: AdminCategory[] = bagCategories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        parentId: c.parentId,
        parentName: c.parent?.name ?? null,
        productCount: c._count.products,
        isActive: c.isActive,
        createdAt: c.createdAt.toISOString().slice(0, 10),
      }));

      return NextResponse.json({ categories: formatted, source: "database" });
    }
  } catch (err) {
    console.warn("[AdminCategoriesAPI] Failed to fetch categories from database:", err);
  }

  return NextResponse.json({ categories: INITIAL_CATEGORIES, source: "defaults" });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, slug, parentId, isActive = true } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Nama kategori wajib diisi" }, { status: 400 });
    }

    const cleanName = name.trim();
    const cleanSlug = slug && typeof slug === "string" && slug.trim()
      ? slugify(slug.trim())
      : slugify(cleanName);

    let validParentId: string | null = null;
    if (isValidUuid(parentId)) {
      const parent = await prisma.category.findUnique({ where: { id: parentId } });
      if (parent) validParentId = parentId;
    }

    const categoryId = crypto.randomUUID();

    try {
      const created = await prisma.category.create({
        data: {
          id: categoryId,
          name: cleanName,
          slug: cleanSlug,
          parentId: validParentId,
          isActive: Boolean(isActive),
        },
        include: {
          parent: true,
        },
      });

      return NextResponse.json(
        {
          success: true,
          category: {
            id: created.id,
            name: created.name,
            slug: created.slug,
            parentId: created.parentId,
            parentName: created.parent?.name ?? null,
            productCount: 0,
            isActive: created.isActive,
            createdAt: created.createdAt.toISOString().slice(0, 10),
          },
        },
        { status: 201 }
      );
    } catch (dbErr) {
      console.error("[AdminCategoriesAPI] Database error creating category:", dbErr);
      return NextResponse.json(
        { error: "Gagal menyimpan kategori ke database", details: String(dbErr) },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("[AdminCategoriesAPI] Error handling POST request:", err);
    return NextResponse.json({ error: "Permintaan tidak valid" }, { status: 400 });
  }
}
