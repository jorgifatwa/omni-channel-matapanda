"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Plus, Minus, Check, ShoppingBag } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCart } from "@/context/CartContext";
import { type StorefrontProduct, type StorefrontVariant } from "@/lib/data-fetcher";

interface QuickAddModalProps {
  product: StorefrontProduct | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function QuickAddModal({
  product,
  isOpen,
  onClose,
}: QuickAddModalProps) {
  const { addItem, formatPrice } = useCart();

  const [selectedColor, setSelectedColor] = React.useState<string>("");
  const [selectedSize, setSelectedSize] = React.useState<string>("");
  const [quantity, setQuantity] = React.useState<number>(1);
  const [justAdded, setJustAdded] = React.useState(false);

  // Group colors and extract variants when product changes
  const variants = React.useMemo(() => product?.variants || [], [product?.variants]);
  const images = React.useMemo(
    () => (product?.images && product.images.length > 0 ? product.images : []),
    [product?.images]
  );
  const primaryImage =
    images.find((img) => img.isPrimary)?.url ||
    images[0]?.url ||
    "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=85";

  // Group distinct colors with their metadata (hex, group)
  const colorMap = React.useMemo(() => {
    const map = new Map<
      string,
      { color: string; colorGroup: string; colorHex: string | null; hasStock: boolean }
    >();
    for (const v of variants) {
      if (!v.color) continue;
      const group = v.colorGroup?.trim() || "Classic";
      const hex = v.colorHex?.trim() || null;
      const existing = map.get(v.color);
      const hasStock = (existing?.hasStock ?? false) || v.stock > 0;

      map.set(v.color, {
        color: v.color,
        colorGroup: existing?.colorGroup || group,
        colorHex: existing?.colorHex || hex,
        hasStock,
      });
    }
    return map;
  }, [variants]);

  // Group colors by colorGroup (e.g. Classic, Seasonal)
  const groupedColors = React.useMemo(() => {
    const groups: Record<
      string,
      Array<{ color: string; colorHex: string | null; hasStock: boolean }>
    > = {};
    colorMap.forEach((info) => {
      const g = info.colorGroup || "Classic";
      if (!groups[g]) groups[g] = [];
      groups[g].push({
        color: info.color,
        colorHex: info.colorHex,
        hasStock: info.hasStock,
      });
    });
    return groups;
  }, [colorMap]);

  // Distinct sizes
  const distinctSizes = React.useMemo(() => {
    const set = new Set<string>();
    for (const v of variants) {
      if (v.size) set.add(v.size);
    }
    return Array.from(set);
  }, [variants]);

  // Map each color to its corresponding photo
  const colorToImageMap = React.useMemo(() => {
    const map = new Map<string, string>();
    if (!product) return map;

    let imgIdx = 0;
    const seen = new Set<string>();

    for (const v of variants) {
      if (v.color && !seen.has(v.color.toLowerCase())) {
        seen.add(v.color.toLowerCase());
        const assignedImg =
          v.image ||
          images[imgIdx]?.url ||
          primaryImage;
        map.set(v.color.toLowerCase(), assignedImg);
        imgIdx++;
      }
    }
    return map;
  }, [product, variants, images, primaryImage]);

  // Initialize or reset selections when modal opens or product changes
  React.useEffect(() => {
    if (!isOpen || !product || variants.length === 0) return;

    // Pick first color that has in-stock variants, or first color
    const inStockVariant = variants.find((v) => v.stock > 0) || variants[0];
    const initialColor = inStockVariant?.color || variants[0]?.color || "";
    setSelectedColor(initialColor);

    // Pick first in-stock size for the chosen color
    const matchingSizes = variants.filter((v) => v.color === initialColor);
    const inStockSizeVariant = matchingSizes.find((v) => v.stock > 0) || matchingSizes[0];
    setSelectedSize(inStockSizeVariant?.size || variants[0]?.size || "");

    setQuantity(1);
    setJustAdded(false);
  }, [isOpen, product, variants]);

  // When selectedColor changes, adjust selectedSize if current size is not valid for this color
  const handleColorChange = (newColor: string) => {
    setSelectedColor(newColor);
    const availableForColor = variants.filter((v) => v.color === newColor);
    const currentStillAvailable = availableForColor.some(
      (v) => v.size === selectedSize && v.stock > 0
    );
    if (!currentStillAvailable) {
      const firstInStock = availableForColor.find((v) => v.stock > 0) || availableForColor[0];
      if (firstInStock) {
        setSelectedSize(firstInStock.size);
      }
    }
    setQuantity(1);
  };

  // Active matched variant
  const activeVariant: StorefrontVariant | undefined =
    variants.find((v) => v.color === selectedColor && v.size === selectedSize) ||
    variants.find((v) => v.color === selectedColor) ||
    variants[0];

  const maxStock = activeVariant?.stock ?? product?.stock ?? 0;
  const isVariantSoldOut = maxStock <= 0;
  const displayPrice = product?.discountPrice ?? product?.price ?? 0;

  const activeColorImage =
    (selectedColor && colorToImageMap.get(selectedColor.toLowerCase())) ||
    activeVariant?.image ||
    primaryImage;

  // Check if size is in stock for the currently selected color
  const isSizeInStock = (size: string) => {
    const match = variants.find((v) => v.color === selectedColor && v.size === size);
    return match ? match.stock > 0 : false;
  };

  const hasMultipleColors = colorMap.size > 1;
  const hasMultipleSizes = distinctSizes.length > 1;

  const handleAddToCart = () => {
    if (!product || isVariantSoldOut || !activeVariant) return;

    addItem({
      productId: product.id,
      name: product.name,
      price: String(displayPrice),
      priceNumber: displayPrice,
      image: activeColorImage,
      size: activeVariant.size || selectedSize || "One Size",
      color: activeVariant.color || selectedColor || "Default",
      quantity,
      maxStock,
    });

    setJustAdded(true);
    setTimeout(() => {
      setJustAdded(false);
      onClose();
    }, 700);
  };

  if (!isOpen || !product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:w-full max-w-lg md:max-w-3xl lg:max-w-4xl p-0 overflow-hidden bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 border border-neutral-200/90 dark:border-neutral-800 rounded-3xl shadow-2xl max-h-[92dvh] md:max-h-[88vh] flex flex-col gap-0">
        <DialogHeader className="px-5 sm:px-6 py-3.5 sm:py-4 border-b border-neutral-100 dark:border-neutral-800 flex flex-row items-center justify-between shrink-0 bg-neutral-50/60 dark:bg-neutral-900/80">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 h-6 px-2.5 rounded-full bg-[#d5c6ff] text-[#396254] dark:bg-[#d5c6ff]/30 dark:text-[#d5c6ff] text-[10px] font-black uppercase tracking-wider shadow-xs">
              Quick Bag
            </span>
            <DialogTitle className="text-xs sm:text-sm font-bold uppercase tracking-[0.14em] text-neutral-800 dark:text-neutral-200">
              Pick Your Vibe
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="flex flex-col md:flex-row flex-1 overflow-y-auto md:overflow-hidden min-h-0">
          {/* Left Column: Large & Prominent Product Image */}
          <div className="relative w-full aspect-[4/5] sm:aspect-square md:aspect-auto md:w-1/2 shrink-0 bg-neutral-50 dark:bg-neutral-950 border-b md:border-b-0 md:border-r border-neutral-100 dark:border-neutral-800 overflow-hidden md:min-h-[520px]">
            <Image
              key={activeColorImage}
              src={activeColorImage}
              alt={product.name}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 500px"
              className="object-cover transition-opacity duration-300 animate-in fade-in"
            />
            {/* Badges */}
            <div className="absolute top-3.5 left-3.5 flex flex-col gap-1.5 z-10 pointer-events-none">
              {product.isNewArrival && (
                <span className="inline-flex items-center bg-[#ED96D7] text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">
                  <span>NEW</span>
                </span>
              )}
              {product.discountPrice && (
                <span className="inline-flex items-center bg-red-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">
                  <span>
                    {product.discount?.discountPercent
                      ? `-${product.discount.discountPercent}%`
                      : "SALE"}
                  </span>
                </span>
              )}
            </div>
          </div>

          {/* Right Column: Selections & Actions */}
          <div className="flex-1 flex flex-col min-w-0 md:w-1/2 md:overflow-y-auto">
            {/* Scrollable Selections Area */}
            <div className="p-5 sm:p-6 md:p-7 space-y-4 sm:space-y-5 flex-1">
              {/* Title & Price */}
              <div>
                <h2 className="text-base sm:text-lg font-black text-neutral-900 dark:text-neutral-100 font-heading tracking-tight">
                  {product.name}
                </h2>

                <div className="mt-1.5 flex items-center gap-2.5 flex-wrap">
                  <span className="text-base sm:text-lg font-black text-[#396254] dark:text-[#dcf58d] font-heading">
                    {formatPrice(displayPrice)}
                  </span>
                  {product.discountPrice && (
                    <span className="text-xs sm:text-sm text-neutral-400 dark:text-neutral-500 line-through font-medium">
                      {formatPrice(product.price)}
                    </span>
                  )}
                  {product.discount?.discountPercent ? (
                    <span className="inline-flex items-center text-[10px] sm:text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200/60 dark:border-red-900/40 px-2.5 py-0.5 rounded-full">
                      Save {product.discount.discountPercent}%
                    </span>
                  ) : null}
                </div>

                {/* SKU & Stock Indicator */}
                <div className="mt-2 flex items-center gap-2 text-xs flex-wrap">
                  {activeVariant?.sku && (
                    <span className="font-mono text-[10px] text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded">
                      SKU: {activeVariant.sku}
                    </span>
                  )}
                  {isVariantSoldOut ? (
                    <span className="text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200/60 dark:border-red-900/40 px-2.5 py-0.5 rounded-full font-bold text-[11px] uppercase tracking-wider">
                      Stok Habis
                    </span>
                  ) : maxStock <= (activeVariant?.lowStockThreshold || 5) ? (
                    <span className="text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/40 px-2.5 py-0.5 rounded-full font-bold text-[11px]">
                      Sisa {maxStock} unit lagi!
                    </span>
                  ) : (
                    <span className="text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/40 px-2.5 py-0.5 rounded-full font-semibold text-[11px]">
                      Tersedia ({maxStock})
                    </span>
                  )}
                </div>
              </div>

              <div className="border-t border-neutral-100 dark:border-neutral-800" />

              {/* 1. Color Selection with Color Groups & Swatches */}
              {hasMultipleColors && (
                <div className="space-y-3">
                  {Object.entries(groupedColors).map(([groupName, groupItems]) => (
                    <div key={groupName} className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold uppercase tracking-wider text-neutral-800">
                          {groupName} {selectedColor && groupItems.some((i) => i.color === selectedColor) && (
                            <span className="ml-1.5 font-bold text-[#396254] bg-[#d5c6ff]/40 px-2.5 py-0.5 rounded-full text-[11px]">
                              {selectedColor}
                            </span>
                          )}
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5 flex-wrap pt-0.5">
                        {groupItems.map((item) => {
                          const isSelected = selectedColor === item.color;
                          const bgHex =
                            item.colorHex ||
                            (item.color.toLowerCase().includes("white")
                              ? "#FFFFFF"
                              : item.color.toLowerCase().includes("black")
                              ? "#111111"
                              : "#888888");
                          const isLightBg =
                            bgHex.toLowerCase().includes("#fff") ||
                            item.color.toLowerCase().includes("white") ||
                            item.color.toLowerCase().includes("cream") ||
                            item.color.toLowerCase().includes("yellow");

                          return (
                            <button
                              key={item.color}
                              type="button"
                              onClick={() => handleColorChange(item.color)}
                              className={`group relative h-9 w-9 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
                                isSelected
                                  ? "ring-2 ring-black ring-offset-2 scale-110 shadow-md"
                                  : "hover:scale-105 hover:ring-1 hover:ring-neutral-400 opacity-85 hover:opacity-100"
                              } ${!item.hasStock ? "opacity-35 cursor-not-allowed" : ""}`}
                              title={`${item.color}${!item.hasStock ? " (Habis)" : ""}`}
                            >
                              <span
                                className="h-7 w-7 rounded-full border border-black/10 shrink-0 shadow-inner flex items-center justify-center transition-transform"
                                style={{ backgroundColor: bgHex }}
                              >
                                {isSelected && (
                                  <Check
                                    className={`h-3.5 w-3.5 stroke-[2.5] ${
                                      isLightBg ? "text-black" : "text-white"
                                    }`}
                                  />
                                )}
                              </span>
                              {!item.hasStock && (
                                <span className="absolute inset-0 flex items-center justify-center">
                                  <span className="w-full h-0.5 bg-red-500 rotate-45" />
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 2. Size Selection */}
              {hasMultipleSizes && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
                      Size: <span className="font-black text-[#396254] dark:text-[#dcf58d] ml-1">{selectedSize}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {distinctSizes.map((size) => {
                      const isSelected = selectedSize === size;
                      const inStock = isSizeInStock(size);

                      return (
                        <button
                          key={size}
                          type="button"
                          disabled={!inStock}
                          onClick={() => {
                            setSelectedSize(size);
                            setQuantity(1);
                          }}
                          className={`min-w-[50px] h-9 px-4 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-200 border cursor-pointer ${
                            isSelected
                              ? "bg-[#396254] text-white border-[#396254] dark:bg-[#dcf58d] dark:text-[#233a32] dark:border-[#dcf58d] shadow-md scale-105"
                              : inStock
                              ? "bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border-neutral-300 dark:border-neutral-700 hover:border-[#396254] hover:scale-105 active:scale-95"
                              : "bg-neutral-100 dark:bg-neutral-800/40 text-neutral-400 dark:text-neutral-600 border-neutral-200 dark:border-neutral-800 line-through cursor-not-allowed opacity-50"
                          }`}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 3. Quantity Stepper */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200 block">
                  Quantity
                </span>
                <div className="inline-flex items-center border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 rounded-full overflow-hidden h-10 shadow-xs">
                  <button
                    type="button"
                    disabled={quantity <= 1 || isVariantSoldOut}
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="h-full px-3.5 flex items-center justify-center text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-700 active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                    aria-label="Kurangi kuantitas"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="h-full px-3 flex items-center justify-center text-xs sm:text-sm font-black font-mono min-w-[32px] select-none text-neutral-900 dark:text-neutral-100">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    disabled={quantity >= maxStock || isVariantSoldOut}
                    onClick={() => setQuantity((q) => Math.min(maxStock, q + 1))}
                    className="h-full px-3.5 flex items-center justify-center text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-700 active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                    aria-label="Tambah kuantitas"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Sticky Bottom Actions (Always visible & accessible) */}
            <div className="shrink-0 border-t border-neutral-100 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xs p-4 sm:p-5 md:px-7 md:py-5 z-10">
              <div className="relative">
                {/* Floating Confetti / Sparkles Burst when Added! */}
                {justAdded && (
                  <div className="pointer-events-none absolute inset-0 -top-2 flex items-center justify-center overflow-visible z-20">
                    <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#ED96D7] animate-heart-sparkle-1 shadow-xs" />
                    <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#d5c6ff] animate-heart-sparkle-2 shadow-xs" />
                    <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-amber-400 animate-heart-sparkle-3 shadow-xs" />
                    <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-400 animate-heart-sparkle-4 shadow-xs" />
                    <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#396254] animate-heart-sparkle-5 shadow-xs" />
                    <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-rose-500 animate-heart-sparkle-6 shadow-xs" />
                    <span className="absolute inset-0 m-auto h-10 w-24 rounded-full border-2 border-emerald-400 animate-heart-burst-ring" />
                  </div>
                )}

                <button
                  type="button"
                  disabled={isVariantSoldOut}
                  onClick={handleAddToCart}
                  className={`w-full py-3.5 px-5 rounded-full text-xs font-black uppercase tracking-[0.16em] transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer font-heading ${
                    isVariantSoldOut
                      ? "bg-neutral-200 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed"
                      : justAdded
                      ? "bg-emerald-600 text-white animate-playful-bounce shadow-lg shadow-emerald-200"
                      : "bg-[#d5c6ff] text-[#396254] hover:bg-[#cbbce6] dark:bg-[#d5c6ff]/90 dark:text-[#233a32] active:scale-[0.98] shadow-md hover:shadow-lg hover:-translate-y-0.5"
                  }`}
                >
                  {isVariantSoldOut ? (
                    <span>Out of Stock</span>
                  ) : justAdded ? (
                    <>
                      <Check className="h-4.5 w-4.5 stroke-[2.5]" />
                      <span>YAY! Added To Bag!</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="h-4 w-4" />
                      <span>
                        Add To Bag &bull; {formatPrice(displayPrice * quantity)}
                      </span>
                    </>
                  )}
                </button>
              </div>

              <div className="mt-3 text-center">
                <Link
                  href={`/products/${product.slug || product.id}`}
                  onClick={onClose}
                  className="group inline-flex items-center gap-1.5 text-[11px] font-bold text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white tracking-wider uppercase transition-colors"
                >
                  <span>Lihat Detail Produk Lengkap</span>
                  <span className="transition-transform group-hover:translate-x-1">&rarr;</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
