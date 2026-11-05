import { prisma } from "@/lib/prisma";
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
    console.error("[Storefront] Failed to load brands from database:", error);
  }

  return [];
}

const NON_BAG_PATTERNS = [
  "apparel",
  "t-shirt",
  "tshirt",
  "outerwear",
  "outer",
  "headwear",
  "caps-hats",
  "clothing",
  "baju",
  "kaos",
];

export function isNonBagCategory(slug: string, name?: string): boolean {
  const s = (slug || "").toLowerCase();
  const n = (name || "").toLowerCase();
  return NON_BAG_PATTERNS.some((p) => s.includes(p) || n.includes(p));
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
      // Strictly exclude any non-bag categories (apparel, headwear, outer, t-shirt)
      const bagCategories = categories.filter((c) => !isNonBagCategory(c.slug, c.name));
      if (bagCategories.length > 0) {
        return bagCategories.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          parentId: c.parentId,
          parentName: c.parent?.name ?? null,
          children: c.children
            .filter((ch) => !isNonBagCategory(ch.slug, ch.name))
            .map((ch) => ({
              id: ch.id,
              name: ch.name,
              slug: ch.slug,
              parentId: ch.parentId,
            })),
          productCount: c._count.products,
        }));
      }
    }
  } catch (error) {
    console.error("[Storefront] Failed to load categories from database:", error);
  }

  return [];
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
    console.error("[Storefront] Failed to load new arrivals from database:", error);
  }

  return [];
}

export async function getAllStorefrontProducts(): Promise<StorefrontProduct[]> {
  try {
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        deletedAt: null,
      },
      orderBy: [{ isNewArrival: "desc" }, { createdAt: "desc" }],
      include: {
        brand: true,
        category: true,
        productSeries: true,
        images: { orderBy: { sortOrder: "asc" } },
        variants: { where: { deletedAt: null } },
      },
    });

    if (products && products.length > 0) {
      return applyDiscountsToProducts(products.map((p) => formatPrismaProduct(p)));
    }
  } catch (error) {
    console.error("[Storefront] Failed to load all products from database:", error);
  }

  return [];
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
    console.error("[Storefront] Failed to load brand lookup from database:", error);
  }

  return { brand: null, products: [] };
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
    console.error("[Storefront] Failed to load category lookup from database:", error);
  }

  return { category: null, products: [] };
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
    console.error("[Storefront] Failed to load product lookup from database:", error);
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

import { getActiveStorefrontBanners } from "@/lib/banner-store.server";
import { type AdminBannerItem } from "@/lib/banner-store";

export async function getStorefrontBanners(): Promise<{
  heroBanners: AdminBannerItem[];
  secondaryBanners: AdminBannerItem[];
}> {
  // Banners come only from the database. If the database is unreachable the
  // homepage still renders, just without banner sections (no sample banners).
  try {
    const { heroBanners, secondaryBanners } = await getActiveStorefrontBanners();
    return { heroBanners, secondaryBanners };
  } catch (err) {
    console.error("[getStorefrontBanners] Gagal memuat banner dari database:", err);
    return { heroBanners: [], secondaryBanners: [] };
  }
}

