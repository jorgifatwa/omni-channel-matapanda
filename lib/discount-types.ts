/**
 * discount-types.ts
 *
 * Pure TypeScript interfaces and types for discounts & bundle packages.
 * Safe to import in both client and server components (no Node.js fs dependencies).
 */

export type DiscountType = "PERCENTAGE" | "FIXED_AMOUNT";
export type DiscountTargetType = "ALL_PRODUCTS" | "CATEGORY" | "SPECIFIC_PRODUCTS";
export type CampaignType = "CATALOG_DISCOUNT" | "BUNDLE_PACKAGE" | "GIFT_PACKAGE";

export interface DiscountCampaign {
  id: string;
  name: string;
  description?: string;
  bannerText?: string;
  campaignType?: CampaignType; // "CATALOG_DISCOUNT" | "BUNDLE_PACKAGE" | "GIFT_PACKAGE"
  discountType: DiscountType;
  discountValue: number; // e.g. 20 for 20%, or 50000 for Rp 50.000 (or 0 for GIFT_PACKAGE)
  minSpend?: number; // Minimum transaction spend required (e.g. 200000 or 300000)
  maxDiscountAmount?: number | null; // Optional maximum discount amount in IDR
  giftProductId?: string | null; // Product ID selected as free gift
  giftProductName?: string | null; // Cached product name for free gift
  giftProductImage?: string | null; // Cached product image for free gift
  giftQuantity?: number; // Quantity of free gift (default 1)
  targetType: DiscountTargetType;
  targetCategoryIds: string[];
  targetProductIds: string[];
  startDate: string; // ISO string
  endDate: string; // ISO string
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ResolvedDiscount {
  isDiscounted: boolean;
  originalPrice: number;
  discountPrice: number;
  discountPercent: number;
  discountAmount: number;
  campaignName: string | null;
  campaignId: string | null;
}

export interface CartItemForDiscount {
  productId: string;
  priceNumber: number;
  quantity: number;
  categoryId?: string | null;
}

export interface BundleDiscountResult {
  isEligible: boolean;
  appliedCampaign: DiscountCampaign | null;
  discountAmount: number;
  eligibleSubtotal: number;
  minSpend: number;
  remainingToThreshold: number;
  progressPercent: number; // 0 to 100
  discountValue: number;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  name: string;
}

export interface GiftPackageResult {
  isEligible: boolean;
  appliedCampaign: DiscountCampaign | null;
  eligibleSubtotal: number;
  minSpend: number;
  remainingToThreshold: number;
  progressPercent: number; // 0 to 100
  giftProductId: string | null;
  giftProductName: string | null;
  giftProductImage: string | null;
  giftQuantity: number;
}
