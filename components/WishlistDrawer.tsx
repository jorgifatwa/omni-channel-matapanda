"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Heart,
  X,
  Trash2,
  ShoppingBag,
  ArrowRight,
} from "lucide-react";
import { useWishlist } from "@/context/WishlistContext";
import { useCart } from "@/context/CartContext";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export default function WishlistDrawer() {
  const {
    items,
    isDrawerOpen,
    setIsDrawerOpen,
    closeWishlist,
    removeFromWishlist,
    clearWishlist,
    totalCount,
  } = useWishlist();

  const { addItem } = useCart();

  const handleMoveToCart = (item: (typeof items)[0]) => {
    addItem({
      productId: item.id,
      name: item.name,
      price: item.price,
      priceNumber: item.priceNumber,
      image: item.image,
      size: "All Size",
      color: "Standard",
      quantity: 1,
    });
    closeWishlist();
  };

  return (
    <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 z-50 border-l border-neutral-200 dark:border-neutral-800"
      >
        {/* 1. Header */}
        <SheetHeader className="p-4 sm:p-5 border-b border-neutral-100 dark:border-neutral-800 flex flex-row items-center justify-between space-y-0 text-left bg-neutral-50/50 dark:bg-neutral-900/50">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-full bg-[#ED96D7]/20 text-[#ED96D7] flex items-center justify-center shadow-xs">
              <Heart className="h-4 w-4 fill-[#ED96D7] text-[#ED96D7]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <SheetTitle className="text-sm font-black uppercase tracking-wider text-black dark:text-white">
                  Wishlist
                </SheetTitle>
              </div>
              <p className="text-[11px] text-neutral-500 font-semibold">
                {totalCount} item tersimpan
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {totalCount > 0 && (
              <button
                type="button"
                onClick={clearWishlist}
                className="text-[11px] font-bold text-neutral-500 hover:text-red-600 transition-colors pr-2 cursor-pointer"
              >
                Hapus Semua
              </button>
            )}
            <button
              type="button"
              onClick={closeWishlist}
              className="h-8 w-8 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-center text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
              aria-label="Tutup Wishlist"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </SheetHeader>

        {/* 2. Body List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 divide-y divide-neutral-100 dark:divide-neutral-900">
          {totalCount === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-16 px-4 space-y-4">
              <div className="h-20 w-20 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center shadow-inner">
                <Heart className="h-8 w-8 fill-rose-500" />
              </div>
              <div className="space-y-1.5 max-w-xs">
                <h4 className="text-sm font-black uppercase tracking-wider text-neutral-900 dark:text-neutral-100">
                  Wishlist Kamu Masih Kosong
                </h4>
                <p className="text-xs text-neutral-500 leading-relaxed font-medium">
                  Simpan tas dan aksesoris favorit kamu dengan menekan ikon hati di setiap produk!
                </p>
              </div>
              <Button
                onClick={closeWishlist}
                asChild
                className="rounded-full text-xs font-black uppercase tracking-wider bg-[#396254] hover:bg-[#2c4e43] text-white mt-2 px-6 shadow-sm hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer"
              >
                <Link href="/new-arrivals">Jelajahi Koleksi Tas</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3.5 items-start p-3.5 rounded-2xl bg-neutral-50/70 dark:bg-neutral-900/50 border border-neutral-100 dark:border-neutral-800 hover:border-[#396254]/30 transition-all group"
                >
                  {/* Thumbnail */}
                  <Link
                    href={`/products/${item.slug}`}
                    onClick={closeWishlist}
                    className="relative h-20 w-20 rounded-2xl overflow-hidden bg-neutral-200 dark:bg-neutral-800 shrink-0 block"
                  >
                    <Image
                      src={item.image || "/images/placeholder.jpg"}
                      alt={item.name}
                      fill
                      sizes="80px"
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </Link>

                  {/* Info */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#d5c6ff] text-[#396254]">
                      {item.categoryName}
                    </span>
                    <Link
                      href={`/products/${item.slug}`}
                      onClick={closeWishlist}
                      className="block text-xs font-black uppercase tracking-tight text-neutral-900 dark:text-neutral-100 hover:text-[#396254] truncate transition-colors"
                    >
                      {item.name}
                    </Link>

                    <div className="flex items-center gap-1.5">
                      {item.discountPrice ? (
                        <>
                          <span className="text-xs font-black text-red-600 dark:text-red-400">
                            {item.discountPrice}
                          </span>
                          <span className="text-[10px] text-neutral-400 line-through">
                            {item.price}
                          </span>
                        </>
                      ) : (
                        <span className="text-xs font-black text-neutral-900 dark:text-neutral-100">
                          {item.price}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => handleMoveToCart(item)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#396254] hover:bg-[#2c4e43] text-white text-[10px] font-black uppercase tracking-wider transition-all hover:-translate-y-0.5 active:scale-95 shadow-xs cursor-pointer"
                      >
                        <ShoppingBag className="h-3 w-3" />
                        <span>Add to Bag</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => removeFromWishlist(item.id)}
                        className="p-1.5 rounded-full text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                        title="Hapus dari Wishlist"
                        aria-label="Hapus dari Wishlist"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 3. Footer */}
        {totalCount > 0 && (
          <div className="p-4 sm:p-5 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-900/80 space-y-2.5">
            <Button
              asChild
              onClick={closeWishlist}
              className="w-full rounded-full py-5 text-xs font-black uppercase tracking-wider bg-[#396254] hover:bg-[#2c4e43] text-white shadow-md hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer"
            >
              <Link
                href="/wishlist"
                className="flex items-center justify-center gap-2"
              >
                <span>Lihat Wishlist Penuh</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
