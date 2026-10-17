export interface HeroCategoryLink {
  label: string;
  href: string;
  image: string;
  mobileImage?: string;
}

export interface HeroSlide {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  image: string;
  mobileImage?: string;
  ctaText?: string;
  ctaLink?: string;
  textPosition: "center" | "left" | "bottom-center" | "editorial-top";
  textColor: "white" | "black";
  categoryLinks?: HeroCategoryLink[];
}

/**
 * Editorial Hero Bag Categories for it'smatapanda
 */
export const HERO_CATEGORIES: HeroCategoryLink[] = [
  {
    label: "New in",
    href: "/new-arrivals",
    image:
      "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=2000&q=85",
    mobileImage:
      "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1080&h=1440&q=85",
  },
  {
    label: "Tote Bags",
    href: "/categories/tote-bags",
    image:
      "https://images.unsplash.com/photo-1597484661643-2f5fef640dd1?auto=format&fit=crop&w=2000&q=85",
    mobileImage:
      "https://images.unsplash.com/photo-1597484661643-2f5fef640dd1?auto=format&fit=crop&w=1080&h=1440&q=85",
  },
  {
    label: "Dumpling & Sling",
    href: "/categories/sling-crossbody",
    image:
      "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=2000&q=85",
    mobileImage:
      "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=1080&h=1440&q=85",
  },
  {
    label: "Shoulder Bags",
    href: "/categories/shoulder-bags",
    image:
      "https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&w=2000&q=85",
    mobileImage:
      "https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&w=1080&h=1440&q=85",
  },
  {
    label: "Backpacks",
    href: "/categories/backpacks",
    image:
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=2000&q=85",
    mobileImage:
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1080&h=1440&q=85",
  },
  {
    label: "Small Goods",
    href: "/categories/pouches-small-goods",
    image:
      "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=2000&q=85",
    mobileImage:
      "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1080&h=1440&q=85",
  },
];

export const HERO_SLIDES: HeroSlide[] = HERO_CATEGORIES.map((cat) => ({
  id: `hero-slide-${cat.label.toLowerCase().replace(/\s+/g, "-")}`,
  title: cat.label,
  image: cat.image,
  textPosition: "editorial-top",
  textColor: "white",
  ctaText: `Discover ${cat.label}`,
  ctaLink: cat.href,
  categoryLinks: HERO_CATEGORIES,
}));
