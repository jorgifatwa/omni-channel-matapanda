import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { INITIAL_BRANDS, type AdminBrand, slugify } from "@/lib/admin-data";
import crypto from "crypto";

export async function GET() {
  try {
    const dbBrands = await prisma.brand.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { products: { where: { deletedAt: null } } },
        },
      },
    });

    if (dbBrands && dbBrands.length > 0) {
      const formatted: AdminBrand[] = dbBrands.map((b) => ({
        id: b.id,
        name: b.name,
        slug: b.slug,
        logoUrl: b.logoUrl || "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=200&q=80",
        productCount: b._count.products,
        isActive: b.isActive,
        createdAt: b.createdAt.toISOString().slice(0, 10),
      }));

      return NextResponse.json({ brands: formatted, source: "database" });
    }
  } catch (err) {
    console.warn("[AdminBrandsAPI] Failed to fetch brands from database:", err);
  }

  return NextResponse.json({ brands: INITIAL_BRANDS, source: "defaults" });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, slug, logoUrl, isActive = true } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Nama brand wajib diisi" }, { status: 400 });
    }

    const cleanName = name.trim();
    const cleanSlug = slug && typeof slug === "string" && slug.trim()
      ? slugify(slug.trim())
      : slugify(cleanName);

    const brandId = crypto.randomUUID();

    try {
      const created = await prisma.brand.create({
        data: {
          id: brandId,
          name: cleanName,
          slug: cleanSlug,
          logoUrl: logoUrl || null,
          isActive: Boolean(isActive),
        },
      });

      return NextResponse.json(
        {
          success: true,
          brand: {
            id: created.id,
            name: created.name,
            slug: created.slug,
            logoUrl: created.logoUrl || "",
            productCount: 0,
            isActive: created.isActive,
            createdAt: created.createdAt.toISOString().slice(0, 10),
          },
        },
        { status: 201 }
      );
    } catch (dbErr) {
      console.error("[AdminBrandsAPI] Database error creating brand:", dbErr);
      return NextResponse.json(
        { error: "Gagal menyimpan brand ke database", details: String(dbErr) },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("[AdminBrandsAPI] Error handling POST request:", err);
    return NextResponse.json({ error: "Permintaan tidak valid" }, { status: 400 });
  }
}
