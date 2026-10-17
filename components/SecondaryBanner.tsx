"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface SecondarySlide {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  image: string;
  mobileImage?: string;
  ctaText?: string;
  ctaLink?: string;
}

const SECONDARY_SLIDES: SecondarySlide[] = [
  {
    id: "free-shipping-promo",
    title: "Free shipping",
    subtitle: "With minimum spend inclusive of custom duties and taxes",
    description: "Nikmati pengiriman gratis ke seluruh Indonesia untuk setiap pembelian koleksi it'smatapanda",
    image:
      "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=2000&q=85",
    ctaText: "Shop The Collection",
    ctaLink: "/new-arrivals",
  },
  {
    id: "everyday-carryalls",
    title: "Everyday carryalls",
    subtitle: "Lightweight, water-resistant & made for modern living",
    description: "Eksplorasi koleksi tas fungsional dengan palet warna vibran dan material premium tahan air",
    image:
      "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=2000&q=85",
    ctaText: "Explore Bags",
    ctaLink: "/categories/bags-totes",
  },
  {
    id: "colourblock-series",
    title: "Colourblock Series",
    subtitle: "Playful tones designed for your everyday adventures",
    description: "Temukan perpaduan warna kontras yang ceria dan material nilon tahan lama khas it'smatapanda",
    image:
      "https://images.unsplash.com/photo-1575032617751-6ddec2089882?auto=format&fit=crop&w=2000&q=85",
    ctaText: "Discover Colours",
    ctaLink: "/categories/bags-totes",
  },
  {
    id: "urban-utility",
    title: "Urban Utility",
    subtitle: "Modular pouches, straps & versatile commuter bags",
    description: "Aksesoris modular dan tas kompartemen praktis untuk aktivitas harianmu yang dinamis",
    image:
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=2000&q=85",
    ctaText: "Shop Urban Gear",
    ctaLink: "/categories/backpacks",
  },
];

import { type AdminBannerItem } from "@/lib/banner-store";

interface SecondaryBannerProps {
  banners?: AdminBannerItem[];
  slides?: SecondarySlide[];
}

export default function SecondaryBanner({
  banners,
  slides = SECONDARY_SLIDES,
}: SecondaryBannerProps) {
  const activeSlides: SecondarySlide[] = React.useMemo(() => {
    if (banners && banners.length > 0) {
      return banners.map((b) => ({
        id: b.id,
        title: b.title,
        subtitle: b.subtitle || undefined,
        description: b.description || undefined,
        image: b.imageUrl,
        mobileImage: b.mobileImageUrl || undefined,
        ctaText: b.ctaText || undefined,
        ctaLink: b.ctaLink || undefined,
      }));
    }
    return slides;
  }, [banners, slides]);

  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [isPaused, setIsPaused] = React.useState(false);

  const total = activeSlides.length;

  const nextSlide = React.useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [total]);

  const prevSlide = React.useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  // Auto-advance slides every 6 seconds when not paused
  React.useEffect(() => {
    if (isPaused || total <= 1) return;
    const interval = setInterval(() => {
      nextSlide();
    }, 6000);
    return () => clearInterval(interval);
  }, [isPaused, nextSlide, total]);

  if (!activeSlides || activeSlides.length === 0) return null;

  const currentSlide = activeSlides[currentIndex] || activeSlides[0];
  const hasMobileImage = Boolean(currentSlide?.mobileImage);

  return (
    <section
      aria-label="Promotional Secondary Banner"
      className={`relative w-full ${
        hasMobileImage
          ? "h-[50vh] min-h-[350px] max-h-[500px] sm:h-[92vh] sm:min-h-[700px] sm:max-h-[1050px]"
          : "aspect-[16/9] sm:aspect-auto sm:h-[92vh] sm:min-h-[700px] max-h-[400px] sm:max-h-[1050px]"
      } overflow-hidden bg-neutral-100 dark:bg-neutral-900 select-none group`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* 1. Horizontal Sliding Track (Dynamic Unlimited Slides) */}
      <div
        className="flex h-full w-full transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{
          transform: `translateX(-${currentIndex * 100}%)`,
        }}
      >
        {activeSlides.map((slide, idx) => (
          <div
            key={slide.id}
            className="relative h-full w-full flex-shrink-0"
            aria-hidden={idx !== currentIndex}
          >
            {/* Desktop / Default Image */}
            <div className={`relative h-full w-full ${slide.mobileImage ? "hidden sm:block" : "block"}`}>
              <Image
                src={slide.image}
                alt={slide.title}
                fill
                priority={idx === 0}
                sizes="(min-width: 640px) 100vw, 100vw"
                className="object-cover object-center"
              />
            </div>

            {/* Mobile Specific Image (when provided) */}
            {slide.mobileImage && (
              <div className="relative h-full w-full block sm:hidden">
                <Image
                  src={slide.mobileImage}
                  alt={slide.title}
                  fill
                  priority={idx === 0}
                  sizes="100vw"
                  className="object-cover object-center"
                />
              </div>
            )}

            {/* Slide Content (Centered Editorial Style) */}
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center px-4 sm:px-12 max-w-5xl mx-auto space-y-1 sm:space-y-5">
              {slide.ctaLink ? (
                <Link
                  href={slide.ctaLink}
                  className="group/title block text-lg sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.65)] leading-tight transition-colors duration-200 hover:text-[#396254]"
                >
                  <h2>{slide.title}</h2>
                </Link>
              ) : (
                <h2 className="text-lg sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.65)] leading-tight transition-colors duration-200 hover:text-[#396254]">
                  {slide.title}
                </h2>
              )}
              {slide.subtitle && (
                <p className="text-[10px] sm:text-base md:text-lg font-medium tracking-wide text-white max-w-xs sm:max-w-2xl mx-auto drop-shadow-[0_1px_6px_rgba(0,0,0,0.7)] transition-colors duration-200 hover:text-[#396254]">
                  {slide.subtitle}
                </p>
              )}
              {slide.description && (
                <p className="text-xs sm:text-sm text-white max-w-lg mx-auto hidden sm:block drop-shadow-[0_1px_6px_rgba(0,0,0,0.7)] transition-colors duration-200 hover:text-[#396254]">
                  {slide.description}
                </p>
              )}
              {slide.ctaLink && slide.ctaText && (
                <div className="pt-0.5 sm:pt-2">
                  <Link
                    href={slide.ctaLink}
                    className="inline-flex items-center gap-1.5 bg-white text-black hover:bg-neutral-100 px-4 sm:px-8 py-1 sm:py-3.5 rounded-full text-[10px] sm:text-sm font-bold uppercase tracking-wider transition-all hover:scale-105 active:scale-95 shadow-lg"
                  >
                    <span>{slide.ctaText}</span>
                    <span>&rarr;</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Prev / Next Navigation Arrows */}
      {total > 1 && (
        <>
          <button
            type="button"
            onClick={prevSlide}
            aria-label="Previous Slide"
            className="hidden sm:flex absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 z-30 h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-xs items-center justify-center transition-all opacity-0 group-hover:opacity-100 hover:scale-110 shadow-lg"
          >
            <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
          <button
            type="button"
            onClick={nextSlide}
            aria-label="Next Slide"
            className="hidden sm:flex absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 z-30 h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-xs items-center justify-center transition-all opacity-0 group-hover:opacity-100 hover:scale-110 shadow-lg"
          >
            <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </>
      )}

      {/* Pagination Dots (Supports any number of slides) */}
      {total > 1 && (
        <div className="absolute bottom-2.5 sm:bottom-6 inset-x-0 z-30 flex items-center justify-center gap-1.5 sm:gap-2">
          {activeSlides.map((s, idx) => {
            const isActive = idx === currentIndex;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                aria-label={`Go to slide ${idx + 1}`}
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
