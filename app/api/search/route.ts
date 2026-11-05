import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { applyDiscountsToProducts } from "@/lib/discount-engine";
import { getActiveDiscounts } from "@/lib/discount-store";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim().toLowerCase() || "";

  if (!q) {
    return NextResponse.json({ products: [] });
  }

  try {
    const dbProducts = await prisma.product.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { sku: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { category: { name: { contains: q, mode: "insensitive" } } },
          { brand: { name: { contains: q, mode: "insensitive" } } },
        ],
      },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        category: true,
        brand: true,
      },
      take: 8,
    });

    if (dbProducts && dbProducts.length > 0) {
      const formatted = dbProducts.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        categoryId: p.categoryId,
        price: Number(p.price),
        discountPrice: p.discountPrice ? Number(p.discountPrice) : null,
        image: p.images[0]?.url || "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=600&q=80",
        categoryName: p.category?.name || "Apparel",
      }));
      let campaigns: Awaited<ReturnType<typeof getActiveDiscounts>> = [];
      try {
        campaigns = await getActiveDiscounts();
      } catch (discountErr) {
        console.error("[Search] Failed to load discount campaigns:", discountErr);
      }
      return NextResponse.json({ products: applyDiscountsToProducts(formatted, campaigns) });
    }
  } catch (err) {
    console.error("[Search] Database query failed:", err);
  }

  return NextResponse.json({ products: [] });
}
