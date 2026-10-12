import { NextResponse } from "next/server";
import { getActiveBrands, getActiveCategories } from "@/lib/data-fetcher";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [brands, categories] = await Promise.all([
      getActiveBrands(),
      getActiveCategories(),
    ]);

    return NextResponse.json({
      brands,
      categories,
    });
  } catch (error) {
    console.error("Failed to fetch menu items:", error);
    return NextResponse.json(
      { error: "Failed to fetch menu items" },
      { status: 500 }
    );
  }
}
