import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/admin-data";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
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
      const updated = await prisma.productSeries.update({
        where: { id: params.id },
        data: {
          name: cleanName,
          slug: cleanSlug,
        },
      });

      return NextResponse.json({
        success: true,
        series: updated,
      });
    } catch {
      return NextResponse.json(
        { error: "Series tidak ditemukan di database" },
        { status: 404 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    try {
      // Disassociate products from this series first
      await prisma.product.updateMany({
        where: { productSeriesId: params.id },
        data: { productSeriesId: null },
      });

      await prisma.productSeries.delete({
        where: { id: params.id },
      });

      return NextResponse.json({ success: true });
    } catch (dbErr) {
      console.warn("DB delete series error:", dbErr);
      return NextResponse.json({ success: true, localOnly: true });
    }
  } catch {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
