import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { INITIAL_PRODUCTS, type AdminProduct, type AdminProductVariant, slugify } from "@/lib/admin-data";
import crypto from "crypto";

function isValidUuid(id?: string | null): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

export async function GET() {
  try {
    const dbProducts = await prisma.product.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: {
        brand: true,
        category: true,
        productSeries: true,
        images: { orderBy: { sortOrder: "asc" } },
        variants: { where: { deletedAt: null } },
      },
    });

    if (dbProducts && dbProducts.length > 0) {
      const formatted: AdminProduct[] = dbProducts.map((p) => {
        const adminVariants: AdminProductVariant[] = p.variants.map((v) => ({
          id: v.id,
          sku: v.sku || `${p.sku}-${v.size}-${v.color}`.toUpperCase(),
          size: v.size,
          color: v.color,
          colorGroup: v.colorGroup,
          colorHex: v.colorHex,
          image: v.image,
          stock: v.stock,
          lowStockThreshold: v.lowStockThreshold,
        }));

        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          sku: p.sku,
          description: p.description,
          brandId: p.brandId,
          brandName: p.brand?.name ?? "it'smatapanda",
          categoryId: p.categoryId,
          categoryName: p.category?.name ?? "Sling & Crossbody",
          productSeriesId: p.productSeriesId || null,
          productSeriesName: p.productSeries?.name || undefined,
          dimensions: p.dimensions,
          weightGrams: p.weightGrams,
          capacityNote: p.capacityNote,
          price: Number(p.price),
          discountPrice: p.discountPrice ? Number(p.discountPrice) : null,
          stock: p.stock,
          lowStockThreshold: p.lowStockThreshold,
          isNewArrival: p.isNewArrival,
          isActive: p.isActive,
          images: p.images.length > 0 ? p.images.map((img) => img.url) : [],
          variants: adminVariants,
          createdAt: p.createdAt.toISOString().slice(0, 10),
        };
      });

      return NextResponse.json({ products: formatted, source: "database" });
    }
  } catch (err) {
    console.warn("[AdminProductsAPI] Could not fetch products from database, falling back:", err);
  }

  return NextResponse.json({ products: INITIAL_PRODUCTS, source: "defaults" });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      sku,
      description,
      brandId,
      categoryId,
      productSeriesId,
      dimensions,
      weightGrams = 250,
      capacityNote,
      price,
      discountPrice,
      stock = 0,
      lowStockThreshold = 5,
      isNewArrival = false,
      isActive = true,
      images = [],
      variants = [],
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Nama produk wajib diisi" }, { status: 400 });
    }

    if (!sku || !sku.trim()) {
      return NextResponse.json({ error: "SKU produk wajib diisi" }, { status: 400 });
    }

    if (!price || isNaN(Number(price))) {
      return NextResponse.json({ error: "Harga produk wajib diisi dengan angka valid" }, { status: 400 });
    }

    const cleanName = name.trim();
    const cleanSku = sku.trim().toUpperCase();
    const baseSlug = slugify(cleanName);
    const uniqueSlug = `${baseSlug}-${Math.floor(100 + Math.random() * 900)}`;

    try {
      // 1. Ensure a valid brand exists
      let validBrandId = brandId;
      if (!isValidUuid(validBrandId)) {
        const defaultBrand = await prisma.brand.findFirst({
          where: { isActive: true, deletedAt: null },
        });
        if (defaultBrand) {
          validBrandId = defaultBrand.id;
        } else {
          const createdBrand = await prisma.brand.create({
            data: {
              name: "it'smatapanda",
              slug: "itsmatapanda",
              logoUrl: "/matapanda-logo.png",
            },
          });
          validBrandId = createdBrand.id;
        }
      }

      // 2. Ensure a valid category exists
      let validCategoryId = categoryId;
      if (!isValidUuid(validCategoryId)) {
        const defaultCat = await prisma.category.findFirst({
          where: { isActive: true, deletedAt: null },
        });
        if (defaultCat) {
          validCategoryId = defaultCat.id;
        } else {
          const createdCat = await prisma.category.create({
            data: {
              name: "Sling & Crossbody",
              slug: "sling-crossbody",
            },
          });
          validCategoryId = createdCat.id;
        }
      }

      // 3. Check productSeriesId validity
      let validSeriesId: string | null = null;
      if (isValidUuid(productSeriesId)) {
        validSeriesId = productSeriesId;
      }

      // 4. Calculate total stock from variants if provided
      const totalStock = Array.isArray(variants) && variants.length > 0
        ? variants.reduce((sum: number, v: { stock?: number }) => sum + Number(v.stock || 0), 0)
        : Number(stock || 0);

      const productId = crypto.randomUUID();

      const createdProduct = await prisma.product.create({
        data: {
          id: productId,
          name: cleanName,
          slug: uniqueSlug,
          sku: cleanSku,
          description: description ? description.trim() : "",
          price: Number(price),
          discountPrice: discountPrice ? Number(discountPrice) : null,
          stock: totalStock,
          lowStockThreshold: Number(lowStockThreshold || 5),
          weightGrams: Number(weightGrams || 250),
          dimensions: dimensions || null,
          capacityNote: capacityNote || null,
          isNewArrival: Boolean(isNewArrival),
          isActive: Boolean(isActive),
          brandId: validBrandId,
          categoryId: validCategoryId,
          productSeriesId: validSeriesId,
          images: {
            create: Array.isArray(images)
              ? images.map((url: string, idx: number) => ({
                  url,
                  sortOrder: idx,
                  isPrimary: idx === 0,
                }))
              : [],
          },
          variants: {
            create: Array.isArray(variants)
              ? variants.map((v: AdminProductVariant) => ({
                  sku: v.sku || `${cleanSku}-${v.size}-${v.color}`.toUpperCase(),
                  size: v.size || "Standard",
                  color: v.color || "Default",
                  colorGroup: v.colorGroup || null,
                  colorHex: v.colorHex || null,
                  image: v.image || null,
                  stock: Number(v.stock || 0),
                  lowStockThreshold: Number(v.lowStockThreshold || 5),
                }))
              : [],
          },
        },
        include: {
          brand: true,
          category: true,
          images: { orderBy: { sortOrder: "asc" } },
          variants: true,
        },
      });

      return NextResponse.json({ product: createdProduct, success: true }, { status: 201 });
    } catch (dbErr) {
      console.error("[AdminProductsAPI] Prisma create error:", dbErr);
      return NextResponse.json(
        { error: "Gagal menyimpan produk ke database PostgreSQL", details: String(dbErr) },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[AdminProductsAPI] Error handling POST request:", error);
    return NextResponse.json({ error: "Permintaan tidak valid" }, { status: 500 });
  }
}
