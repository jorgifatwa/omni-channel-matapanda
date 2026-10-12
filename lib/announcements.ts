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

export const INITIAL_ANNOUNCEMENTS: AdminAnnouncementItem[] = [
  {
    id: "ann-crew-shipping",
    text: "GIVE OUR CREW A 'LIL MORE TIME TO SHIP OUT YOUR ORDERS!",
    link: "/contact",
    badge: "INFO",
    sortOrder: 0,
    isActive: true,
    createdAt: "2026-10-01",
  },
  {
    id: "ann-welcome-offer",
    text: "RP100K OFF YOUR FIRST ORDER WHEN YOU JOIN THE IT'SMATAPANDA CLUB*",
    link: "/account/register",
    badge: "CLUB EXCLUSIVE",
    sortOrder: 1,
    isActive: true,
    createdAt: "2026-10-01",
  },
  {
    id: "ann-free-shipping",
    text: "FREE SHIPPING ACROSS INDONESIA WITH MIN. SPEND, INCLUSIVE OF ALL TAXES",
    link: "/new-arrivals",
    badge: "FREE SHIPPING",
    sortOrder: 2,
    isActive: true,
    createdAt: "2026-10-01",
  },
  {
    id: "ann-voucher",
    text: "USE PROMO CODE 'PANDABAGS' AT CHECKOUT FOR EXTRA 10% DISCOUNT",
    link: "/new-arrivals",
    badge: "VOUCHER",
    sortOrder: 3,
    isActive: true,
    createdAt: "2026-10-01",
  },
];

export const DEFAULT_ANNOUNCEMENTS: AnnouncementMessage[] = INITIAL_ANNOUNCEMENTS.map((item) => ({
  id: item.id,
  text: item.text,
  link: item.link || undefined,
  badge: item.badge || undefined,
  isPromo: item.badge === "PROMO" || item.badge === "VOUCHER",
}));

export function getStorefrontAnnouncements(): AnnouncementMessage[] {
  return [...DEFAULT_ANNOUNCEMENTS];
}
