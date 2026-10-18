"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Heart,
  Share2,
  Plus,
  Minus,
  Check,
  AlertCircle,
  Truck,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { type StorefrontProduct } from "@/lib/data-fetcher";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import CompareSeriesSection from "@/components/CompareSeriesSection";
import YouMayAlsoLike from "@/components/YouMayAlsoLike";
import RecentlyViewed from "@/components/RecentlyViewed";

interface ProductDetailViewProps {
  product: StorefrontProduct;
  relatedProducts?: StorefrontProduct[];
}

export default function ProductDetailView({
  product,
  relatedProducts = [],
}: ProductDetailViewProps) {
  const { addItem, formatPrice } = useCart();
  const { toggleWishlist, isWishlisted: checkIsWishlisted } = useWishlist();
  const isWishlisted = checkIsWishlisted(product.id);

  // Images
  const allImages =
    product.images && product.images.length > 0
      ? product.images
      : [
          {
            id: "default-img",
            url: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=85",
            isPrimary: true,
            sortOrder: 0,
          },
        ];

  const [activeImageIndex, setActiveImageIndex] = React.useState(0);
  const activeImage = allImages[activeImageIndex]?.url || allImages[0].url;

  // Zoom / Magnifier states
  const [isZoomed, setIsZoomed] = React.useState(false);
  const [zoomOrigin, setZoomOrigin] = React.useState({ x: 50, y: 50 });

  // Wishlist & Share toast feedback
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  const [justAdded, setJustAdded] = React.useState(false);
  const [loveAnimation, setLoveAnimation] = React.useState<"pop" | "deflate" | null>(null);

  // Group variants by colorGroup and distinct colors
  const colorMap = React.useMemo(() => {
    const map = new Map<
      string,
      { colorHex: string | null; colorGroup: string | null; sampleSku?: string }
    >();

    product.variants.forEach((v) => {
      if (v.color && !map.has(v.color)) {
        map.set(v.color, {
          colorHex: v.colorHex || null,
          colorGroup: v.colorGroup || null,
          sampleSku: v.sku || undefined,
        });
      }
    });

    return map;
  }, [product.variants]);

  const distinctColors = Object.fromEntries(colorMap.entries());
  const colorNames = Object.keys(distinctColors);

  // Group colors by colorGroup if present
  const colorGroups = React.useMemo(() => {
    const groups = new Map<string, string[]>();
    colorNames.forEach((cName) => {
      const gName = distinctColors[cName]?.colorGroup || "Colours";
      const existing = groups.get(gName) || [];
      existing.push(cName);
      groups.set(gName, existing);
    });
    return groups;
  }, [colorNames, distinctColors]);

  // Selected Color
  const [selectedColor, setSelectedColor] = React.useState<string>(
    colorNames[0] || product.variants[0]?.color || "Default"
  );

  // Available Sizes for the selected color
  const availableSizesForColor = React.useMemo(() => {
    // Unique sizes for this color
    const variantsForColor = product.variants.filter(
      (v) => v.color.toLowerCase() === selectedColor.toLowerCase()
    );

    if (variantsForColor.length > 0) {
      return variantsForColor.map((v) => ({
        size: v.size,
        stock: v.stock,
      }));
    }

    // Fallback: all sizes
    const map = new Map<string, number>();
    product.variants.forEach((v) => {
      const cur = map.get(v.size) ?? 0;
      map.set(v.size, cur + v.stock);
    });
    return Array.from(map.entries()).map(([size, stock]) => ({
      size,
      stock,
    }));
  }, [product.variants, selectedColor]);

  // Initial Size selection
  const [selectedSize, setSelectedSize] = React.useState<string>(() => {
    const firstInStock = availableSizesForColor.find((s) => s.stock > 0);
    return firstInStock ? firstInStock.size : availableSizesForColor[0]?.size ?? "One Size";
  });

  // When selectedColor changes, update selectedSize to in-stock variant if current size is out of stock
  React.useEffect(() => {
    const matching = availableSizesForColor.find((s) => s.size === selectedSize);
    if (!matching || matching.stock === 0) {
      const inStock = availableSizesForColor.find((s) => s.stock > 0);
      if (inStock) {
        setSelectedSize(inStock.size);
      } else if (availableSizesForColor[0]) {
        setSelectedSize(availableSizesForColor[0].size);
      }
    }
  }, [availableSizesForColor, selectedSize]);

  // Active Variant matching selectedSize & selectedColor
  const selectedVariant = React.useMemo(() => {
    const match = product.variants.find(
      (v) =>
        v.size.toLowerCase() === selectedSize.toLowerCase() &&
        v.color.toLowerCase() === selectedColor.toLowerCase()
    );
    if (match) return match;

    const sizeMatch = product.variants.find(
      (v) => v.size.toLowerCase() === selectedSize.toLowerCase()
    );
    if (sizeMatch) return sizeMatch;

    return product.variants[0] || null;
  }, [product.variants, selectedSize, selectedColor]);

  const currentStock = selectedVariant ? selectedVariant.stock : 0;
  const isOutOfStock = currentStock === 0;
  const isLowStock =
    !isOutOfStock &&
    currentStock > 0 &&
    currentStock <= (selectedVariant?.lowStockThreshold || product.lowStockThreshold || 5);

  const [quantity, setQuantity] = React.useState(1);
  const [validationError, setValidationError] = React.useState<string | null>(null);

  // Tabs state
  type TabKey = "details" | "shipping";
  const [activeTab, setActiveTab] = React.useState<TabKey>("details");

  const showSizeSelector =
    availableSizesForColor.length > 1 ||
    !["one size", "all size", "default", "-"].includes(
      availableSizesForColor[0]?.size?.toLowerCase() || ""
    );

  const displayPrice = product.discountPrice ?? product.price;

  // Zoom handling
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setZoomOrigin({ x, y });
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleWishlistToggle = () => {
    const isSoldOut = (product.stock ?? 0) === 0;
    const added = toggleWishlist({
      id: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      priceNumber: typeof product.price === "number" ? product.price : undefined,
      discountPrice: product.discountPrice ? String(product.discountPrice) : null,
      discountPriceNumber: typeof product.discountPrice === "number" ? product.discountPrice : undefined,
      image: activeImage,
      categoryName: product.category?.name || "Bag",
      inStock: !isSoldOut,
    });
    setLoveAnimation(added ? "pop" : "deflate");
    setTimeout(() => setLoveAnimation(null), 650);
    showToast(added ? "Ditambahkan ke Wishlist" : "Dihapus dari Wishlist");
  };

  const handleShare = async () => {
    if (typeof window !== "undefined") {
      try {
        await navigator.clipboard.writeText(window.location.href);
        showToast("Tautan produk berhasil disalin!");
      } catch {
        showToast("Gagal menyalin tautan.");
      }
    }
  };

  const handleColorSelect = (colorName: string) => {
    setSelectedColor(colorName);
    setValidationError(null);
    setQuantity(1);

    // Update active image to match newly selected color
    const variantWithColor = product.variants.find(
      (v) => v.color.toLowerCase() === colorName.toLowerCase() && v.image
    );
    if (variantWithColor?.image) {
      const idx = allImages.findIndex((img) => img.url === variantWithColor.image);
      if (idx !== -1) setActiveImageIndex(idx);
    } else {
      const cIdx = colorNames.indexOf(colorName);
      if (cIdx !== -1 && allImages[cIdx]) {
        setActiveImageIndex(cIdx);
      }
    }
  };

  const handleSizeSelect = (size: string, stock: number) => {
    if (stock === 0) return;
    setSelectedSize(size);
    setValidationError(null);
    setQuantity(1);
  };

  const handleQuantityChange = (newQty: number) => {
    if (newQty < 1) return;
    if (newQty > currentStock) {
      setValidationError(`Stok tidak mencukupi, sisa ${currentStock}`);
      setQuantity(currentStock);
      return;
    }
    setValidationError(null);
    setQuantity(newQty);
  };

  const handleAddToCart = () => {
    if (isOutOfStock) return;

    if (quantity > currentStock) {
      setValidationError(`Stok tidak mencukupi, sisa ${currentStock}`);
      return;
    }

    setValidationError(null);

    // Add item preserving ${productId}__${size}__${color} key
    addItem({
      productId: product.id,
      name: product.name,
      price: String(displayPrice),
      priceNumber: displayPrice,
      image: activeImage,
      size: selectedSize,
      color: selectedColor,
      quantity,
      maxStock: currentStock,
    });

    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2000);
  };

  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-14 pt-6 sm:pt-10 pb-20 select-none">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-black text-white text-xs font-semibold px-4 py-3 rounded shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-200">
          {toastMessage}
        </div>
      )}

      {/* 1. Breadcrumbs Navigation */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-2 text-xs text-neutral-400 dark:text-neutral-500 mb-6 sm:mb-8 uppercase tracking-wider flex-wrap font-heading font-semibold"
      >
        <Link href="/" className="hover:text-[#396254] dark:hover:text-[#dcf58d] transition-colors">
          Home
        </Link>
        <span>/</span>
        {product.category?.name && (
          <>
            <Link
              href={`/categories/${product.category.slug}`}
              className="hover:text-[#396254] dark:hover:text-[#dcf58d] transition-colors"
            >
              {product.category.name}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-neutral-900 dark:text-neutral-100 font-bold truncate max-w-[240px] sm:max-w-none">
          {product.name}
        </span>
      </nav>

      {/* 2. Main 2-Column Product Grid (Playful Matapanda Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-start">
        {/* Left Column: Product Image Gallery */}
        <div className="lg:col-span-7 space-y-4">
          {/* Main Photo with Cursor Magnifier */}
          <div
            onMouseEnter={() => setIsZoomed(true)}
            onMouseLeave={() => setIsZoomed(false)}
            onMouseMove={handleMouseMove}
            className="relative aspect-square sm:aspect-[4/5] w-full overflow-hidden bg-neutral-100 dark:bg-neutral-900 cursor-zoom-in rounded-3xl border-2 border-neutral-200/90 dark:border-neutral-800 shadow-sm"
          >
            <Image
              src={activeImage}
              alt={product.name}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 680px"
              style={{ transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%` }}
              className={`object-cover transition-transform duration-150 ease-out ${
                isZoomed ? "scale-[2.2]" : "scale-100"
              }`}
            />

            {/* Badges on Top-Left */}
            <div className="absolute top-3.5 left-3.5 z-10 flex flex-col gap-1.5 items-start">
              {product.isNewArrival && (
                <span className="inline-flex items-center bg-[#d5c6ff] text-[#396254] dark:bg-[#d5c6ff]/30 dark:text-[#d5c6ff] text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-sm font-heading">
                  <span>NEW</span>
                </span>
              )}
              {product.discountPrice && (
                <span className="inline-flex items-center bg-[#ED96D7] text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-sm font-heading">
                  <span>
                    {product.discount?.discountPercent
                      ? `-${product.discount.discountPercent}%`
                      : "SALE"}
                  </span>
                </span>
              )}
            </div>

            {/* Floating Top-Right Controls: Wishlist & Share in Frosted Pill */}
            <div className="absolute top-3.5 right-3.5 z-10 flex items-center gap-1 bg-white/85 dark:bg-neutral-900/85 backdrop-blur-md px-2 py-1 rounded-full border border-neutral-200/60 dark:border-neutral-800 shadow-sm">
              <button
                type="button"
                onClick={handleWishlistToggle}
                aria-label={isWishlisted ? "Hapus dari wishlist" : "Tambah ke wishlist"}
                className="relative p-1.5 text-neutral-800 dark:text-neutral-200 hover:text-black dark:hover:text-white transition-transform duration-200 hover:scale-110 active:scale-95 cursor-pointer"
              >
                {/* Burst shockwave ring (when popping/adding) */}
                {loveAnimation === "pop" && (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 m-auto h-6 w-6 rounded-full border-2 border-red-500 animate-heart-burst-ring"
                  />
                )}

                {/* Sparkles burst around the heart (when popping/adding) */}
                {loveAnimation === "pop" && (
                  <span aria-hidden="true" className="pointer-events-none absolute inset-0">
                    <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-red-500 animate-heart-sparkle-1 shadow-xs" />
                    <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-rose-400 animate-heart-sparkle-2 shadow-xs" />
                    <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-amber-400 animate-heart-sparkle-3 shadow-xs" />
                    <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-red-600 animate-heart-sparkle-4 shadow-xs" />
                    <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-pink-500 animate-heart-sparkle-5 shadow-xs" />
                    <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-orange-400 animate-heart-sparkle-6 shadow-xs" />
                  </span>
                )}

                {/* Floating mini heart ascending upwards (when popping/adding) */}
                {loveAnimation === "pop" && (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -top-1 left-1/2 animate-heart-float"
                  >
                    <Heart className="h-3 w-3 fill-red-500 text-red-500 drop-shadow-sm" />
                  </span>
                )}

                <Heart
                  className={`h-5 w-5 ${
                    loveAnimation === "pop"
                      ? "animate-heart-pop fill-red-600 text-red-600 drop-shadow-sm"
                      : loveAnimation === "deflate"
                      ? "animate-heart-deflate text-neutral-700 dark:text-neutral-300 stroke-[1.75]"
                      : isWishlisted
                      ? "fill-red-600 text-red-600 drop-shadow-sm"
                      : "text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white stroke-[1.75] drop-shadow-sm"
                  }`}
                />
              </button>
              <button
                type="button"
                onClick={handleShare}
                aria-label="Share product"
                className="p-1.5 text-neutral-800 dark:text-neutral-200 hover:text-black dark:hover:text-white transition-transform duration-200 hover:scale-110 active:scale-95"
              >
                <Share2 className="h-5 w-5 stroke-[1.75] text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white drop-shadow-sm" />
              </button>
            </div>
          </div>

          {/* Horizontal Thumbnails Strip (Compact & Scrollable for 10+ photos) */}
          {allImages.length > 1 && (
            <div className="flex items-center gap-2.5 overflow-x-auto pb-2 pt-1 scrollbar-none">
              {allImages.map((img, idx) => (
                <button
                  key={img.id || idx}
                  type="button"
                  onClick={() => setActiveImageIndex(idx)}
                  className={`relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 overflow-hidden rounded-2xl border-2 transition-all ${
                    activeImageIndex === idx
                      ? "border-[#396254] dark:border-[#dcf58d] shadow-md opacity-100 ring-2 ring-[#396254]/30 dark:ring-[#dcf58d]/30 scale-105"
                      : "border-neutral-200 dark:border-neutral-800 hover:border-[#396254]/50 opacity-60 hover:opacity-100"
                  }`}
                >
                  <Image
                    src={img.url}
                    alt={`${product.name} view ${idx + 1}`}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Product Details & Purchase Panel */}
        <div className="lg:col-span-5 flex flex-col space-y-6 pt-1">
          {/* Product Name */}
          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl lg:text-[34px] font-black uppercase text-neutral-900 dark:text-neutral-100 font-heading tracking-tight leading-tight">
              {product.name}
            </h1>
          </div>

          {/* Pricing */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-2xl sm:text-3xl font-black text-[#396254] dark:text-[#dcf58d] font-heading tracking-tight">
              {formatPrice(displayPrice)}
            </span>
            {product.discountPrice && (
              <span className="text-sm sm:text-base text-neutral-400 dark:text-neutral-500 line-through">
                {formatPrice(product.price)}
              </span>
            )}
            {product.discount?.discountPercent && (
              <span className="text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 px-2.5 py-0.5 rounded-full font-heading">
                Hemat {product.discount.discountPercent}%
              </span>
            )}
            <span className="text-xs text-neutral-400 dark:text-neutral-500 font-mono ml-auto">
              SKU: {selectedVariant?.sku || product.sku}
            </span>
          </div>

          <hr className="border-neutral-200 dark:border-neutral-800" />

          {/* Colours Section with Swatches & Color Groups */}
          {colorNames.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs sm:text-[13px]">
                <span className="font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-100 font-heading">
                  Colours:{" "}
                  <span className="inline-flex items-center ml-1 px-2.5 py-0.5 rounded-full bg-[#d5c6ff]/40 dark:bg-[#d5c6ff]/20 text-[#396254] dark:text-[#d5c6ff] font-bold text-xs font-sans">
                    {selectedColor}
                  </span>
                </span>
              </div>

              {/* Render by Color Groups if multiple groups exist, otherwise render flat */}
              {colorGroups.size > 1 ? (
                <div className="space-y-3">
                  {Array.from(colorGroups.entries()).map(([gName, colors]) => (
                    <div key={gName} className="space-y-1.5">
                      <p className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                        {gName}
                      </p>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        {colors.map((cName) => {
                          const hex = distinctColors[cName]?.colorHex;
                          const isSelected = selectedColor.toLowerCase() === cName.toLowerCase();
                          return (
                            <button
                              key={cName}
                              type="button"
                              onClick={() => handleColorSelect(cName)}
                              title={cName}
                              className={`h-7 w-7 rounded-full border border-neutral-300 dark:border-neutral-700 transition-all relative flex items-center justify-center cursor-pointer ${
                                isSelected
                                  ? "ring-2 ring-[#396254] dark:ring-[#dcf58d] ring-offset-2 scale-110 shadow-sm"
                                  : "hover:scale-105"
                              }`}
                              style={{
                                backgroundColor:
                                  hex ||
                                  (cName.toLowerCase().includes("white") ? "#ffffff" : "#111111"),
                              }}
                            >
                              {isSelected && (
                                <span className="sr-only">Selected {cName}</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2.5 flex-wrap">
                  {colorNames.map((cName) => {
                    const hex = distinctColors[cName]?.colorHex;
                    const isSelected = selectedColor.toLowerCase() === cName.toLowerCase();
                    return (
                      <button
                        key={cName}
                        type="button"
                        onClick={() => handleColorSelect(cName)}
                        title={cName}
                        className={`h-7 w-7 rounded-full border border-neutral-300 dark:border-neutral-700 transition-all relative flex items-center justify-center cursor-pointer ${
                          isSelected
                            ? "ring-2 ring-[#396254] dark:ring-[#dcf58d] ring-offset-2 scale-110 shadow-sm"
                            : "hover:scale-105"
                        }`}
                        style={{
                          backgroundColor:
                            hex ||
                            (cName.toLowerCase().includes("white") ? "#ffffff" : "#111111"),
                        }}
                      >
                        {isSelected && <span className="sr-only">Selected {cName}</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Sizes Section with Strikethrough for Out-of-Stock */}
          {showSizeSelector && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs sm:text-[13px]">
                <span className="font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-100 font-heading">
                  Size:{" "}
                  <span className="font-black text-[#396254] dark:text-[#dcf58d] ml-1">
                    {selectedSize}
                  </span>
                </span>
                {/* Stock Badge */}
                <div>
                  {isOutOfStock ? (
                    <span className="text-[11px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2.5 py-0.5 rounded-full uppercase tracking-wider font-heading">
                      Stok Habis
                    </span>
                  ) : isLowStock ? (
                    <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-full uppercase tracking-wider font-heading">
                      Sisa {currentStock} pcs
                    </span>
                  ) : (
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full font-bold font-heading">
                      Tersedia ({currentStock} pcs)
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {availableSizesForColor.map(({ size, stock }) => {
                  const isSelected = selectedSize.toLowerCase() === size.toLowerCase();
                  const isDisabled = stock === 0;

                  return (
                    <button
                      key={size}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => handleSizeSelect(size, stock)}
                      className={`min-w-[48px] h-9 px-3.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all border cursor-pointer ${
                        isDisabled
                          ? "border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800/40 text-neutral-300 dark:text-neutral-600 line-through cursor-not-allowed"
                          : isSelected
                          ? "border-[#396254] bg-[#396254] text-white dark:border-[#dcf58d] dark:bg-[#dcf58d] dark:text-[#233a32] shadow-sm font-heading font-black scale-105"
                          : "border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 hover:border-[#396254] dark:hover:border-[#dcf58d] active:scale-95"
                      }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity Stepper */}
          <div className="space-y-2 pt-1">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-100 font-heading block">
              Quantity
            </span>
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center border border-neutral-300 dark:border-neutral-700 rounded-full overflow-hidden h-10 bg-white dark:bg-neutral-800 shadow-xs">
                <button
                  type="button"
                  disabled={quantity <= 1 || isOutOfStock}
                  onClick={() => handleQuantityChange(quantity - 1)}
                  aria-label="Kurangi"
                  className="h-full px-3.5 text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="px-3 text-xs sm:text-sm font-bold text-neutral-900 dark:text-neutral-100 min-w-[32px] text-center font-mono">
                  {quantity}
                </span>
                <button
                  type="button"
                  disabled={quantity >= currentStock || isOutOfStock}
                  onClick={() => handleQuantityChange(quantity + 1)}
                  aria-label="Tambah"
                  className="h-full px-3.5 text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              {currentStock > 0 && (
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Maksimal {currentStock} item
                </span>
              )}
            </div>

            {validationError && (
              <p className="text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-1 pt-1">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{validationError}</span>
              </p>
            )}
          </div>

          {/* Full-width Playful "Add to Bag" Button */}
          <button
            type="button"
            disabled={isOutOfStock}
            onClick={handleAddToCart}
            className={`w-full py-4 px-6 rounded-full text-xs sm:text-sm font-black uppercase tracking-[0.16em] font-heading transition-all duration-300 flex items-center justify-center gap-2 shadow-md hover:shadow-lg cursor-pointer ${
              isOutOfStock
                ? "bg-neutral-200 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-600 cursor-not-allowed"
                : justAdded
                ? "bg-emerald-600 text-white animate-playful-bounce shadow-lg shadow-emerald-200"
                : "bg-[#396254] text-white hover:bg-[#2e5044] dark:bg-[#dcf58d] dark:text-[#233a32] dark:hover:bg-[#cbef6b] active:scale-95 hover:-translate-y-0.5"
            }`}
          >
            {isOutOfStock ? (
              <span>Out of Stock</span>
            ) : justAdded ? (
              <>
                <Check className="h-4 w-4" />
                <span>Added to Bag!</span>
              </>
            ) : (
              <span>Add to Bag</span>
            )}
          </button>

          {/* 3. Information Tabs */}
          <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800 space-y-4">
            {/* Pill Tab Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setActiveTab("details")}
                className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-full border font-heading transition-all cursor-pointer ${
                  activeTab === "details"
                    ? "bg-[#396254] text-white border-[#396254] dark:bg-[#dcf58d] dark:text-[#233a32] dark:border-[#dcf58d] shadow-xs"
                    : "bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700 hover:border-[#396254] dark:hover:border-[#dcf58d]"
                }`}
              >
                Product Details
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("shipping")}
                className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-full border font-heading transition-all cursor-pointer ${
                  activeTab === "shipping"
                    ? "bg-[#396254] text-white border-[#396254] dark:bg-[#dcf58d] dark:text-[#233a32] dark:border-[#dcf58d] shadow-xs"
                    : "bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700 hover:border-[#396254] dark:hover:border-[#dcf58d]"
                }`}
              >
                Shipping &amp; Returns
              </button>
            </div>

            {/* Tab Contents Card */}
            <div className="p-5 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 text-xs sm:text-[13px] text-neutral-700 dark:text-neutral-300 leading-relaxed shadow-xs">
              {activeTab === "details" && (
                <div className="space-y-3">
                  <p className="whitespace-pre-line">{product.description}</p>
                  <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 grid grid-cols-2 gap-2 text-neutral-500 dark:text-neutral-400 font-mono text-[11px]">
                    <div>
                      <span className="text-neutral-900 dark:text-neutral-100 font-semibold font-sans">SKU:</span>{" "}
                      {selectedVariant?.sku || product.sku}
                    </div>
                    <div>
                      <span className="text-neutral-900 dark:text-neutral-100 font-semibold font-sans">Berat:</span>{" "}
                      {product.weightGrams ? `${product.weightGrams}g` : "250g"}
                    </div>
                    {product.dimensions && (
                      <div>
                        <span className="text-neutral-900 dark:text-neutral-100 font-semibold font-sans">Dimensi:</span>{" "}
                        {product.dimensions}
                      </div>
                    )}
                    <div>
                      <span className="text-neutral-900 dark:text-neutral-100 font-semibold font-sans">Brand:</span>{" "}
                      {product.brand?.name}
                    </div>
                    <div>
                      <span className="text-neutral-900 dark:text-neutral-100 font-semibold font-sans">Kategori:</span>{" "}
                      {product.category?.name}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "shipping" && (
                <div className="space-y-3.5 text-neutral-600 dark:text-neutral-400">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-[#d5c6ff]/30 dark:bg-[#d5c6ff]/20 text-[#396254] dark:text-[#d5c6ff] shrink-0 mt-0.5">
                      <Truck className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider text-[11px] font-heading">
                        Pengiriman Seluruh Indonesia &amp; Internasional
                      </p>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                        Didukung oleh JNE, POS Indonesia, dan DHL Express. Nomor resi otomatis diperbarui setelah pesanan dikirim.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-[#dcf58d]/60 dark:bg-[#dcf58d]/20 text-[#233a32] dark:text-[#dcf58d] shrink-0 mt-0.5">
                      <RotateCcw className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider text-[11px] font-heading">
                        Kebijakan Pengembalian 7 Hari
                      </p>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                        Produk dapat ditukar atau dikembalikan dalam waktu 7 hari kerja sejak barang diterima dengan kondisi tag utuh dan belum dipakai.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-[#ED96D7]/30 dark:bg-[#ED96D7]/20 text-[#ED96D7] shrink-0 mt-0.5">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider text-[11px] font-heading">
                        Jaminan 100% Produk Asli
                      </p>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                        Semua item it&apos;smatapanda diproduksi dengan standar kontrol kualitas tinggi dan material teruji.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Compare Series Section (Conditional on product having productSeriesId) */}
      <CompareSeriesSection
        seriesName={product.productSeries?.name}
        seriesProducts={product.seriesProducts}
        currentProductId={product.id}
      />

      {/* 5. You May Also Like Recommendation Carousel */}
      <YouMayAlsoLike products={relatedProducts} />

      {/* 6. Recently Viewed Section */}
      <RecentlyViewed currentProduct={product} />
    </div>
  );
}
