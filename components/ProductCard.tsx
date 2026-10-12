"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, Check, Gift } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useQuickAdd } from "@/context/QuickAddContext";
import { useWishlist } from "@/context/WishlistContext";
import { type StorefrontProduct } from "@/lib/data-fetcher";
import { getProductBundleBadge, getProductGiftBadge } from "@/lib/discount-engine";

interface ProductCardProps {
  product: StorefrontProduct;
  priority?: boolean;
  onQuickAdd?: (product: StorefrontProduct) => void;
  showNewBadge?: boolean;
}

export default function ProductCard({
  product,
  priority = false,
  onQuickAdd,
  showNewBadge = false,
}: ProductCardProps) {
  const { addItem, formatPrice, activeDiscounts } = useCart();
  const { openQuickAdd } = useQuickAdd();
  const { toggleWishlist, isWishlisted: checkIsWishlisted } = useWishlist();
  const isWishlisted = checkIsWishlisted(product.id);
  const [wishlistToast, setWishlistToast] = React.useState(false);
  const [justAdded, setJustAdded] = React.useState(false);

  const giftBadge = React.useMemo(() => {
    return getProductGiftBadge(product.id, product.category?.id, activeDiscounts);
  }, [product.id, product.category?.id, activeDiscounts]);

  const bundleBadge = React.useMemo(() => {
    return getProductBundleBadge(product.id, product.category?.id, activeDiscounts);
  }, [product.id, product.category?.id, activeDiscounts]);
  const [loveAnimation, setLoveAnimation] = React.useState<"pop" | "deflate" | null>(null);

  // Hover color image state
  const [hoveredColorImage, setHoveredColorImage] = React.useState<string | null>(null);
  const [hoveredColorName, setHoveredColorName] = React.useState<string | null>(null);
  const [isColorAreaHovered, setIsColorAreaHovered] = React.useState(false);

  // Split hover zone state ("none" = default image 1, "left" = image 2, "right" = image 3)
  const [hoverZone, setHoverZone] = React.useState<"none" | "left" | "right">("none");

  const images = product.images && product.images.length > 0 ? product.images : [];
  const primaryImage =
    images.find((img) => img.isPrimary)?.url ||
    images[0]?.url ||
    "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=1200&q=85";
  const secondaryImage = images[1]?.url || primaryImage;
  const tertiaryImage = images[2]?.url || secondaryImage;

  const isSoldOut = product.stock === 0;
  const isLowStock =
    !isSoldOut && product.stock > 0 && product.stock <= (product.lowStockThreshold || 5);
  const displayPrice = product.discountPrice ?? product.price;

  // Extract distinct colors, hexes, and corresponding images for hover preview
  type ColorInfo = {
    name: string;
    hex: string | null;
    image: string;
  };

  const colorList: ColorInfo[] = React.useMemo(() => {
    const list: ColorInfo[] = [];
    const seen = new Set<string>();

    if (product.variants && product.variants.length > 0) {
      let imgIndex = 0;
      for (const v of product.variants) {
        if (v.color && !seen.has(v.color.toLowerCase())) {
          seen.add(v.color.toLowerCase());
          const assignedImage =
            v.image ||
            (product.images && product.images[imgIndex]?.url) ||
            primaryImage;

          list.push({
            name: v.color,
            hex: v.colorHex || null,
            image: assignedImage,
          });
          imgIndex++;
        }
      }
    }
    return list;
  }, [product.variants, product.images, primaryImage]);

  const firstColor = colorList[0]?.name || null;
  const hasMultipleColors = colorList.length > 1;

  // A product has selectable variants only if there are 2 or more variants to choose from
  const hasSelectableVariants = React.useMemo(() => {
    return (product.variants?.length ?? 0) > 1;
  }, [product.variants]);

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nextWishlisted = !isWishlisted;
    setLoveAnimation(nextWishlisted ? "pop" : "deflate");
    setTimeout(() => setLoveAnimation(null), 650);

    toggleWishlist({
      id: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      priceNumber: typeof product.price === "number" ? product.price : undefined,
      discountPrice: product.discountPrice ? String(product.discountPrice) : null,
      discountPriceNumber: typeof product.discountPrice === "number" ? product.discountPrice : undefined,
      image: primaryImage,
      categoryName: product.category?.name || "Bag",
      inStock: !isSoldOut,
    });
    setWishlistToast(true);
    setTimeout(() => setWishlistToast(false), 2000);
  };

  const handleAddToBag = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isSoldOut) return;

    // If product has selectable variants, open Quick-Add modal ("Select Option")
    if (hasSelectableVariants) {
      if (onQuickAdd) {
        onQuickAdd(product);
      } else {
        openQuickAdd(product);
      }
      return;
    }

    // Direct Add to Cart for non-variant products
    const selectedVariant = product.variants[0];

    addItem({
      productId: product.id,
      name: product.name,
      price: String(displayPrice),
      priceNumber: displayPrice,
      image: primaryImage,
      size: selectedVariant?.size || "One Size",
      color: selectedVariant?.color || "Default",
      quantity: 1,
      maxStock: selectedVariant?.stock ?? product.stock,
    });

    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1800);
  };

  return (
    <div
      onMouseLeave={() => {
        setIsColorAreaHovered(false);
        setHoveredColorImage(null);
        setHoveredColorName(null);
        setHoverZone("none");
      }}
      className="group flex flex-col justify-between text-left select-none relative"
    >
      <Link
        href={`/products/${product.slug || product.id}`}
        className="block focus:outline-none"
      >
        {/* Image Container with Multi-Image Split Hover (Beyond The Vines Style) */}
        <div
          onMouseLeave={() => setHoverZone("none")}
          className="relative aspect-[4/5] w-full overflow-hidden bg-neutral-100 mb-3.5"
        >
          {/* 1. Primary Photo (Gambar 1 - Default saat tidak di-hover) */}
          <Image
            src={primaryImage}
            alt={product.name}
            fill
            priority={priority}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className={`object-cover transition-opacity duration-300 ease-in-out ${
              hoveredColorImage
                ? "opacity-0"
                : hoverZone === "none"
                ? "opacity-100"
                : "opacity-0"
            }`}
          />

          {/* 2. Secondary Photo (Gambar 2 - Tampil saat cursor di area sebelah kiri) */}
          <Image
            src={secondaryImage}
            alt={`${product.name} lifestyle view`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className={`object-cover absolute inset-0 transition-opacity duration-300 ease-in-out ${
              !hoveredColorImage && hoverZone === "left" ? "opacity-100" : "opacity-0"
            }`}
          />

          {/* 3. Tertiary Photo (Gambar 3 - Tampil saat cursor di area sebelah kanan) */}
          <Image
            src={tertiaryImage}
            alt={`${product.name} detail view`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className={`object-cover absolute inset-0 transition-opacity duration-300 ease-in-out ${
              !hoveredColorImage && hoverZone === "right" ? "opacity-100" : "opacity-0"
            }`}
          />

          {/* 4. Specific Swatch Color Hover Overlay (jika cursor berada di pilihan warna) */}
          {hoveredColorImage && (
            <Image
              src={hoveredColorImage}
              alt={`${product.name} ${hoveredColorName || ""}`}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="object-cover absolute inset-0 opacity-100 transition-opacity duration-200 ease-in-out"
            />
          )}

          {/* Interactive Split Hover Zones (Kiri 50% vs Kanan 50%) */}
          {!hoveredColorImage && (
            <>
              <div
                onMouseEnter={() => setHoverZone("left")}
                className="absolute inset-y-0 left-0 w-1/2 z-10 cursor-pointer"
                aria-hidden="true"
              />
              <div
                onMouseEnter={() => setHoverZone("right")}
                className="absolute inset-y-0 right-0 w-1/2 z-10 cursor-pointer"
                aria-hidden="true"
              />
            </>
          )}

          {/* Pagination Indicator Dots (Beyond The Vines Style • •) */}
          {!hoveredColorImage && (
            <div className="absolute bottom-2.5 inset-x-0 z-20 flex items-center justify-center gap-1.5 pointer-events-none transition-opacity duration-200">
              <span
                className={`h-1.5 w-1.5 rounded-full transition-all duration-200 ${
                  hoverZone === "left" || hoverZone === "none"
                    ? "bg-neutral-900 scale-110 shadow-sm dark:bg-white"
                    : "bg-neutral-400/70 dark:bg-neutral-500"
                }`}
              />
              <span
                className={`h-1.5 w-1.5 rounded-full transition-all duration-200 ${
                  hoverZone === "right"
                    ? "bg-neutral-900 scale-110 shadow-sm dark:bg-white"
                    : "bg-neutral-400/70 dark:bg-neutral-500"
                }`}
              />
            </div>
          )}

          {/* Top Left Badges: SALE, HADIAH, PAKET DISKON */}
          <div className="absolute top-2.5 left-2.5 z-20 flex flex-col gap-1 items-start pointer-events-none">
            {product.discountPrice && (
              <span className="bg-red-600 text-white text-[9px] sm:text-[10px] uppercase font-bold tracking-[0.14em] px-2 py-0.5 shadow-sm">
                {product.discount?.discountPercent
                  ? `-${product.discount.discountPercent}%`
                  : "SALE"}
              </span>
            )}
            {giftBadge && (
              <span className="bg-emerald-600 text-white text-[9px] sm:text-[10px] uppercase font-extrabold tracking-[0.08em] px-2 py-0.5 shadow-sm flex items-center gap-1">
                <Gift className="h-2.5 w-2.5" />
                Hadiah
              </span>
            )}
            {bundleBadge && !giftBadge && (
              <span className="bg-purple-600 text-white text-[9px] sm:text-[10px] uppercase font-extrabold tracking-[0.08em] px-2 py-0.5 shadow-sm">
                Paket Diskon
              </span>
            )}
          </div>

          {/* Top Right Wishlist Button */}
          <button
            type="button"
            onClick={handleWishlistToggle}
            aria-label={isWishlisted ? "Hapus dari wishlist" : "Tambah ke wishlist"}
            className="absolute top-2.5 right-2.5 z-30 p-1.5 flex items-center justify-center text-neutral-800 hover:text-black transition-transform duration-200 hover:scale-110 active:scale-95 cursor-pointer"
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
              className={`h-4.5 w-4.5 sm:h-5 sm:w-5 transition-colors ${
                loveAnimation === "pop"
                  ? "animate-heart-pop fill-red-600 text-red-600 drop-shadow-sm"
                  : loveAnimation === "deflate"
                  ? "animate-heart-deflate text-neutral-700 stroke-[1.75]"
                  : isWishlisted
                  ? "fill-red-600 text-red-600 drop-shadow-sm"
                  : "text-neutral-700 hover:text-black stroke-[1.75] drop-shadow-sm"
              }`}
            />
          </button>

          {/* Wishlist Toast Bubble */}
          {wishlistToast && (
            <div className="absolute bottom-2 inset-x-2 z-30 bg-black/95 text-white text-[10px] font-medium py-1.5 px-2 text-center shadow-md animate-in fade-in slide-in-from-bottom-2 duration-150">
              {isWishlisted ? "Ditambahkan ke wishlist" : "Dihapus dari wishlist"}
            </div>
          )}

          {/* Sold Out / Low Stock Overlay Ribbon */}
          {isSoldOut && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-20">
              <span className="bg-black text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1">
                Out of Stock
              </span>
            </div>
          )}
        </div>

        {/* Product Meta */}
        <div className="space-y-1">
          {/* Product Title */}
          <h3 className="text-xs sm:text-[13px] font-medium text-black group-hover:underline underline-offset-4 line-clamp-2 leading-snug min-h-[2.4rem] sm:min-h-[2.6rem]">
            {product.name}
          </h3>

          {/* Color & Variant Info Row with Smooth Slide-Up Swatch Reveal on Hover */}
          <div
            onMouseEnter={() => setIsColorAreaHovered(true)}
            onMouseLeave={() => {
              setIsColorAreaHovered(false);
              setHoveredColorImage(null);
              setHoveredColorName(null);
            }}
            onClick={(e) => {
              // Prevent card link navigation when clicking inside the color row
              e.stopPropagation();
            }}
            className="relative h-6 sm:h-7 overflow-hidden flex items-center cursor-pointer my-0.5"
          >
            {/* 1. Default State: Text label (e.g. "Available in 4 colours") which slides UP on hover */}
            <div
              className={`absolute inset-0 flex items-center px-0.5 transition-all duration-300 ease-out ${
                isColorAreaHovered && hasMultipleColors
                  ? "-translate-y-full opacity-0 pointer-events-none"
                  : "translate-y-0 opacity-100"
              }`}
            >
              <span className="text-[11px] sm:text-xs text-neutral-500 font-normal truncate">
                {colorList.length > 1
                  ? `Available in ${colorList.length} colours`
                  : firstColor
                  ? `Available in 1 colour`
                  : `${product.variants.length} option${product.variants.length > 1 ? "s" : ""}`}
              </span>
            </div>

            {/* 2. Hover State: Interactive Color Swatches that slide up from bottom */}
            {hasMultipleColors && (
              <div
                className={`absolute inset-0 flex items-center gap-1.5 px-1 py-0.5 transition-all duration-300 ease-out ${
                  isColorAreaHovered
                    ? "translate-y-0 opacity-100"
                    : "translate-y-full opacity-0 pointer-events-none"
                }`}
              >
                {colorList.map((c) => {
                  const isHovered = hoveredColorName === c.name;
                  const isWhite =
                    (c.hex &&
                      (c.hex.toLowerCase() === "#ffffff" || c.hex.toLowerCase() === "#fff")) ||
                    c.name.toLowerCase().includes("white");

                  return (
                    <button
                      key={c.name}
                      type="button"
                      title={c.name}
                      onMouseEnter={(e) => {
                        e.stopPropagation();
                        setHoveredColorImage(c.image);
                        setHoveredColorName(c.name);
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setHoveredColorImage(c.image);
                        setHoveredColorName(c.name);
                      }}
                      className={`h-4 w-4 sm:h-4.5 sm:w-4.5 rounded-full border transition-all duration-150 relative flex items-center justify-center shrink-0 ${
                        isWhite ? "border-neutral-300" : "border-neutral-200"
                      } ${
                        isHovered
                          ? "ring-2 ring-black ring-offset-1 z-10 shadow-sm"
                          : "hover:ring-1 hover:ring-neutral-400 shadow-sm"
                      }`}
                      style={{
                        backgroundColor: c.hex || (isWhite ? "#ffffff" : "#111111"),
                      }}
                      aria-label={`Pilih warna ${c.name}`}
                    />
                  );
                })}

                {/* Hovered Color Name Display */}
                {hoveredColorName && (
                  <span className="text-[10px] sm:text-[11px] font-medium text-black truncate ml-1 animate-in fade-in duration-150">
                    {hoveredColorName}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Pricing */}
          <div className="flex items-center gap-2 pt-0.5 flex-wrap">
            <span className="text-xs sm:text-[13px] font-bold text-black tracking-tight">
              {formatPrice(displayPrice)}
            </span>
            {product.discountPrice && (
              <span className="text-xs text-neutral-400 line-through">
                {formatPrice(product.price)}
              </span>
            )}
            {isLowStock && (
              <span className="text-[10px] text-amber-700 font-medium ml-auto">
                Sisa {product.stock}
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* Full-width Black "Add to Bag" Button (or Blue "Waitlist" if Out of Stock) */}
      <button
        type="button"
        disabled={isSoldOut}
        onClick={handleAddToBag}
        className={`w-full mt-3 h-10 sm:h-11 px-4 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-[0.14em] transition-all duration-200 flex items-center justify-center gap-1.5 shrink-0 ${
          isSoldOut
            ? "bg-[#5b8def] text-white hover:bg-[#4a7de0] cursor-pointer"
            : justAdded
            ? "bg-emerald-600 text-white"
            : "bg-[#d5c6ff] text-[#396254] hover:bg-[#cbbce6] active:scale-[0.99]"
        }`}
      >
        {isSoldOut ? (
          <span>Waitlist</span>
        ) : justAdded ? (
          <>
            <Check className="h-4 w-4" />
            <span>Added To Bag</span>
          </>
        ) : (
          <span>Add To Bag</span>
        )}
      </button>

      {/* Signature Green "New" Badge below button (Only shown when showNewBadge is true) */}
      {showNewBadge && (
        <div className="mt-2.5 flex items-center justify-start">
          <span className="inline-flex items-center justify-center bg-[#ED96D7] text-white text-[10px] sm:text-[11px] font-semibold h-6 px-3.5 rounded-full shadow-sm leading-none">
            New
          </span>
        </div>
      )}
    </div>
  );
}
