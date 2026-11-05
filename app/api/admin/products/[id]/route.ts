import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugify, type AdminProductVariant } from "@/lib/admin-data";
import crypto from "crypto";

function isValidUuid(id?: string | null): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const product = await prisma.product.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        deletedAt: null,
      },
      include: {
        brand: true,
        category: true,
        productSeries: true,
        images: { orderBy: { sortOrder: "asc" } },
        variants: { where: { deletedAt: null } },
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Produk tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({
      product: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        sku: product.sku,
        description: product.description,
        brandId: product.brandId,
        brandName: product.brand?.name ?? "it'smatapanda",
        categoryId: product.categoryId,
        categoryName: product.category?.name ?? "Sling & Crossbody",
        productSeriesId: product.productSeriesId,
        productSeriesName: product.productSeries?.name,
        dimensions: product.dimensions,
        weightGrams: product.weightGrams,
        capacityNote: product.capacityNote,
        price: Number(product.price),
        discountPrice: product.discountPrice ? Number(product.discountPrice) : null,
        stock: product.stock,
        lowStockThreshold: product.lowStockThreshold,
        isNewArrival: product.isNewArrival,
        isActive: product.isActive,
        images: product.images.map((img) => img.url),
        variants: product.variants.map((v) => ({
          id: v.id,
          sku: v.sku || `${product.sku}-${v.size}-${v.color}`.toUpperCase(),
          size: v.size,
          color: v.color,
          colorGroup: v.colorGroup,
          colorHex: v.colorHex,
          image: v.image,
          stock: v.stock,
          lowStockThreshold: v.lowStockThreshold,
        })),
        createdAt: product.createdAt.toISOString().slice(0, 10),
      },
    });
  } catch (error) {
    console.error("[AdminProductsAPI] Error fetching single product:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const {
      name,
      sku,
      description,
      brandId,
      categoryId,
      productSeriesId,
      dimensions,
      weightGrams,
      capacityNote,
      price,
      discountPrice,
      stock,
      lowStockThreshold,
      isNewArrival,
      isActive,
      images,
      variants,
    } = body;

    // Check if product exists in DB
    const existing = await prisma.product.findUnique({
      where: { id },
      include: { variants: true, images: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Produk tidak ditemukan di database" },
        { status: 404 }
      );
    }

    // Validate brandId
    let validBrandId = existing.brandId;
    if (brandId && isValidUuid(brandId)) {
      const brandExists = await prisma.brand.findUnique({ where: { id: brandId } });
      if (brandExists) validBrandId = brandId;
    }

    // Validate categoryId
    let validCategoryId = existing.categoryId;
    if (categoryId && isValidUuid(categoryId)) {
      const catExists = await prisma.category.findUnique({ where: { id: categoryId } });
      if (catExists) validCategoryId = categoryId;
    }

    // Validate productSeriesId (left unchanged when the field is not sent)
    let validSeriesId: string | null = productSeriesId === undefined ? existing.productSeriesId : null;
    if (productSeriesId && isValidUuid(productSeriesId)) {
      const seriesExists = await prisma.productSeries.findUnique({
        where: { id: productSeriesId },
      });
      if (seriesExists) validSeriesId = productSeriesId;
    }

    const cleanName = name ? name.trim() : existing.name;
    const cleanSku = sku ? sku.trim().toUpperCase() : existing.sku;
    let cleanSlug = existing.slug;
    if (name && name.trim() !== existing.name) {
      const base = slugify(cleanName) || `produk-${id.slice(0, 8)}`;
      const taken = await prisma.product.findFirst({ where: { slug: base, NOT: { id } }, select: { id: true } });
      cleanSlug = taken ? `${base}-${id.slice(0, 6)}` : base;
    }

    // Calculate total stock from variants if variants provided
    const totalStock = Array.isArray(variants) && variants.length > 0
      ? variants.reduce((sum: number, v: { stock?: number }) => sum + Number(v.stock || 0), 0)
      : stock !== undefined ? Number(stock) : existing.stock;

    await prisma.$transaction(async (tx) => {
    // 1. Update product scalar fields
    await tx.product.update({
      where: { id },
      data: {
        name: cleanName,
        slug: cleanSlug,
        sku: cleanSku,
        description: description !== undefined ? description.trim() : existing.description,
        price: price !== undefined ? Number(price) : existing.price,
        discountPrice: discountPrice !== undefined ? (discountPrice ? Number(discountPrice) : null) : existing.discountPrice,
        stock: totalStock,
        lowStockThreshold: lowStockThreshold !== undefined ? Number(lowStockThreshold) : existing.lowStockThreshold,
        weightGrams: weightGrams !== undefined ? Number(weightGrams) : existing.weightGrams,
        dimensions: dimensions !== undefined ? dimensions : existing.dimensions,
        capacityNote: capacityNote !== undefined ? capacityNote : existing.capacityNote,
        isNewArrival: isNewArrival !== undefined ? Boolean(isNewArrival) : existing.isNewArrival,
        isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
        brandId: validBrandId,
        categoryId: validCategoryId,
        productSeriesId: validSeriesId,
      },
    });

    // 2. Update images if provided
    if (Array.isArray(images)) {
      // Remove previous images and re-add in order
      await tx.productImage.deleteMany({
        where: { productId: id },
      });

      if (images.length > 0) {
        await tx.productImage.createMany({
          data: images.map((url: string, idx: number) => ({
            id: crypto.randomUUID(),
            productId: id,
            url,
            sortOrder: idx,
            isPrimary: idx === 0,
          })),
        });
      }
    }

    // 3. Update variants in place (keeps ids, so marketplace mappings, carts and
    //    order items stay linked); variants removed in the form are soft-deleted.
    if (Array.isArray(variants) && variants.length > 0) {
      const current = await tx.productVariant.findMany({
        where: { productId: id, deletedAt: null },
        select: { id: true },
      });
      const currentIds = new Set(current.map((v) => v.id));
      const keptIds = new Set<string>();

      for (const v of variants as AdminProductVariant[]) {
        const data = {
          sku: v.sku || `${cleanSku}-${v.size}-${v.color}`.toUpperCase(),
          size: v.size || "Standard",
          color: v.color || "Default",
          colorGroup: v.colorGroup || null,
          colorHex: v.colorHex || null,
          image: v.image || null,
          stock: Number(v.stock || 0),
          lowStockThreshold: Number(v.lowStockThreshold || 5),
        };
        if (isValidUuid(v.id) && currentIds.has(v.id)) {
          await tx.productVariant.update({ where: { id: v.id }, data });
          keptIds.add(v.id);
        } else {
          const created = await tx.productVariant.create({
            data: { id: crypto.randomUUID(), productId: id, ...data },
            select: { id: true },
          });
          keptIds.add(created.id);
        }
      }

      const removed = Array.from(currentIds).filter((vid) => !keptIds.has(vid));
      if (removed.length > 0) {
        await tx.productVariant.updateMany({
          where: { id: { in: removed } },
          data: { deletedAt: new Date() },
        });
      }
    }
    });

    // Fetch refreshed product with relations
    const refreshed = await prisma.product.findUnique({
      where: { id },
      include: {
        brand: true,
        category: true,
        productSeries: true,
        images: { orderBy: { sortOrder: "asc" } },
        variants: { where: { deletedAt: null } },
      },
    });

    return NextResponse.json({ product: refreshed, success: true });
  } catch (error) {
    console.error("[AdminProductsAPI] Error updating product:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui produk di database", details: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Check if product exists
    const existing = await prisma.product.findUnique({ where: { id } });

    if (!existing) {
      // Return success if already gone
      return NextResponse.json({ success: true, message: "Produk tidak ada di database" });
    }

    // Soft delete to protect order history integrity
    await prisma.product.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    // Also soft-delete variants
    await prisma.productVariant.updateMany({
      where: { productId: id },
      data: {
        deletedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[AdminProductsAPI] Error deleting product:", error);
    return NextResponse.json(
      { error: "Gagal menghapus produk", details: String(error) },
      { status: 500 }
    );
  }
}
