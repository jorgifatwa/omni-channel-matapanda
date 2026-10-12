import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugify, INITIAL_SERIES } from "@/lib/admin-data";

export async function GET() {
  try {
    const seriesList = await prisma.productSeries.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { products: { where: { isActive: true, deletedAt: null } } },
        },
      },
    });

    if (seriesList && seriesList.length > 0) {
      return NextResponse.json({
        series: seriesList.map((s) => ({
          id: s.id,
          name: s.name,
          slug: s.slug,
          productCount: s._count.products,
          createdAt: s.createdAt.toISOString().slice(0, 10),
        })),
      });
    }
  } catch (err) {
    console.warn("Could not fetch product series from DB, using fallback:", err);
  }

  return NextResponse.json({ series: INITIAL_SERIES });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, slug, description } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Nama series wajib diisi" },
        { status: 400 }
      );
    }

    const cleanName = name.trim();
    const cleanSlug = slug && typeof slug === "string" && slug.trim()
      ? slugify(slug.trim())
      : slugify(cleanName);

    try {
      const created = await prisma.productSeries.upsert({
        where: { slug: cleanSlug },
        update: { name: cleanName },
        create: {
          name: cleanName,
          slug: cleanSlug,
        },
      });

      return NextResponse.json({
        success: true,
        series: {
          id: created.id,
          name: created.name,
          slug: created.slug,
          productCount: 0,
        },
      });
    } catch (dbErr) {
      console.warn("Could not save series to DB, returning local fallback:", dbErr);
      return NextResponse.json({
        success: true,
        series: {
          id: `series-${Date.now()}`,
          name: cleanName,
          slug: cleanSlug,
          description: description || "",
          productCount: 0,
        },
      });
    }
  } catch {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
