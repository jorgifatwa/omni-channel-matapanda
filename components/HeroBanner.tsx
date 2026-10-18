"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
  // If dynamic banners provided from admin / database, convert to category links
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

  const prevSlide = React.useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  // Touch Swipe Gesture for Smartphones
  const touchStartX = React.useRef<number>(0);
  const touchStartY = React.useRef<number>(0);
  const isSwiping = React.useRef<boolean>(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      isSwiping.current = true;
      setIsPaused(true);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isSwiping.current) return;
    isSwiping.current = false;
    setIsPaused(false);

    if (e.changedTouches.length === 1) {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const diffX = touchStartX.current - endX;
      const diffY = touchStartY.current - endY;

      // Threshold: 25px horizontal and predominantly horizontal movement
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 25) {
        if (diffX > 0) {
          nextSlide();
        } else {
          prevSlide();
        }
      }
    }
  };

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

  return (
    <section
      aria-label="Featured Hero Banner"
      className="relative w-full h-[75vh] min-h-[500px] max-h-[720px] sm:h-[92vh] sm:min-h-[700px] sm:max-h-[1050px] overflow-hidden bg-neutral-950 select-none group touch-pan-y"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 1. Horizontal Sliding Track */}
      <div
        className="flex h-full w-full transition-transform duration-700 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]"
        style={{
          transform: `translateX(-${currentIndex * 100}%)`,
        }}
      >
        {activeCategories.map((cat, idx) => (
          <div
            key={cat.label}
            className="relative h-full w-full flex-shrink-0 bg-neutral-900"
            aria-hidden={idx !== currentIndex}
          >
            {/* 1. Desktop Image (Wide 16:9 / 21:9 - displayed on PC/Laptop) */}
            <div className="relative h-full w-full hidden sm:block">
              <Image
                src={cat.image}
                alt={`${cat.label} Desktop Banner`}
                fill
                priority={idx === 0}
                sizes="100vw"
                className="object-cover object-center"
              />
            </div>

            {/* 2. Mobile Image (Portrait 4:5 / 1:1 - displayed on Smartphone / HP) */}
            <div className="relative h-full w-full block sm:hidden">
              <Image
                src={cat.mobileImage || cat.image}
                alt={`${cat.label} Mobile Banner`}
                fill
                priority={idx === 0}
                sizes="100vw"
                className="object-cover object-center"
              />
            </div>
          </div>
        ))}
      </div>

      {/* 2. Content Overlay (Fixed on Top: Editorial Category Links & CTA) */}
      <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between">
        {/* Editorial Top Categories Typography */}
        <div className="w-full pt-3 sm:pt-6 md:pt-8 px-3 sm:px-8 lg:px-12 text-left pointer-events-none">
          <div className="max-w-6xl lg:max-w-7xl text-lg sm:text-6xl md:text-7xl lg:text-[5rem] xl:text-[6.2rem] 2xl:text-[7.2rem] font-medium tracking-tight text-white leading-[1.1] sm:leading-[0.95] select-none break-words drop-shadow-[0_2px_8px_rgba(0,0,0,0.65)] pointer-events-none">
            {activeCategories.map((cat, cIdx) => {
              const isActive = currentIndex === cIdx;
              return (
                <span key={cat.label} className="inline-block whitespace-nowrap pointer-events-auto">
                  <Link
                    href={cat.href}
                    onClick={() => setCurrentIndex(cIdx)}
                    className={`transition-colors duration-200 no-underline hover:no-underline ${
                      isActive
                        ? "text-[#396254]"
                        : "text-white hover:text-[#396254]"
                    }`}
                  >{cat.label}</Link>{cIdx < activeCategories.length - 1 && <span className="text-white/60 font-light select-none pointer-events-none">/</span>}
                </span>
              );
            })}
          </div>

          {currentCategory && (
            <div className="mt-3 sm:mt-8 block pointer-events-auto">
              <Link
                href={currentCategory.href}
                className="inline-flex items-center gap-2 bg-[#396254] text-white hover:bg-[#2d4e44] px-5 sm:px-9 py-2.5 sm:py-3.5 rounded-full text-xs sm:text-sm font-bold sm:font-black font-heading uppercase tracking-wider transition-all hover:-translate-y-0.5 active:scale-95 shadow-lg hover:shadow-xl"
              >
                <span>Discover {currentCategory.label}</span>
                <span>&rarr;</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* 3. Navigation Controls (Arrows for Mobile & Desktop) */}
      {total > 1 && (
        <>
          {/* Mobile Arrows: Always visible on HP, semi-transparent */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              prevSlide();
            }}
            aria-label="Previous Slide"
            className="flex sm:hidden absolute left-2.5 top-1/2 -translate-y-1/2 z-30 h-8 w-8 rounded-full bg-black/45 text-white backdrop-blur-xs items-center justify-center active:scale-90 transition-transform shadow-md"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              nextSlide();
            }}
            aria-label="Next Slide"
            className="flex sm:hidden absolute right-2.5 top-1/2 -translate-y-1/2 z-30 h-8 w-8 rounded-full bg-black/45 text-white backdrop-blur-xs items-center justify-center active:scale-90 transition-transform shadow-md"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* Desktop Arrows: Hover on laptop/PC */}
          <button
            type="button"
            onClick={prevSlide}
            aria-label="Previous Slide"
            className="hidden sm:flex absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 z-30 h-11 w-11 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-xs items-center justify-center transition-all opacity-0 group-hover:opacity-100 hover:scale-110 shadow-lg cursor-pointer"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={nextSlide}
            aria-label="Next Slide"
            className="hidden sm:flex absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 z-30 h-11 w-11 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-xs items-center justify-center transition-all opacity-0 group-hover:opacity-100 hover:scale-110 shadow-lg cursor-pointer"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      {/* 4. Slide Pagination Dots */}
      {total > 1 && (
        <div className="absolute bottom-3 sm:bottom-6 inset-x-0 z-30 flex items-center justify-center gap-1.5 sm:gap-2 pointer-events-auto">
          {activeCategories.map((cat, idx) => {
            const isActive = idx === currentIndex;
            return (
              <button
                key={cat.label}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                aria-label={`Go to slide ${idx + 1} (${cat.label})`}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  isActive
                    ? "w-6 sm:w-8 h-1.5 sm:h-2 bg-white shadow-sm"
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
