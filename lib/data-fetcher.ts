import { prisma } from "@/lib/prisma";
import { INITIAL_BRANDS, INITIAL_CATEGORIES, INITIAL_PRODUCTS } from "@/lib/admin-data";
import {
  applyDiscountsToProducts as applyDiscountsPure,
  applyDiscountToSingleProduct as applyDiscountSinglePure,
  type ResolvedDiscount,
} from "@/lib/discount-engine";
import { getActiveDiscounts } from "@/lib/discount-store";

function applyDiscountsToProducts<
  T extends {
    id: string;
    price: number | string;
    discountPrice?: number | string | null;
    categoryId?: string | null;
    category?: { id: string } | null;
  }
>(products: T[]) {
  return applyDiscountsPure(products, getActiveDiscounts());
}

function applyDiscountToSingleProduct<
  T extends {
    id: string;
    price: number | string;
    discountPrice?: number | string | null;
    categoryId?: string | null;
    category?: { id: string } | null;
  }
>(product: T) {
  return applyDiscountSinglePure(product, getActiveDiscounts());
}

export type StorefrontBrand = {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  productCount?: number;
};

export type StorefrontCategory = {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  parentName?: string | null;
  children?: StorefrontCategory[];
  productCount?: number;
};

export type StorefrontVariant = {
  id: string;
  sku?: string | null;
  size: string;
  color: string;
  colorGroup?: string | null;
  colorHex?: string | null;
  image?: string | null;
  stock: number;
  lowStockThreshold: number;
};

export type StorefrontProductSeries = {
  id: string;
  name: string;
  slug: string;
};

export type StorefrontSeriesItem = {
  id: string;
  name: string;
  slug: string;
  price: number;
  discountPrice?: number | null;
  dimensions?: string | null;
  weightGrams?: number | null;
  capacityNote?: string | null;
  image: string;
  isCurrent: boolean;
};

export type StorefrontProduct = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description: string;
  price: number;
  discountPrice?: number | null;
  stock: number;
  lowStockThreshold: number;
  dimensions?: string | null;
  weightGrams?: number | null;
  capacityNote?: string | null;
  productSeriesId?: string | null;
  productSeries?: StorefrontProductSeries | null;
  seriesProducts?: StorefrontSeriesItem[];
  isNewArrival: boolean;
  isActive: boolean;
  brand: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string | null;
  };
  category: {
    id: string;
    name: string;
    slug: string;
  };
  images: {
    id: string;
    url: string;
    isPrimary: boolean;
    sortOrder: number;
  }[];
  variants: StorefrontVariant[];
  discount?: ResolvedDiscount;
};

export async function getActiveBrands(): Promise<StorefrontBrand[]> {
  try {
    const brands = await prisma.brand.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { products: { where: { isActive: true, deletedAt: null } } },
        },
      },
    });

    if (brands && brands.length > 0) {
      return brands.map((b) => ({
        id: b.id,
        name: b.name,
        slug: b.slug,
        logoUrl: b.logoUrl,
        productCount: b._count.products,
      }));
    }
  } catch (error) {
    console.warn("Database unavailable, using fallback brands:", error);
  }

  // Fallback to active initial brands
  return INITIAL_BRANDS.filter((b) => b.isActive).map((b) => ({
    id: b.id,
    name: b.name,
    slug: b.slug,
    logoUrl: b.logoUrl,
    productCount: b.productCount,
  }));
}

export async function getActiveCategories(): Promise<StorefrontCategory[]> {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { name: "asc" },
      include: {
        parent: true,
        children: {
          where: { isActive: true, deletedAt: null },
        },
        _count: {
          select: { products: { where: { isActive: true, deletedAt: null } } },
        },
      },
    });

    if (categories && categories.length > 0) {
      return categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        parentId: c.parentId,
        parentName: c.parent?.name ?? null,
        children: c.children.map((ch) => ({
          id: ch.id,
          name: ch.name,
          slug: ch.slug,
          parentId: ch.parentId,
        })),
        productCount: c._count.products,
      }));
    }
  } catch (error) {
    console.warn("Database unavailable, using fallback categories:", error);
  }

  // Fallback to active initial categories
  return INITIAL_CATEGORIES.filter((c) => c.isActive).map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    parentId: c.parentId,
    parentName: c.parentName,
    productCount: c.productCount,
  }));
}

export async function getNewArrivalProducts(): Promise<StorefrontProduct[]> {
  try {
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        isNewArrival: true,
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
      include: {
        brand: true,
        category: true,
        images: { orderBy: { sortOrder: "asc" } },
        variants: { where: { deletedAt: null } },
      },
    });

    if (products && products.length > 0) {
      return applyDiscountsToProducts(products.map((p) => formatPrismaProduct(p)));
    }
  } catch (error) {
    console.warn("Database unavailable, using fallback new arrivals:", error);
  }

  // Fallback to initial products
  const fallback = INITIAL_PRODUCTS.filter((p) => p.isActive && (p.isNewArrival ?? true)).map(
    (p) => formatFallbackProduct(p)
  );
  return applyDiscountsToProducts(fallback);
}

export async function getProductsByBrandSlug(
  slug: string
): Promise<{ brand: StorefrontBrand | null; products: StorefrontProduct[] }> {
  try {
    const brand = await prisma.brand.findUnique({
      where: { slug },
      include: {
        products: {
          where: { isActive: true, deletedAt: null },
          orderBy: { createdAt: "desc" },
          include: {
            brand: true,
            category: true,
            images: { orderBy: { sortOrder: "asc" } },
            variants: { where: { deletedAt: null } },
          },
        },
      },
    });

    if (brand && brand.isActive && !brand.deletedAt) {
      return {
        brand: {
          id: brand.id,
          name: brand.name,
          slug: brand.slug,
          logoUrl: brand.logoUrl,
        },
        products: applyDiscountsToProducts(brand.products.map((p) => formatPrismaProduct(p))),
      };
    }
  } catch (error) {
    console.warn("Database unavailable, using fallback brand lookup:", error);
  }

  const fallbackBrand = INITIAL_BRANDS.find(
    (b) => b.slug.toLowerCase() === slug.toLowerCase() && b.isActive
  );
  if (!fallbackBrand) {
    return { brand: null, products: [] };
  }

  const fallbackProducts = INITIAL_PRODUCTS.filter(
    (p) =>
      p.isActive &&
      (p.brandId === fallbackBrand.id ||
        p.brandName.toLowerCase() === fallbackBrand.name.toLowerCase())
  ).map((p) => formatFallbackProduct(p));

  return {
    brand: {
      id: fallbackBrand.id,
      name: fallbackBrand.name,
      slug: fallbackBrand.slug,
      logoUrl: fallbackBrand.logoUrl,
    },
    products: applyDiscountsToProducts(fallbackProducts),
  };
}

export async function getProductsByCategorySlug(
  slug: string
): Promise<{ category: StorefrontCategory | null; products: StorefrontProduct[] }> {
  try {
    const category = await prisma.category.findUnique({
      where: { slug },
      include: {
        children: { where: { isActive: true, deletedAt: null } },
      },
    });

    if (category && category.isActive && !category.deletedAt) {
      const categoryIds = [category.id, ...category.children.map((ch) => ch.id)];

      const products = await prisma.product.findMany({
        where: {
          categoryId: { in: categoryIds },
          isActive: true,
          deletedAt: null,
        },
        orderBy: { createdAt: "desc" },
        include: {
          brand: true,
          category: true,
          images: { orderBy: { sortOrder: "asc" } },
          variants: { where: { deletedAt: null } },
        },
      });

      return {
        category: {
          id: category.id,
          name: category.name,
          slug: category.slug,
          parentId: category.parentId,
        },
        products: applyDiscountsToProducts(products.map((p) => formatPrismaProduct(p))),
      };
    }
  } catch (error) {
    console.warn("Database unavailable, using fallback category lookup:", error);
  }

  const fallbackCategory = INITIAL_CATEGORIES.find(
    (c) => c.slug.toLowerCase() === slug.toLowerCase() && c.isActive
  );
  if (!fallbackCategory) {
    return { category: null, products: [] };
  }

  // Include children categories
  const childIds = INITIAL_CATEGORIES.filter(
    (c) => c.parentId === fallbackCategory.id && c.isActive
  ).map((c) => c.id);
  const matchingCategoryIds = [fallbackCategory.id, ...childIds];

  const fallbackProducts = INITIAL_PRODUCTS.filter(
    (p) =>
      p.isActive &&
      (matchingCategoryIds.includes(p.categoryId) ||
        p.categoryName.toLowerCase() === fallbackCategory.name.toLowerCase())
  ).map((p) => formatFallbackProduct(p));

  return {
    category: {
      id: fallbackCategory.id,
      name: fallbackCategory.name,
      slug: fallbackCategory.slug,
      parentId: fallbackCategory.parentId,
      parentName: fallbackCategory.parentName,
    },
    products: applyDiscountsToProducts(fallbackProducts),
  };
}

export async function getProductBySlugOrId(
  rawIdentifier: string
): Promise<StorefrontProduct | null> {
  const identifier = decodeURIComponent(rawIdentifier).trim().toLowerCase();

  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
    const orConditions = isUuid
      ? [
          { id: identifier },
          { slug: identifier },
          { slug: { equals: identifier, mode: "insensitive" as const } },
        ]
      : [
          { slug: identifier },
          { slug: { equals: identifier, mode: "insensitive" as const } },
        ];

    const product = await prisma.product.findFirst({
      where: {
        OR: orConditions,
        isActive: true,
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

    if (product) {
      let seriesProducts: StorefrontSeriesItem[] = [];
      if (product.productSeriesId) {
        const siblings = await prisma.product.findMany({
          where: {
            productSeriesId: product.productSeriesId,
            isActive: true,
            deletedAt: null,
          },
          orderBy: { createdAt: "asc" },
          include: {
            images: { orderBy: { sortOrder: "asc" }, take: 1 },
          },
        });

        seriesProducts = siblings.map((sib) => ({
          id: sib.id,
          name: sib.name,
          slug: sib.slug,
          price: Number(sib.price),
          discountPrice: sib.discountPrice ? Number(sib.discountPrice) : null,
          dimensions: sib.dimensions ?? null,
          weightGrams: sib.weightGrams ?? 250,
          capacityNote: sib.capacityNote ?? null,
          image:
            sib.images[0]?.url ||
            "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80",
          isCurrent: sib.id === product.id,
        }));
      }

      return applyDiscountToSingleProduct(
        formatPrismaProduct(product, seriesProducts)
      );
    }
  } catch (error) {
    console.warn("Database unavailable, using fallback product lookup:", error);
  }

  // Exact or normalized fallback match
  let fallback = INITIAL_PRODUCTS.find(
    (p) =>
      p.isActive &&
      (p.id.toLowerCase() === identifier ||
        p.slug.toLowerCase() === identifier)
  );

  // Resilient typo matching (e.g., "down-gong" -> "dawn-gong", "outdoor-matt" -> "outdoor-mat", "new-02" -> "news-02")
  if (!fallback) {
    const normalized = identifier
      .replace(/down-gong/g, "dawn-gong")
      .replace(/outdoor-matt/g, "outdoor-mat")
      .replace(/new-02/g, "news-02")
      .replace(/new-03/g, "news-03");

    fallback = INITIAL_PRODUCTS.find(
      (p) =>
        p.isActive &&
        (p.slug.toLowerCase() === normalized ||
          p.id.toLowerCase() === normalized)
    );
  }

  if (fallback) {
    let seriesProducts: StorefrontSeriesItem[] = [];
    if (fallback.productSeriesId) {
      const siblings = INITIAL_PRODUCTS.filter(
        (p) => p.productSeriesId === fallback!.productSeriesId && p.isActive
      );
      seriesProducts = siblings.map((sib) => ({
        id: sib.id,
        name: sib.name,
        slug: sib.slug,
        price: Number(sib.price),
        discountPrice: sib.discountPrice ? Number(sib.discountPrice) : null,
        dimensions: sib.dimensions ?? null,
        weightGrams: sib.weightGrams ?? 250,
        capacityNote: sib.capacityNote ?? null,
        image:
          sib.images[0] ||
          "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80",
        isCurrent: sib.id === fallback!.id,
      }));
    }

    return applyDiscountToSingleProduct(
      formatFallbackProduct(fallback, seriesProducts)
    );
  }

  return null;
}

type PrismaProductRecord = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description: string;
  price: number | { toString: () => string };
  discountPrice?: number | { toString: () => string } | null;
  stock: number;
  lowStockThreshold?: number | null;
  weightGrams?: number | null;
  dimensions?: string | null;
  capacityNote?: string | null;
  productSeriesId?: string | null;
  productSeries?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  isNewArrival?: boolean | null;
  isActive: boolean;
  brandId?: string;
  brand?: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string | null;
  } | null;
  categoryId?: string;
  category?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  images?: {
    id: string;
    url: string;
    isPrimary: boolean;
    sortOrder: number;
  }[];
  variants?: {
    id: string;
    sku?: string | null;
    size: string;
    color: string;
    colorGroup?: string | null;
    colorHex?: string | null;
    stock: number;
    lowStockThreshold?: number | null;
  }[];
};

function formatPrismaProduct(
  p: PrismaProductRecord,
  seriesProducts?: StorefrontSeriesItem[]
): StorefrontProduct {
  const images =
    p.images && p.images.length > 0
      ? p.images.map((img) => ({
          id: img.id,
          url: img.url,
          isPrimary: img.isPrimary,
          sortOrder: img.sortOrder,
        }))
      : [
          {
            id: "default-img",
            url: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=85",
            isPrimary: true,
            sortOrder: 0,
          },
        ];

  const variants: StorefrontVariant[] =
    p.variants && p.variants.length > 0
      ? p.variants.map((v) => ({
          id: v.id,
          sku: v.sku,
          size: v.size,
          color: v.color,
          colorGroup: v.colorGroup ?? null,
          colorHex: v.colorHex ?? null,
          stock: v.stock,
          lowStockThreshold: v.lowStockThreshold ?? p.lowStockThreshold ?? 5,
        }))
      : [
          {
            id: "default-var",
            size: "One Size",
            color: "Default",
            stock: p.stock,
            lowStockThreshold: p.lowStockThreshold ?? 5,
          },
        ];

  const totalStock = variants.reduce((sum, v) => sum + v.stock, 0);

  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    sku: p.sku,
    description: p.description,
    price: Number(p.price),
    discountPrice: p.discountPrice ? Number(p.discountPrice) : null,
    stock: totalStock,
    lowStockThreshold: p.lowStockThreshold ?? 5,
    dimensions: p.dimensions ?? null,
    weightGrams: p.weightGrams ?? 250,
    capacityNote: p.capacityNote ?? null,
    productSeriesId: p.productSeriesId ?? null,
    productSeries: p.productSeries
      ? {
          id: p.productSeries.id,
          name: p.productSeries.name,
          slug: p.productSeries.slug,
        }
      : null,
    seriesProducts: seriesProducts && seriesProducts.length > 0 ? seriesProducts : undefined,
    isNewArrival: p.isNewArrival ?? false,
    isActive: p.isActive,
    brand: {
      id: p.brand?.id ?? p.brandId ?? "",
      name: p.brand?.name ?? "Brand",
      slug: p.brand?.slug ?? "brand",
      logoUrl: p.brand?.logoUrl ?? null,
    },
    category: {
      id: p.category?.id ?? p.categoryId ?? "",
      name: p.category?.name ?? "Category",
      slug: p.category?.slug ?? "category",
    },
    images,
    variants,
  };
}

type FallbackProductRecord = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description: string;
  price: number;
  discountPrice?: number | null;
  stock: number;
  lowStockThreshold?: number;
  weightGrams?: number;
  dimensions?: string | null;
  capacityNote?: string | null;
  productSeriesId?: string | null;
  productSeriesName?: string | null;
  isNewArrival?: boolean;
  isActive: boolean;
  brandId: string;
  brandName: string;
  categoryId: string;
  categoryName: string;
  images?: string[];
  variants?: {
    id: string;
    size: string;
    color: string;
    colorGroup?: string | null;
    colorHex?: string | null;
    image?: string | null;
    stock: number;
    lowStockThreshold?: number;
    sku?: string;
  }[];
};

function formatFallbackProduct(
  p: FallbackProductRecord,
  seriesProducts?: StorefrontSeriesItem[]
): StorefrontProduct {
  const images = (p.images ?? []).map((url: string, idx: number) => ({
    id: `img-${idx}`,
    url,
    isPrimary: idx === 0,
    sortOrder: idx,
  }));

  const variants: StorefrontVariant[] = (p.variants ?? []).map((v) => ({
    id: v.id,
    sku: v.sku,
    size: v.size,
    color: v.color,
    colorGroup: v.colorGroup ?? null,
    colorHex: v.colorHex ?? null,
    image: v.image ?? null,
    stock: v.stock,
    lowStockThreshold: v.lowStockThreshold ?? p.lowStockThreshold ?? 5,
  }));

  const totalStock =
    variants.length > 0
      ? variants.reduce((sum, v) => sum + v.stock, 0)
      : p.stock;

  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    sku: p.sku,
    description: p.description,
    price: Number(p.price),
    discountPrice: p.discountPrice ? Number(p.discountPrice) : null,
    stock: totalStock,
    lowStockThreshold: p.lowStockThreshold ?? 5,
    dimensions: p.dimensions ?? null,
    weightGrams: p.weightGrams ?? 250,
    capacityNote: p.capacityNote ?? null,
    productSeriesId: p.productSeriesId ?? null,
    productSeries: p.productSeriesId
      ? {
          id: p.productSeriesId,
          name: p.productSeriesName ?? "Product Series",
          slug: slugifyFallback(p.productSeriesName ?? "Product Series"),
        }
      : null,
    seriesProducts: seriesProducts && seriesProducts.length > 0 ? seriesProducts : undefined,
    isNewArrival: p.isNewArrival ?? false,
    isActive: p.isActive,
    brand: {
      id: p.brandId,
      name: p.brandName,
      slug: slugifyFallback(p.brandName),
    },
    category: {
      id: p.categoryId,
      name: p.categoryName,
      slug: slugifyFallback(p.categoryName),
    },
    images:
      images.length > 0
        ? images
        : [
            {
              id: "img-0",
              url: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=85",
              isPrimary: true,
              sortOrder: 0,
            },
          ],
    variants,
  };
}

function slugifyFallback(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

import {
  INITIAL_HERO_BANNERS,
  INITIAL_SECONDARY_BANNERS,
  type AdminBannerItem,
} from "@/lib/banner-store";

export async function getStorefrontBanners(): Promise<{
  heroBanners: AdminBannerItem[];
  secondaryBanners: AdminBannerItem[];
}> {
  try {
    const banners = await prisma.banner.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    const hero = banners
      .filter((b) => b.type === "HERO_BANNER")
      .map((b) => ({
        id: b.id,
        type: b.type as "HERO_BANNER",
        title: b.title,
        subtitle: b.subtitle,
        description: b.description,
        imageUrl: b.imageUrl,
        mobileImageUrl: b.mobileImageUrl,
        ctaText: b.ctaText,
        ctaLink: b.ctaLink,
        sortOrder: b.sortOrder,
        isActive: b.isActive,
        createdAt: b.createdAt.toISOString(),
        updatedAt: b.updatedAt.toISOString(),
      }));

    const secondary = banners
      .filter((b) => b.type === "SECONDARY_BANNER")
      .map((b) => ({
        id: b.id,
        type: b.type as "SECONDARY_BANNER",
        title: b.title,
        subtitle: b.subtitle,
        description: b.description,
        imageUrl: b.imageUrl,
        mobileImageUrl: b.mobileImageUrl,
        ctaText: b.ctaText,
        ctaLink: b.ctaLink,
        sortOrder: b.sortOrder,
        isActive: b.isActive,
        createdAt: b.createdAt.toISOString(),
        updatedAt: b.updatedAt.toISOString(),
      }));

    return {
      heroBanners: hero.length > 0 ? hero : INITIAL_HERO_BANNERS,
      secondaryBanners: secondary.length > 0 ? secondary : INITIAL_SECONDARY_BANNERS,
    };
  } catch (error) {
    console.warn("Database banners fallback used:", error);
    return {
      heroBanners: INITIAL_HERO_BANNERS,
      secondaryBanners: INITIAL_SECONDARY_BANNERS,
    };
  }
}

