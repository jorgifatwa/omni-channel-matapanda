import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/admin-data";

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
    console.error("Could not fetch product series from DB:", err);
    return NextResponse.json(
      { series: [], error: "Gagal memuat series dari database" },
      { status: 503 }
    );
  }

  // Database reachable but empty
  return NextResponse.json({ series: [] });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, slug } = body;

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
      // Create only: an upsert silently renamed an existing series that
      // happened to share the slug.
      const existing = await prisma.productSeries.findUnique({ where: { slug: cleanSlug } });
      if (existing) {
        return NextResponse.json(
          { error: `Slug "${cleanSlug}" sudah dipakai series "${existing.name}". Gunakan slug lain.` },
          { status: 409 }
        );
      }
      const created = await prisma.productSeries.create({
        data: {
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
      console.error("Could not save series to DB:", dbErr);
      return NextResponse.json(
        { error: "Gagal menyimpan series ke database" },
        { status: 500 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
