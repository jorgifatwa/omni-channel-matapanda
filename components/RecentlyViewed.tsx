"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { type StorefrontProduct } from "@/lib/data-fetcher";

const STORAGE_KEY = "zodiac_recently_viewed_v1";

interface RecentlyViewedProps {
  currentProduct: StorefrontProduct;
}

export default function RecentlyViewed({ currentProduct }: RecentlyViewedProps) {
  const [recentProducts, setRecentProducts] = React.useState<StorefrontProduct[]>([]);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined" || !currentProduct?.id) return;

    try {
      const storedRaw = window.localStorage.getItem(STORAGE_KEY);
      let list: StorefrontProduct[] = storedRaw ? JSON.parse(storedRaw) : [];

      // Filter out invalid items or duplicates of current product
      list = list.filter((p) => p && p.id && p.id !== currentProduct.id);

      // Set items to display (before adding currentProduct)
      setRecentProducts(list);

      // Save updated list with currentProduct at the front (max 10)
      const updatedList = [currentProduct, ...list].slice(0, 10);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
    } catch (err) {
      console.warn("Could not read/write recently viewed products:", err);
    }
  }, [currentProduct]);

  const checkScroll = React.useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  }, []);

  React.useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [checkScroll, recentProducts]);

  const handleScroll = (direction: "left" | "right") => {
    const el = containerRef.current;
    if (!el) return;
    const scrollAmount = Math.max(260, el.clientWidth * 0.7);
    el.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  if (!recentProducts || recentProducts.length === 0) return null;

  return (
    <section aria-label="Recently Viewed Products" className="w-full mt-20 pt-12 border-t border-neutral-200 dark:border-neutral-800">
      <div className="flex items-center justify-between mb-8">
        <div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold font-heading bg-[#dcf58d]/60 text-[#233a32] dark:bg-[#dcf58d]/20 dark:text-[#dcf58d] mb-2">
            <span>Jejak Eksplorasimu</span>
          </span>
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-neutral-900 dark:text-neutral-100 font-heading">
            Recently Viewed
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!canScrollLeft}
            onClick={() => handleScroll("left")}
            aria-label="Previous items"
            className="h-10 w-10 rounded-full border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 hover:border-[#396254] dark:hover:border-[#dcf58d] flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed shadow-xs"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={!canScrollRight}
            onClick={() => handleScroll("right")}
            aria-label="Next items"
            className="h-10 w-10 rounded-full border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 hover:border-[#396254] dark:hover:border-[#dcf58d] flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed shadow-xs"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        onScroll={checkScroll}
        className="overflow-x-auto scroll-smooth snap-x snap-mandatory scrollbar-none flex gap-4 sm:gap-6 pb-4"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {recentProducts.map((p) => (
          <div key={p.id} className="w-[220px] sm:w-[250px] md:w-[270px] shrink-0 snap-start">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </section>
  );
}
