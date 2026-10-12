/**
 * discount-engine.ts
 *
 * Core pricing calculation engine for promotional discounts.
 * Computes effective prices for products based on active campaigns.
 */

export * from "@/lib/discount-types";
import {
  type DiscountCampaign,
  type ResolvedDiscount,
  type CartItemForDiscount,
  type BundleDiscountResult,
  type GiftPackageResult,
} from "@/lib/discount-types";

export function calculateProductDiscount(
  product: {
    id: string;
    price: number | string;
    discountPrice?: number | string | null;
    categoryId?: string | null;
    category?: { id: string } | null;
  },
  activeCampaigns: DiscountCampaign[]
): ResolvedDiscount {
  const original = Number(product.price) || 0;
  let bestDiscountPrice = product.discountPrice ? Number(product.discountPrice) : original;
  let activeCampaignName: string | null = null;
  let activeCampaignId: string | null = null;

  const categoryId = product.categoryId || product.category?.id;

  for (const campaign of activeCampaigns) {
    // Paket Diskon (BUNDLE_PACKAGE) dan Paket Hadiah (GIFT_PACKAGE) beroperasi di keranjang/transaksi
    if (campaign.campaignType === "BUNDLE_PACKAGE" || campaign.campaignType === "GIFT_PACKAGE") continue;

    let applies = false;
    if (campaign.targetType === "ALL_PRODUCTS") {
      applies = true;
    } else if (campaign.targetType === "CATEGORY" && categoryId) {
      applies = campaign.targetCategoryIds.includes(categoryId);
    } else if (campaign.targetType === "SPECIFIC_PRODUCTS") {
      applies = campaign.targetProductIds.includes(product.id);
    }

    if (applies) {
      let promoPrice = original;
      if (campaign.discountType === "PERCENTAGE") {
        promoPrice = Math.round(original * (1 - campaign.discountValue / 100));
      } else if (campaign.discountType === "FIXED_AMOUNT") {
        promoPrice = Math.max(0, original - campaign.discountValue);
      }

      // If this campaign yields lower price than regular or other campaigns
      if (promoPrice < bestDiscountPrice) {
        bestDiscountPrice = promoPrice;
        activeCampaignName = campaign.name;
        activeCampaignId = campaign.id;
      }
    }
  }

  const isDiscounted = bestDiscountPrice < original;
  const discountAmount = original - bestDiscountPrice;
  const discountPercent = original > 0 ? Math.round((discountAmount / original) * 100) : 0;

  return {
    isDiscounted,
    originalPrice: original,
    discountPrice: isDiscounted ? bestDiscountPrice : original,
    discountPercent,
    discountAmount,
    campaignName: activeCampaignName,
    campaignId: activeCampaignId,
  };
}

/**
 * Apply discounts to an array of products
 */
export function applyDiscountsToProducts<
  T extends {
    id: string;
    price: number | string;
    discountPrice?: number | string | null;
    categoryId?: string | null;
    category?: { id: string } | null;
  }
>(products: T[], campaigns: DiscountCampaign[] = []): Array<T & { discount: ResolvedDiscount }> {
  return products.map((p) => {
    const discount = calculateProductDiscount(p, campaigns);
    return {
      ...p,
      discountPrice: discount.isDiscounted ? discount.discountPrice : null,
      discount,
    };
  });
}

/**
 * Apply discounts to a single product
 */
export function applyDiscountToSingleProduct<
  T extends {
    id: string;
    price: number | string;
    discountPrice?: number | string | null;
    categoryId?: string | null;
    category?: { id: string } | null;
  }
>(product: T, campaigns: DiscountCampaign[] = []): T & { discount: ResolvedDiscount } {
  const discount = calculateProductDiscount(product, campaigns);
  return {
    ...product,
    discountPrice: discount.isDiscounted ? discount.discountPrice : null,
    discount,
  };
}

/**
 * Calculates Shopee-style "Paket Diskon" (Bundle Deals) based on cart items & min. spend threshold
 */
export function calculateBundlePackageDiscount(
  items: CartItemForDiscount[],
  activeCampaigns: DiscountCampaign[]
): BundleDiscountResult {
  const bundleCampaigns = activeCampaigns.filter(
    (c) => c.campaignType === "BUNDLE_PACKAGE" && c.isActive
  );

  if (bundleCampaigns.length === 0 || items.length === 0) {
    return {
      isEligible: false,
      appliedCampaign: null,
      discountAmount: 0,
      eligibleSubtotal: 0,
      minSpend: 0,
      remainingToThreshold: 0,
      progressPercent: 0,
      discountValue: 0,
      discountType: "PERCENTAGE",
      name: "",
    };
  }

  let bestResult: BundleDiscountResult | null = null;
  let highestDiscount = -1;

  // Evaluate eligible campaigns
  for (const campaign of bundleCampaigns) {
    const minSpend = Number(campaign.minSpend) || 0;

    // Filter items matching target
    const eligibleItems = items.filter((it) => {
      if (campaign.targetType === "ALL_PRODUCTS") return true;
      if (campaign.targetType === "CATEGORY" && it.categoryId) {
        return campaign.targetCategoryIds.includes(it.categoryId);
      }
      if (campaign.targetType === "SPECIFIC_PRODUCTS") {
        return campaign.targetProductIds.includes(it.productId);
      }
      return false;
    });

    const eligibleSubtotal = eligibleItems.reduce(
      (sum, it) => sum + it.priceNumber * it.quantity,
      0
    );

    const isEligible = eligibleSubtotal >= minSpend && minSpend > 0;
    let disc = 0;

    if (isEligible) {
      if (campaign.discountType === "PERCENTAGE") {
        disc = Math.round(eligibleSubtotal * (campaign.discountValue / 100));
      } else {
        disc = Math.min(eligibleSubtotal, campaign.discountValue);
      }

      if (campaign.maxDiscountAmount && campaign.maxDiscountAmount > 0) {
        disc = Math.min(disc, campaign.maxDiscountAmount);
      }
    }

    const remainingToThreshold = Math.max(0, minSpend - eligibleSubtotal);
    const progressPercent = minSpend > 0 ? Math.min(100, Math.round((eligibleSubtotal / minSpend) * 100)) : 100;

    const result: BundleDiscountResult = {
      isEligible,
      appliedCampaign: campaign,
      discountAmount: disc,
      eligibleSubtotal,
      minSpend,
      remainingToThreshold,
      progressPercent,
      discountValue: campaign.discountValue,
      discountType: campaign.discountType,
      name: campaign.name,
    };

    if (isEligible && disc > highestDiscount) {
      highestDiscount = disc;
      bestResult = result;
    } else if (!bestResult && !isEligible) {
      bestResult = result;
    } else if (!isEligible && bestResult && !bestResult.isEligible && progressPercent > bestResult.progressPercent) {
      // Pick the campaign customer is closest to achieving
      bestResult = result;
    }
  }

  return (
    bestResult || {
      isEligible: false,
      appliedCampaign: null,
      discountAmount: 0,
      eligibleSubtotal: 0,
      minSpend: 0,
      remainingToThreshold: 0,
      progressPercent: 0,
      discountValue: 0,
      discountType: "PERCENTAGE",
      name: "",
    }
  );
}

/**
 * Get active bundle package badge for a product card/detail
 */
export function getProductBundleBadge(
  productId: string,
  categoryId?: string | null,
  activeCampaigns: DiscountCampaign[] = []
): DiscountCampaign | null {
  const bundles = activeCampaigns.filter(
    (c) => c.campaignType === "BUNDLE_PACKAGE" && c.isActive
  );
  for (const b of bundles) {
    if (b.targetType === "ALL_PRODUCTS") return b;
    if (b.targetType === "CATEGORY" && categoryId && b.targetCategoryIds.includes(categoryId)) return b;
    if (b.targetType === "SPECIFIC_PRODUCTS" && b.targetProductIds.includes(productId)) return b;
  }
  return null;
}

/**
 * Calculates Shopee-style "Paket Hadiah" (Free Gift with Purchase) based on cart items & min. spend threshold
 */
export function calculateGiftPackageReward(
  items: CartItemForDiscount[],
  activeCampaigns: DiscountCampaign[]
): GiftPackageResult {
  const giftCampaigns = activeCampaigns.filter(
    (c) => c.campaignType === "GIFT_PACKAGE" && c.isActive && c.giftProductId
  );

  if (giftCampaigns.length === 0 || items.length === 0) {
    return {
      isEligible: false,
      appliedCampaign: null,
      eligibleSubtotal: 0,
      minSpend: 0,
      remainingToThreshold: 0,
      progressPercent: 0,
      giftProductId: null,
      giftProductName: null,
      giftProductImage: null,
      giftQuantity: 0,
    };
  }

  let bestResult: GiftPackageResult | null = null;
  let closestProgress = -1;

  for (const campaign of giftCampaigns) {
    const minSpend = Number(campaign.minSpend) || 0;

    const eligibleItems = items.filter((it) => {
      if (campaign.targetType === "ALL_PRODUCTS") return true;
      if (campaign.targetType === "CATEGORY" && it.categoryId) {
        return campaign.targetCategoryIds.includes(it.categoryId);
      }
      if (campaign.targetType === "SPECIFIC_PRODUCTS") {
        return campaign.targetProductIds.includes(it.productId);
      }
      return false;
    });

    const eligibleSubtotal = eligibleItems.reduce(
      (sum, it) => sum + it.priceNumber * it.quantity,
      0
    );

    const isEligible = eligibleSubtotal >= minSpend && minSpend > 0;
    const remainingToThreshold = Math.max(0, minSpend - eligibleSubtotal);
    const progressPercent = minSpend > 0 ? Math.min(100, Math.round((eligibleSubtotal / minSpend) * 100)) : 100;

    const result: GiftPackageResult = {
      isEligible,
      appliedCampaign: campaign,
      eligibleSubtotal,
      minSpend,
      remainingToThreshold,
      progressPercent,
      giftProductId: campaign.giftProductId || null,
      giftProductName: campaign.giftProductName || null,
      giftProductImage: campaign.giftProductImage || null,
      giftQuantity: campaign.giftQuantity || 1,
    };

    if (isEligible) {
      if (!bestResult || !bestResult.isEligible || minSpend > bestResult.minSpend) {
        bestResult = result;
      }
    } else if (!bestResult || (!bestResult.isEligible && progressPercent > closestProgress)) {
      closestProgress = progressPercent;
      bestResult = result;
    }
  }

  return (
    bestResult || {
      isEligible: false,
      appliedCampaign: null,
      eligibleSubtotal: 0,
      minSpend: 0,
      remainingToThreshold: 0,
      progressPercent: 0,
      giftProductId: null,
      giftProductName: null,
      giftProductImage: null,
      giftQuantity: 0,
    }
  );
}

/**
 * Get active gift package badge for a product card/detail
 */
export function getProductGiftBadge(
  productId: string,
  categoryId?: string | null,
  activeCampaigns: DiscountCampaign[] = []
): DiscountCampaign | null {
  const gifts = activeCampaigns.filter(
    (c) => c.campaignType === "GIFT_PACKAGE" && c.isActive && c.giftProductId
  );
  for (const g of gifts) {
    if (g.targetType === "ALL_PRODUCTS") return g;
    if (g.targetType === "CATEGORY" && categoryId && g.targetCategoryIds.includes(categoryId)) return g;
    if (g.targetType === "SPECIFIC_PRODUCTS" && g.targetProductIds.includes(productId)) return g;
  }
  return null;
}
