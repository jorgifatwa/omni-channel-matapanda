"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  SlidersHorizontal,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Check,
  RotateCcw,
} from "lucide-react";
import { type StorefrontProduct } from "@/lib/data-fetcher";
import ProductCard from "@/components/ProductCard";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type SortOption =
  | "featured"
  | "price-asc"
  | "price-desc"
  | "name-asc"
  | "name-desc";

type ProductGridProps = {
  title: string;
  subtitle?: string;
  breadcrumb?: string;
  logoUrl?: string | null;
  description?: string;
  products: StorefrontProduct[];
  itemsPerPage?: number;
  showCampaignTiles?: boolean;
  showNewBadge?: boolean;
};

// Campaign lifestyle editorial tiles for New In collection grid
const CAMPAIGN_TILES = [
  {
    id: "campaign-picnic",
    title: "EVERYDAY CARRY",
    subtitle: "Functional Tote & Sling Bags",
    image:
      "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1000&q=85",
    link: "/categories/tote-bags",
  },
  {
    id: "campaign-trail",
    title: "DUMPLING SERIES",
    subtitle: "Lightweight Water-Resistant Nylon",
    image:
      "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=1000&q=85",
    link: "/categories/sling-crossbody",
  },
];

export default function ProductGrid({
  title,
  subtitle,
  breadcrumb,
  logoUrl,
  description,
  products,
  itemsPerPage = 18,
  showCampaignTiles = true,
  showNewBadge = true,
}: ProductGridProps) {
  const [currentPage, setCurrentPage] = React.useState(1);
  const [sortOption, setSortOption] = React.useState<SortOption>("featured");
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all");
  const [selectedColor, setSelectedColor] = React.useState<string>("all");
  const [inStockOnly, setInStockOnly] = React.useState<boolean>(false);
  const [filterOpen, setFilterOpen] = React.useState<boolean>(false);
  const [sortOpen, setSortOpen] = React.useState<boolean>(false);

  const gridContainerRef = React.useRef<HTMLDivElement>(null);

  // Extract distinct categories & colors from current products pool
  const categoriesList = React.useMemo(() => {
    const set = new Map<string, string>();
    for (const p of products) {
      if (p.category?.name) {
        set.set(p.category.slug || p.category.name.toLowerCase(), p.category.name);
      }
    }
    return Array.from(set.entries()).map(([slug, name]) => ({ slug, name }));
  }, [products]);

  const colorsList = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const p of products) {
      for (const v of p.variants || []) {
        if (v.color) {
          const key = v.color.trim();
          if (!map.has(key.toLowerCase())) {
            map.set(key.toLowerCase(), v.colorHex || "#111111");
          }
        }
      }
    }
    return Array.from(map.entries()).map(([name, hex]) => ({ name, hex }));
  }, [products]);

  // Apply Filtering
  const filteredProducts = React.useMemo(() => {
    return products.filter((p) => {
      // Category filter
      if (selectedCategory !== "all") {
        const catSlug = p.category?.slug || p.category?.name?.toLowerCase();
        if (catSlug !== selectedCategory) return false;
      }

      // Color filter
      if (selectedColor !== "all") {
        const hasColor = p.variants?.some(
          (v) => v.color?.toLowerCase() === selectedColor.toLowerCase()
        );
        if (!hasColor) return false;
      }

      // Stock filter
      if (inStockOnly && p.stock === 0) {
        return false;
      }

      return true;
    });
  }, [products, selectedCategory, selectedColor, inStockOnly]);

  // Apply Sorting
  const sortedProducts = React.useMemo(() => {
    const list = [...filteredProducts];
    switch (sortOption) {
      case "price-asc":
        return list.sort((a, b) => {
          const priceA = a.discountPrice ?? a.price;
          const priceB = b.discountPrice ?? b.price;
          return priceA - priceB;
        });
      case "price-desc":
        return list.sort((a, b) => {
          const priceA = a.discountPrice ?? a.price;
          const priceB = b.discountPrice ?? b.price;
          return priceB - priceA;
        });
      case "name-asc":
        return list.sort((a, b) => a.name.localeCompare(b.name));
      case "name-desc":
        return list.sort((a, b) => b.name.localeCompare(a.name));
      case "featured":
      default:
        return list;
    }
  }, [filteredProducts, sortOption]);

  // Active filter count
  const activeFilterCount =
    (selectedCategory !== "all" ? 1 : 0) +
    (selectedColor !== "all" ? 1 : 0) +
    (inStockOnly ? 1 : 0);

  const resetFilters = () => {
    setSelectedCategory("all");
    setSelectedColor("all");
    setInStockOnly(false);
    setCurrentPage(1);
  };

  // Pagination calculation
  const effectiveItemsPerPage = showCampaignTiles && currentPage === 1 ? itemsPerPage - 2 : itemsPerPage;
  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / effectiveItemsPerPage));

  // Reset to page 1 if filters reduce total pages
  React.useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  const startIndex = (currentPage - 1) * effectiveItemsPerPage;
  const currentProducts = sortedProducts.slice(startIndex, startIndex + effectiveItemsPerPage);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    if (typeof window !== "undefined") {
      const el = gridContainerRef.current;
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY - 100;
        window.scrollTo({ top, behavior: "smooth" });
      }
    }
  };

  const breadcrumbText = breadcrumb || `HOME / ${title.toUpperCase()}`;

  const sortLabels: Record<SortOption, string> = {
    featured: "Featured (Newest)",
    "price-asc": "Price: Low to High",
    "price-desc": "Price: High to Low",
    "name-asc": "Alphabetical: A-Z",
    "name-desc": "Alphabetical: Z-A",
  };

  return (
    <div
      ref={gridContainerRef}
      className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-24"
    >
      {/* 1. Header & Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 sm:mb-10 pb-4 border-b border-neutral-100">
        {/* Left: Breadcrumbs & Title */}
        <div className="space-y-2">
          {/* Breadcrumb */}
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-2 text-[11px] font-bold text-neutral-400 uppercase tracking-wider"
          >
            <Link href="/" className="hover:text-[#396254] transition-colors">
              HOME
            </Link>
            <span>/</span>
            <span className="text-[#396254] font-bold">
              {breadcrumbText.replace(/^HOME\s*\/\s*/i, "")}
            </span>
          </nav>

          <div className="flex flex-wrap items-center gap-3">
            {logoUrl && (
              <div className="relative h-10 w-10 sm:h-11 sm:w-11 rounded-2xl overflow-hidden border border-neutral-200/90 bg-neutral-50 shadow-xs shrink-0">
                <Image
                  src={logoUrl}
                  alt={title}
                  fill
                  sizes="44px"
                  className="object-cover"
                />
              </div>
            )}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-black uppercase">
              {title}
            </h1>
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#d5c6ff] text-[#396254] text-xs font-black uppercase tracking-wider shadow-xs">
              <span>{subtitle || `${products.length} Items`}</span>
            </span>
          </div>

          {description && (
            <p className="text-xs sm:text-sm text-neutral-600 max-w-xl font-medium leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {/* Right: Filter & Sort Pill Buttons */}
        <div className="flex items-center gap-2.5 self-start md:self-end shrink-0">
          {/* Filter Sheet Trigger Button */}
          <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Open filter options"
                className={`h-10 sm:h-11 px-5 sm:px-6 rounded-full border text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all hover:-translate-y-0.5 active:scale-95 cursor-pointer ${
                  activeFilterCount > 0
                    ? "border-[#396254] bg-[#396254] text-white shadow-md"
                    : "border-neutral-200 bg-white text-neutral-900 hover:border-black hover:bg-neutral-50 shadow-xs"
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>Filter</span>
                {activeFilterCount > 0 && (
                  <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-[#dcf58d] text-[#396254] text-[10px] font-black flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </SheetTrigger>

            <SheetContent
              side="right"
              className="w-full sm:max-w-md bg-white text-black p-0 flex flex-col justify-between rounded-l-3xl shadow-2xl border-l border-neutral-200"
            >
              <div className="p-6 sm:p-7 overflow-y-auto flex-1 space-y-7">
                <SheetHeader className="pb-4 border-b border-neutral-100 flex flex-row items-center justify-between text-left space-y-0">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-[#d5c6ff] text-[#396254]">
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                    </span>
                    <SheetTitle className="text-lg font-black tracking-tight uppercase">
                      Filter Your Vibe
                    </SheetTitle>
                  </div>
                  {activeFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="text-xs text-neutral-500 hover:text-red-600 font-bold flex items-center gap-1 transition-colors"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Reset</span>
                    </button>
                  )}
                </SheetHeader>

                {/* Filter 1: Category */}
                {categoriesList.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-neutral-900 flex items-center gap-1.5">
                      <span>Category</span>
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCategory("all");
                          setCurrentPage(1);
                        }}
                        className={`h-8 px-4 rounded-full text-xs font-bold transition-all active:scale-95 ${
                          selectedCategory === "all"
                            ? "bg-[#396254] text-white shadow-xs"
                            : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                        }`}
                      >
                        All Categories
                      </button>
                      {categoriesList.map((cat) => (
                        <button
                          key={cat.slug}
                          type="button"
                          onClick={() => {
                            setSelectedCategory(
                              selectedCategory === cat.slug ? "all" : cat.slug
                            );
                            setCurrentPage(1);
                          }}
                          className={`h-8 px-4 rounded-full text-xs font-bold transition-all active:scale-95 ${
                            selectedCategory === cat.slug
                              ? "bg-[#396254] text-white shadow-xs"
                              : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                          }`}
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Filter 2: Colors */}
                {colorsList.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                      Colour
                    </h4>
                    <div className="flex flex-wrap gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedColor("all");
                          setCurrentPage(1);
                        }}
                        className={`h-8 px-3.5 rounded-full text-xs font-medium transition-all ${
                          selectedColor === "all"
                            ? "bg-black text-white"
                            : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                        }`}
                      >
                        All Colours
                      </button>
                      {colorsList.map((c) => {
                        const isSelected = selectedColor === c.name;
                        return (
                          <button
                            key={c.name}
                            type="button"
                            onClick={() => {
                              setSelectedColor(isSelected ? "all" : c.name);
                              setCurrentPage(1);
                            }}
                            className={`h-8 px-3 rounded-full text-xs font-medium flex items-center gap-2 border transition-all ${
                              isSelected
                                ? "border-black bg-neutral-900 text-white"
                                : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400"
                            }`}
                          >
                            <span
                              className="h-3.5 w-3.5 rounded-full border border-neutral-300 shrink-0"
                              style={{ backgroundColor: c.hex }}
                            />
                            <span className="capitalize">{c.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Filter 3: Availability */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                    Availability
                  </h4>
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={inStockOnly}
                      onChange={(e) => {
                        setInStockOnly(e.target.checked);
                        setCurrentPage(1);
                      }}
                      className="h-4 w-4 rounded border-neutral-300 text-black focus:ring-black"
                    />
                    <span className="text-xs font-medium text-neutral-800">
                      In Stock Only
                    </span>
                  </label>
                </div>
              </div>

              {/* Bottom Action in Drawer */}
              <div className="p-5 sm:p-6 border-t border-neutral-100 bg-neutral-50/80 flex items-center gap-3">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="flex-1 h-11 rounded-full border border-neutral-200 bg-white text-neutral-800 text-xs font-bold uppercase tracking-wider hover:bg-neutral-100 transition-all active:scale-95 cursor-pointer"
                >
                  Clear All
                </button>
                <SheetClose asChild>
                  <button
                    type="button"
                    className="flex-1 h-11 rounded-full bg-[#396254] hover:bg-[#2b4c41] text-white text-xs font-bold uppercase tracking-wider transition-all hover:-translate-y-0.5 active:scale-95 shadow-sm cursor-pointer"
                  >
                    Apply ({filteredProducts.length})
                  </button>
                </SheetClose>
              </div>
            </SheetContent>
          </Sheet>

          {/* Sort Dropdown Menu */}
          <DropdownMenu open={sortOpen} onOpenChange={setSortOpen}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Sort products"
                className="h-10 sm:h-11 px-5 sm:px-6 rounded-full border border-neutral-200 bg-white text-neutral-900 hover:border-black hover:bg-neutral-50 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all hover:-translate-y-0.5 active:scale-95 shadow-xs cursor-pointer"
              >
                <ArrowUpDown className="h-3.5 w-3.5 text-neutral-500" />
                <span>Sort</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 bg-white border border-neutral-200/90 shadow-2xl p-1.5 rounded-2xl"
            >
              {(Object.keys(sortLabels) as SortOption[]).map((opt) => (
                <DropdownMenuItem
                  key={opt}
                  onClick={() => setSortOption(opt)}
                  className="flex items-center justify-between py-2.5 px-3 text-xs font-semibold cursor-pointer hover:bg-neutral-100 rounded-xl transition-colors"
                >
                  <span
                    className={
                      sortOption === opt ? "font-black text-[#396254]" : "text-neutral-700"
                    }
                  >
                    {sortLabels[opt]}
                  </span>
                  {sortOption === opt && (
                    <Check className="h-4 w-4 text-[#396254] stroke-[3]" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 2. Products Grid with Embedded Editorial Campaign Tiles */}
      {currentProducts.length === 0 ? (
        <div className="py-20 sm:py-24 flex flex-col items-center justify-center text-center bg-neutral-50/60 rounded-3xl border border-dashed border-neutral-200 p-8 sm:p-12 my-6">
          <div className="h-20 w-20 rounded-full bg-[#d5c6ff]/50 text-[#396254] flex items-center justify-center mb-4 shadow-sm">
            <RotateCcw className="h-8 w-8" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-neutral-900 mb-2">
            Belum Ada Produk yang Cocok
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 max-w-md mb-6 leading-relaxed">
            Filter kamu terlalu spesifik nih. Coba reset filter biar bisa lihat semua koleksi seru lainnya!
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center justify-center bg-[#396254] hover:bg-[#2b4c41] text-white px-7 py-3.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all hover:-translate-y-0.5 active:scale-95 shadow-sm cursor-pointer"
          >
            Reset Filter Sekarang
          </button>
        </div>
      ) : (
        <section
          aria-label={`${title} Products`}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 sm:gap-x-6 gap-y-10 sm:gap-y-12"
        >
          {currentProducts.map((product, index) => {
            const elements = [];

            // 1st Campaign Tile (Row 3, Col 1 on desktop: index 8 on Page 1)
            if (showCampaignTiles && currentPage === 1 && index === 8) {
              const tile1 = CAMPAIGN_TILES[0];
              elements.push(
                <div
                  key="campaign-tile-1"
                  className="group relative aspect-[4/5] w-full overflow-hidden bg-neutral-100 rounded-sm"
                >
                  <Image
                    src={tile1.image}
                    alt={tile1.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent flex flex-col justify-end p-4 sm:p-5 text-white">
                    <span className="text-[10px] sm:text-[11px] uppercase tracking-widest text-neutral-200 font-bold">
                      #it&apos;smatapanda
                    </span>
                    <h3 className="text-sm sm:text-base font-bold uppercase tracking-tight mt-0.5 leading-snug">
                      {tile1.title}
                    </h3>
                  </div>
                </div>
              );
            }

            // Standard Product Card
            elements.push(
              <ProductCard
                key={product.id}
                product={product}
                priority={index < 4}
                showNewBadge={showNewBadge}
              />
            );

            // 2nd Campaign Tile (Row 4, Col 4 on desktop: index 14 on Page 1)
            if (showCampaignTiles && currentPage === 1 && index === 14) {
              const tile2 = CAMPAIGN_TILES[1];
              elements.push(
                <div
                  key="campaign-tile-2"
                  className="group relative aspect-[4/5] w-full overflow-hidden bg-neutral-100 rounded-sm"
                >
                  <Image
                    src={tile2.image}
                    alt={tile2.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent flex flex-col justify-end p-4 sm:p-5 text-white">
                    <span className="text-[10px] sm:text-[11px] uppercase tracking-widest text-neutral-200 font-bold">
                      #it&apos;smatapanda
                    </span>
                    <h3 className="text-sm sm:text-base font-bold uppercase tracking-tight mt-0.5 leading-snug">
                      {tile2.title}
                    </h3>
                  </div>
                </div>
              );
            }

            return elements;
          })}
        </section>
      )}

      {/* 3. Centered Pill Pagination (Beyond The Vines Reference Style) */}
      {totalPages > 1 && (
        <div className="mt-16 sm:mt-20 flex justify-center">
          <nav
            aria-label="Pagination Navigation"
            className="inline-flex items-center rounded-full border border-neutral-200 bg-white px-4 py-2 shadow-sm text-xs font-bold gap-3 select-none hover:shadow-md transition-shadow"
          >
            <button
              type="button"
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              aria-label="Halaman Sebelumnya"
              className="p-1.5 rounded-full hover:bg-[#d5c6ff]/30 text-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-90 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4 stroke-[2.5]" />
            </button>

            <span className="text-[#396254] font-black px-2 tracking-wide">
              Page {currentPage} of {totalPages}
            </span>

            <button
              type="button"
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              aria-label="Halaman Selanjutnya"
              className="p-1.5 rounded-full hover:bg-[#d5c6ff]/30 text-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-90 cursor-pointer"
            >
              <ChevronRight className="h-4 w-4 stroke-[2.5]" />
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}
