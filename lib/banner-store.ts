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

export const INITIAL_HERO_BANNERS: AdminBannerItem[] = [
  {
    id: "hero-new-in",
    type: "HERO_BANNER",
    title: "New in",
    subtitle: "Koleksi Tas Terbaru it'smatapanda",
    imageUrl:
      "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=2000&q=85",
    mobileImageUrl:
      "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1080&h=1440&q=85",
    ctaText: "Discover New in",
    ctaLink: "/new-arrivals",
    sortOrder: 0,
    isActive: true,
    createdAt: "2026-10-01",
  },
  {
    id: "hero-tote-bags",
    type: "HERO_BANNER",
    title: "Tote Bags",
    subtitle: "Tas Tote Fungsional & Daily Carry",
    imageUrl:
      "https://images.unsplash.com/photo-1597484661643-2f5fef640dd1?auto=format&fit=crop&w=2000&q=85",
    mobileImageUrl:
      "https://images.unsplash.com/photo-1597484661643-2f5fef640dd1?auto=format&fit=crop&w=1080&h=1440&q=85",
    ctaText: "Discover Tote Bags",
    ctaLink: "/categories/tote-bags",
    sortOrder: 1,
    isActive: true,
    createdAt: "2026-10-01",
  },
  {
    id: "hero-dumpling-sling",
    type: "HERO_BANNER",
    title: "Dumpling & Sling",
    subtitle: "Siluet Gathered & Crossbody Ringan",
    imageUrl:
      "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=2000&q=85",
    mobileImageUrl:
      "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=1080&h=1440&q=85",
    ctaText: "Discover Sling Bags",
    ctaLink: "/categories/sling-crossbody",
    sortOrder: 2,
    isActive: true,
    createdAt: "2026-10-01",
  },
  {
    id: "hero-shoulder-bags",
    type: "HERO_BANNER",
    title: "Shoulder Bags",
    subtitle: "Puffer & Hobo Modern",
    imageUrl:
      "https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&w=2000&q=85",
    mobileImageUrl:
      "https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&w=1080&h=1440&q=85",
    ctaText: "Discover Shoulder Bags",
    ctaLink: "/categories/shoulder-bags",
    sortOrder: 3,
    isActive: true,
    createdAt: "2026-10-01",
  },
  {
    id: "hero-backpacks",
    type: "HERO_BANNER",
    title: "Backpacks",
    subtitle: "Ransel Urban & Commuter",
    imageUrl:
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=2000&q=85",
    mobileImageUrl:
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1080&h=1440&q=85",
    ctaText: "Discover Backpacks",
    ctaLink: "/categories/backpacks",
    sortOrder: 4,
    isActive: true,
    createdAt: "2026-10-01",
  },
  {
    id: "hero-pouches",
    type: "HERO_BANNER",
    title: "Small Goods",
    subtitle: "Pouches, Cardholders & Straps",
    imageUrl:
      "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=2000&q=85",
    mobileImageUrl:
      "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1080&h=1440&q=85",
    ctaText: "Discover Small Goods",
    ctaLink: "/categories/pouches-small-goods",
    sortOrder: 5,
    isActive: true,
    createdAt: "2026-10-01",
  },
];

export const INITIAL_SECONDARY_BANNERS: AdminBannerItem[] = [
  {
    id: "sec-free-shipping",
    type: "SECONDARY_BANNER",
    title: "Free shipping",
    subtitle: "With minimum spend inclusive of custom duties and taxes",
    description:
      "Nikmati pengiriman gratis ke seluruh Indonesia untuk setiap pembelian tas it'smatapanda",
    imageUrl:
      "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=2000&q=85",
    mobileImageUrl:
      "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1080&h=1440&q=85",
    ctaText: "Shop The Collection",
    ctaLink: "/new-arrivals",
    sortOrder: 0,
    isActive: true,
    createdAt: "2026-10-01",
  },
  {
    id: "sec-everyday-carryalls",
    type: "SECONDARY_BANNER",
    title: "Everyday carryalls",
    subtitle: "Lightweight, water-resistant & made for modern living",
    description:
      "Eksplorasi koleksi tas fungsional dengan palet warna vibran dan material premium tahan air",
    imageUrl:
      "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=2000&q=85",
    mobileImageUrl:
      "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=1080&h=1440&q=85",
    ctaText: "Explore Bags",
    ctaLink: "/categories/sling-crossbody",
    sortOrder: 1,
    isActive: true,
    createdAt: "2026-10-01",
  },
  {
    id: "sec-colourblock-series",
    type: "SECONDARY_BANNER",
    title: "Colourblock Series",
    subtitle: "Playful tones designed for your everyday adventures",
    description:
      "Temukan perpaduan warna kontras yang ceria dan material nilon tahan lama khas it'smatapanda",
    imageUrl:
      "https://images.unsplash.com/photo-1575032617751-6ddec2089882?auto=format&fit=crop&w=2000&q=85",
    mobileImageUrl:
      "https://images.unsplash.com/photo-1575032617751-6ddec2089882?auto=format&fit=crop&w=1080&h=1440&q=85",
    ctaText: "Discover Colours",
    ctaLink: "/categories/bags-totes",
    sortOrder: 2,
    isActive: true,
    createdAt: "2026-10-01",
  },
  {
    id: "sec-urban-utility",
    type: "SECONDARY_BANNER",
    title: "Urban Utility",
    subtitle: "Modular pouches, straps & versatile commuter bags",
    description:
      "Aksesoris modular dan tas kompartemen praktis untuk aktivitas harianmu yang dinamis",
    imageUrl:
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=2000&q=85",
    mobileImageUrl:
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1080&h=1440&q=85",
    ctaText: "Shop Urban Gear",
    ctaLink: "/categories/backpacks",
    sortOrder: 3,
    isActive: true,
    createdAt: "2026-10-01",
  },
];

export const INITIAL_ALL_BANNERS: AdminBannerItem[] = [
  ...INITIAL_HERO_BANNERS,
  ...INITIAL_SECONDARY_BANNERS,
];
