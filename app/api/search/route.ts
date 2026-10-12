import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { INITIAL_PRODUCTS } from "@/lib/admin-data";
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
        price: Number(p.price),
        discountPrice: p.discountPrice ? Number(p.discountPrice) : null,
        image: p.images[0]?.url || "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=600&q=80",
        categoryName: p.category?.name || "Apparel",
      }));
      return NextResponse.json({ products: applyDiscountsToProducts(formatted, getActiveDiscounts()) });
    }
  } catch {
    // DB offline, fall through to INITIAL_PRODUCTS
  }

  const fallbackMatches = INITIAL_PRODUCTS.filter(
    (p) =>
      p.isActive &&
      (p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.categoryName.toLowerCase().includes(q) ||
        p.brandName.toLowerCase().includes(q))
  ).slice(0, 8);

  const formatted = fallbackMatches.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    sku: p.sku,
    price: p.price,
    discountPrice: p.discountPrice,
    image: p.images[0] || "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=600&q=80",
    categoryName: p.categoryName,
  }));

  return NextResponse.json({ products: applyDiscountsToProducts(formatted, getActiveDiscounts()) });
}
