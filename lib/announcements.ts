/**
 * announcements.ts
 *
 * Configurable multi-message announcement ticker for it'smatapanda storefront,
 * matching modern horizontal scrolling ticker design.
 */

export interface AnnouncementMessage {
  id: string;
  text: string;
  link?: string;
  badge?: string;
  isPromo?: boolean;
}

export interface AdminAnnouncementItem {
  id: string;
  text: string;
  link?: string | null;
  badge?: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export const ANNOUNCEMENT_BADGE_PRESETS = [
  { label: "Tanpa Badge", value: "" },
  { label: "CLUB EXCLUSIVE", value: "CLUB EXCLUSIVE" },
  { label: "FREE SHIPPING", value: "FREE SHIPPING" },
  { label: "VOUCHER", value: "VOUCHER" },
  { label: "PROMO", value: "PROMO" },
  { label: "INFO", value: "INFO" },
  { label: "NEW IN", value: "NEW IN" },
  { label: "LIMITED", value: "LIMITED" },
];
