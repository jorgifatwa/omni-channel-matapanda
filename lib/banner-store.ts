export type BannerType = "HERO_BANNER" | "SECONDARY_BANNER";

export interface AdminBannerItem {
  id: string;
  type: BannerType;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  imageUrl: string;
  mobileImageUrl?: string | null;
  ctaText?: string | null;
  ctaLink?: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}
