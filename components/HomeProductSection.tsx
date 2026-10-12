"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { type StorefrontProduct } from "@/lib/data-fetcher";

interface HomeProductSectionProps {
  title: string;
  bannerBg: string;
  bannerTextColor?: string;
  shopMoreHref: string;
  shopMoreLabel?: string;
  shopMoreBg?: string;
  shopMoreTextColor?: string;
  products: StorefrontProduct[];
  showNewBadge?: boolean;
}

export default function HomeProductSection({
  title,
  bannerBg,
  bannerTextColor = "text-white",
  shopMoreHref,
  shopMoreLabel = "Shop More",
  shopMoreBg = "bg-[#dcf58d]",
  shopMoreTextColor = "text-[#396254]",
  products,
  showNewBadge = false,
}: HomeProductSectionProps) {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(true);

  const checkScroll = React.useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 25);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 25);
  }, []);

  React.useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) {
      el.scrollLeft = 0;
    }
    checkScroll();
    const timer = setTimeout(checkScroll, 100);
    window.addEventListener("resize", checkScroll);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll, products]);

  const handleScroll = (direction: "left" | "right") => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const scrollAmount = Math.max(300, el.clientWidth * 0.75);
    el.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  if (!products || products.length === 0) return null;

  return (
    <section className="w-full bg-[#fafaf8] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 m-0 p-0 border-0 transition-colors duration-200">
      {/* 1. Colored Section Header Banner (Playful Matapanda Banner) */}
      <div
        style={{ backgroundColor: bannerBg }}
        className="w-full py-6 sm:py-7 lg:py-8 min-h-[76px] sm:min-h-[92px] lg:min-h-[104px] px-4 sm:px-8 lg:px-12 flex items-center justify-between transition-colors"
      >
        <h2
          className={`text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight uppercase leading-none font-heading ${bannerTextColor}`}
        >
          {title}
        </h2>

        <Link
          href={shopMoreHref}
          className={`${shopMoreBg} ${shopMoreTextColor} hover:opacity-90 rounded-full px-5 sm:px-7 py-2.5 sm:py-3.5 text-xs sm:text-sm font-bold font-heading uppercase tracking-wider inline-flex items-center gap-2 transition-all hover:-translate-y-0.5 active:scale-95 shadow-md shrink-0`}
        >
          <span>{shopMoreLabel}</span>
          <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </Link>
      </div>

      {/* 2. Horizontal Scrollable Product Carousel */}
      <div className="relative group/carousel">
        {/* Left Scroll Arrow */}
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => handleScroll("left")}
            aria-label="Scroll left"
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-white/95 dark:bg-neutral-800/95 hover:bg-white dark:hover:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-lg border border-neutral-200 dark:border-neutral-700 flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}

        {/* Right Scroll Arrow */}
        {canScrollRight && (
          <button
            type="button"
            onClick={() => handleScroll("right")}
            aria-label="Scroll right"
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-white/95 dark:bg-neutral-800/95 hover:bg-white dark:hover:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-lg border border-neutral-200 dark:border-neutral-700 flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}

        {/* Horizontal Container */}
        <div
          ref={scrollContainerRef}
          onScroll={checkScroll}
          className="overflow-x-auto scroll-smooth snap-x snap-mandatory scrollbar-none flex gap-4 sm:gap-6 py-6 sm:py-8 px-4 sm:px-8 lg:px-12 scroll-pl-4 sm:scroll-pl-8 lg:scroll-pl-12"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {products.map((product, idx) => (
            <div
              key={product.id || idx}
              className="w-[180px] sm:w-[210px] md:w-[230px] lg:w-[245px] shrink-0 snap-start"
            >
              <ProductCard
                product={product}
                priority={idx < 4}
                showNewBadge={showNewBadge}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
