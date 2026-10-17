"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { HERO_CATEGORIES, HERO_SLIDES, type HeroCategoryLink, type HeroSlide } from "@/lib/hero-config";
import { type AdminBannerItem } from "@/lib/banner-store";

interface HeroBannerProps {
  banners?: AdminBannerItem[];
  slides?: HeroSlide[];
  categories?: HeroCategoryLink[];
}

export default function HeroBanner({
  banners,
  slides = HERO_SLIDES,
  categories = HERO_CATEGORIES,
}: HeroBannerProps) {
  // If dynamic banners provided from admin, convert to category links
  const activeCategories: HeroCategoryLink[] = React.useMemo(() => {
    if (banners && banners.length > 0) {
      return banners.map((b) => ({
        label: b.title,
        href: b.ctaLink || "/new-arrivals",
        image: b.imageUrl,
        mobileImage: b.mobileImageUrl || undefined,
      }));
    }
    return categories;
  }, [banners, categories]);

  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [isPaused, setIsPaused] = React.useState(false);

  const total = activeCategories.length > 0 ? activeCategories.length : slides.length;

  const nextSlide = React.useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [total]);

  // Auto-advance slides every 6.5 seconds when not paused
  React.useEffect(() => {
    if (isPaused || total <= 1) return;
    const interval = setInterval(() => {
      nextSlide();
    }, 6500);
    return () => clearInterval(interval);
  }, [isPaused, nextSlide, total]);

  if (total === 0) return null;

  const currentCategory = activeCategories[currentIndex] || activeCategories[0];
  const hasMobileImage = Boolean(currentCategory?.mobileImage);

  return (
    <section
      aria-label="Featured Hero Banner"
      className={`relative w-full ${
        hasMobileImage
          ? "h-[60vh] min-h-[440px] max-h-[600px] sm:h-[92vh] sm:min-h-[700px] sm:max-h-[1050px]"
          : "aspect-[16/9] sm:aspect-auto sm:h-[92vh] sm:min-h-[700px] sm:max-h-[1050px]"
      } overflow-hidden bg-neutral-100 dark:bg-neutral-900 select-none group`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* 1. Horizontal Sliding Track (8 Slides) */}
      <div
        className="flex h-full w-full transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{
          transform: `translateX(-${currentIndex * 100}%)`,
        }}
      >
        {activeCategories.map((cat, idx) => (
          <div
            key={cat.label}
            className="relative h-full w-full flex-shrink-0"
            aria-hidden={idx !== currentIndex}
          >
            {/* Desktop / Default Image */}
            <div className={`relative h-full w-full ${cat.mobileImage ? "hidden sm:block" : "block"}`}>
              <Image
                src={cat.image}
                alt={cat.label}
                fill
                priority={idx === 0}
                sizes="(min-width: 640px) 100vw, 100vw"
                className="object-cover object-center"
              />
            </div>

            {/* Mobile Specific Image (when provided) */}
            {cat.mobileImage && (
              <div className="relative h-full w-full block sm:hidden">
                <Image
                  src={cat.mobileImage}
                  alt={cat.label}
                  fill
                  priority={idx === 0}
                  sizes="100vw"
                  className="object-cover object-center"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 2. Content Overlay (Fixed on Top: Editorial Category Links) */}
      <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between">
        {/* Editorial Top Categories Typography */}
        <div className="w-full pt-2 sm:pt-6 md:pt-8 px-3 sm:px-8 lg:px-12 text-left pointer-events-auto">
          <div className="max-w-6xl lg:max-w-7xl text-lg sm:text-6xl md:text-7xl lg:text-[5rem] xl:text-[6.2rem] 2xl:text-[7.2rem] font-medium tracking-tight text-white leading-[1.1] sm:leading-[0.95] select-none break-words drop-shadow-[0_2px_8px_rgba(0,0,0,0.55)]">
            {activeCategories.map((cat, cIdx) => {
              const isActive = currentIndex === cIdx;
              return (
                <span key={cat.label} className="inline-block whitespace-nowrap">
                  <Link
                    href={cat.href}
                    onMouseEnter={() => setCurrentIndex(cIdx)}
                    className={`transition-colors duration-200 no-underline hover:no-underline ${
                      isActive
                        ? "text-[#396254]"
                        : "text-white hover:text-[#396254]"
                    }`}
                  >{cat.label}</Link>{cIdx < activeCategories.length - 1 && <span className="text-white/60 font-light select-none">/</span>}
                </span>
              );
            })}
          </div>

          {currentCategory && (
            <div className="mt-3 sm:mt-8 hidden sm:block">
              <Link
                href={currentCategory.href}
                className="inline-flex items-center gap-2 bg-[#396254] text-white hover:bg-[#2d4e44] px-8 sm:px-9 py-3.5 rounded-full text-xs sm:text-sm font-black font-heading uppercase tracking-wider transition-all hover:-translate-y-0.5 active:scale-95 shadow-lg hover:shadow-xl"
              >
                <span>Discover {currentCategory.label}</span>
                <span>&rarr;</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* 3. 8-Slide Pagination Dots (No arrow buttons) */}
      {total > 1 && (
        <div className="absolute bottom-2.5 sm:bottom-6 inset-x-0 z-30 flex items-center justify-center gap-1.5 sm:gap-2">
          {activeCategories.map((cat, idx) => {
            const isActive = idx === currentIndex;
            return (
              <button
                key={cat.label}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                onMouseEnter={() => setCurrentIndex(idx)}
                aria-label={`Go to slide ${idx + 1} (${cat.label})`}
                className={`transition-all duration-300 rounded-full ${
                  isActive
                    ? "w-6 sm:w-8 h-1.5 sm:h-2 bg-white"
                    : "w-1.5 sm:w-2 h-1.5 sm:h-2 bg-white/50 hover:bg-white/80"
                }`}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
