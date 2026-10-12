"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { type StorefrontSeriesItem } from "@/lib/data-fetcher";
import { formatIDR } from "@/lib/products";

interface CompareSeriesSectionProps {
  seriesName?: string | null;
  seriesProducts?: StorefrontSeriesItem[];
  currentProductId: string;
}

export default function CompareSeriesSection({
  seriesName,
  seriesProducts,
  currentProductId,
}: CompareSeriesSectionProps) {
  if (!seriesProducts || seriesProducts.length === 0) {
    return null;
  }

  const title = seriesName
    ? `Compare ${seriesName}`
    : "Compare Product Series";

  return (
    <section
      data-testid="compare-series-section"
      className="mt-16 pt-12 border-t border-neutral-200 dark:border-neutral-800"
    >
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-8 gap-3">
        <div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold font-heading bg-[#d5c6ff]/40 text-[#396254] dark:bg-[#d5c6ff]/20 dark:text-[#d5c6ff] mb-2">
            <span>Series Comparison</span>
          </span>
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-neutral-900 dark:text-neutral-100 font-heading">
            {title}
          </h2>
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm">
          Bandingkan ukuran, dimensi fisik, dan kapasitas spesifik dalam satu lini seri.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {seriesProducts.map((item) => {
          const isCurrent = item.id === currentProductId || item.isCurrent;

          return (
            <div
              key={item.id}
              data-testid={`compare-card-${item.slug}`}
              className={`flex flex-col rounded-3xl border bg-white dark:bg-neutral-900 p-5 transition-all duration-300 shadow-sm ${
                isCurrent
                  ? "border-[#396254] dark:border-[#dcf58d] ring-2 ring-[#396254]/30 dark:ring-[#dcf58d]/30 shadow-md"
                  : "border-neutral-200 dark:border-neutral-800 hover:border-[#396254]/40 hover:-translate-y-1 hover:shadow-md"
              }`}
            >
              {/* Product Thumbnail & Badge */}
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-neutral-100 dark:bg-neutral-800 mb-4">
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 360px"
                  className="object-cover"
                />
                {isCurrent && (
                  <span className="absolute top-2.5 left-2.5 bg-[#396254] text-white dark:bg-[#dcf58d] dark:text-[#233a32] text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1 font-heading">
                    <Check className="h-3 w-3" />
                    Currently Viewing
                  </span>
                )}
              </div>

              {/* Title & Price */}
              <div className="space-y-1 mb-4">
                <h3 className="font-bold text-sm uppercase text-neutral-900 dark:text-neutral-100 font-heading line-clamp-1">
                  {item.name}
                </h3>
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm text-[#396254] dark:text-[#dcf58d] font-heading">
                    {formatIDR(item.discountPrice ?? item.price)}
                  </span>
                  {item.discountPrice && (
                    <span className="text-xs text-neutral-400 dark:text-neutral-500 line-through">
                      {formatIDR(item.price)}
                    </span>
                  )}
                </div>
              </div>

              {/* Technical Specifications Table */}
              <div className="space-y-2.5 text-xs border-t border-b border-neutral-100 dark:border-neutral-800 py-3.5 my-auto">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-neutral-500 dark:text-neutral-400 uppercase tracking-wider text-[11px] font-semibold shrink-0">
                    Dimensi
                  </span>
                  <span className="font-medium text-neutral-900 dark:text-neutral-100 text-right">
                    {item.dimensions || "-"}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-2">
                  <span className="text-neutral-500 dark:text-neutral-400 uppercase tracking-wider text-[11px] font-semibold shrink-0">
                    Berat
                  </span>
                  <span className="font-medium text-neutral-900 dark:text-neutral-100 text-right">
                    {item.weightGrams ? `${item.weightGrams}g` : "-"}
                  </span>
                </div>

                <div className="flex flex-col gap-1 pt-1">
                  <span className="text-neutral-500 dark:text-neutral-400 uppercase tracking-wider text-[11px] font-semibold">
                    Kapasitas &amp; Fit
                  </span>
                  <p className="text-neutral-700 dark:text-neutral-300 text-[11px] leading-relaxed italic">
                    {item.capacityNote || "-"}
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-4">
                {isCurrent ? (
                  <button
                    type="button"
                    disabled
                    className="w-full py-2.5 px-4 text-xs font-bold uppercase tracking-wider bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 rounded-full cursor-default text-center font-heading"
                  >
                    Sedang Dilihat
                  </button>
                ) : (
                  <Link
                    href={`/products/${item.slug}`}
                    className="w-full py-2.5 px-4 text-xs font-black uppercase tracking-wider bg-[#396254] text-white hover:bg-[#2e5044] dark:bg-[#dcf58d] dark:text-[#233a32] rounded-full transition-all duration-200 flex items-center justify-center gap-1.5 font-heading hover:-translate-y-0.5 active:scale-95 shadow-sm"
                  >
                    <span>Shop Now</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
