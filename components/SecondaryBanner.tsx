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

  // Real-Time Touch & Pointer Drag for Smartphones
  const [dragOffset, setDragOffset] = React.useState(0);
  const [isSwiping, setIsSwiping] = React.useState(false);

  const touchStartX = React.useRef(0);
  const touchStartY = React.useRef(0);
  const currentDrag = React.useRef(0);
  const isHorizontalSwipe = React.useRef<boolean | null>(null);
  const preventClick = React.useRef(false);
  const isMouseDown = React.useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1 || total <= 1) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    currentDrag.current = 0;
    isHorizontalSwipe.current = null;
    preventClick.current = false;
    setIsPaused(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length !== 1 || total <= 1) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - touchStartX.current;
    const diffY = currentY - touchStartY.current;

    // Determine direction after initial movement threshold (6px)
    if (isHorizontalSwipe.current === null) {
      if (Math.abs(diffX) > 6 || Math.abs(diffY) > 6) {
        isHorizontalSwipe.current = Math.abs(diffX) > Math.abs(diffY);
      }
    }

    // If horizontal swipe confirmed, drag slider in real time
    if (isHorizontalSwipe.current === true) {
      preventClick.current = true;
      setIsSwiping(true);
      currentDrag.current = diffX;
      setDragOffset(diffX);
    }
  };

  const handleTouchEnd = () => {
    setIsPaused(false);
    const diff = currentDrag.current;
    const threshold = 35; // px threshold to trigger slide change

    if (isHorizontalSwipe.current === true) {
      if (diff < -threshold) {
        nextSlide();
      } else if (diff > threshold) {
        prevSlide();
      }
    }

    setIsSwiping(false);
    setDragOffset(0);
    currentDrag.current = 0;
    isHorizontalSwipe.current = null;

    // Suppress link clicks briefly after sliding
    setTimeout(() => {
      preventClick.current = false;
    }, 150);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || total <= 1) return;
    isMouseDown.current = true;
    touchStartX.current = e.clientX;
    touchStartY.current = e.clientY;
    currentDrag.current = 0;
    isHorizontalSwipe.current = null;
    preventClick.current = false;
    setIsPaused(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDown.current || total <= 1) return;
    const diffX = e.clientX - touchStartX.current;
    const diffY = e.clientY - touchStartY.current;

    if (isHorizontalSwipe.current === null) {
      if (Math.abs(diffX) > 6 || Math.abs(diffY) > 6) {
        isHorizontalSwipe.current = Math.abs(diffX) > Math.abs(diffY);
      }
    }

    if (isHorizontalSwipe.current === true) {
      preventClick.current = true;
      setIsSwiping(true);
      currentDrag.current = diffX;
      setDragOffset(diffX);
    }
  };

  const handleMouseUp = () => {
    if (!isMouseDown.current) return;
    isMouseDown.current = false;
    handleTouchEnd();
  };

  // Auto-advance slides every 6 seconds when not paused
  React.useEffect(() => {
    if (isPaused || total <= 1) return;
    const interval = setInterval(() => {
      nextSlide();
    }, 6000);
    return () => clearInterval(interval);
  }, [isPaused, nextSlide, total]);

  if (!activeSlides || activeSlides.length === 0) return null;

  return (
    <section
      aria-label="Promotional Secondary Banner"
      className="relative w-full h-[60vh] min-h-[420px] max-h-[580px] sm:h-[92vh] sm:min-h-[700px] sm:max-h-[1050px] overflow-hidden bg-neutral-900 select-none group touch-pan-y cursor-grab active:cursor-grabbing"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => {
        setIsPaused(false);
        if (isMouseDown.current) handleMouseUp();
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClickCapture={(e) => {
        if (preventClick.current) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
    >
      {/* 1. Horizontal Sliding Track with Real-Time Drag Translation */}
      <div
        className="flex h-full w-full select-none"
        style={{
          transform: `translateX(calc(-${currentIndex * 100}% + ${dragOffset}px))`,
          transition: isSwiping ? "none" : "transform 500ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {activeSlides.map((slide, idx) => (
          <div
            key={slide.id}
            className="relative h-full w-full flex-shrink-0 bg-neutral-900"
            aria-hidden={idx !== currentIndex}
          >
            {/* 1. Desktop Image (Wide 16:9 / 21:9 - displayed on PC/Laptop) */}
            <div className="relative h-full w-full hidden sm:block">
              <Image
                src={slide.image}
                alt={`${slide.title} Desktop Banner`}
                fill
                priority={idx === 0}
                sizes="100vw"
                draggable={false}
                className="object-cover object-center pointer-events-none select-none"
              />
            </div>

            {/* 2. Mobile Image (Portrait 4:5 / 1:1 - displayed on Smartphone / HP) */}
            <div className="relative h-full w-full block sm:hidden">
              <Image
                src={slide.mobileImage || slide.image}
                alt={`${slide.title} Mobile Banner`}
                fill
                priority={idx === 0}
                sizes="100vw"
                draggable={false}
                className="object-cover object-center pointer-events-none select-none"
              />
            </div>

            {/* Slide Content (Centered Editorial Style) */}
            <div className="absolute inset-0 z-20 pointer-events-none flex flex-col items-center justify-center text-center px-4 sm:px-12 max-w-5xl mx-auto space-y-1 sm:space-y-5">
              {slide.ctaLink ? (
                <Link
                  href={slide.ctaLink}
                  className="group/title pointer-events-auto block text-lg sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.65)] leading-tight transition-colors duration-200 hover:text-[#396254]"
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
                <div className="pt-0.5 sm:pt-2 pointer-events-auto">
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
          {/* Mobile Arrows: visible on HP */}
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

          {/* Desktop Arrows */}
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

      {/* Pagination Dots (Supports any number of slides) */}
      {total > 1 && (
        <div className="absolute bottom-2.5 sm:bottom-6 inset-x-0 z-30 flex items-center justify-center gap-1.5 sm:gap-2 pointer-events-auto">
          {activeSlides.map((s, idx) => {
            const isActive = idx === currentIndex;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                aria-label={`Go to slide ${idx + 1}`}
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
