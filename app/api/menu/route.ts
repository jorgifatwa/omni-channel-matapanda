import { NextResponse } from "next/server";
import { getActiveBrands, getActiveCategories, isNonBagCategory } from "@/lib/data-fetcher";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Proactively deactivate legacy clothing categories in DB if present
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
      // Ignore if DB connection not reachable
    }

    const [brands, categories] = await Promise.all([
      getActiveBrands(),
      getActiveCategories(),
    ]);

    const bagOnlyCategories = categories.filter((c) => !isNonBagCategory(c.slug, c.name));

    return NextResponse.json({
      brands,
      categories: bagOnlyCategories,
    });
  } catch (error) {
    console.error("Failed to fetch menu items:", error);
    return NextResponse.json(
      { error: "Failed to fetch menu items" },
      { status: 500 }
    );
  }
}
