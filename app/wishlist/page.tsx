"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Heart,
  Trash2,
  ShoppingBag,
  ArrowRight,
  ChevronRight,
  Share2,
  Check,
} from "lucide-react";
import AnnouncementBar from "@/components/AnnouncementBar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useWishlist } from "@/context/WishlistContext";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";

export default function WishlistPage() {
  const { items, removeFromWishlist, clearWishlist, totalCount } = useWishlist();
  const { addItem } = useCart();

  const [copied, setCopied] = React.useState(false);

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

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
  };

  const handleMoveAllToCart = () => {
    items.forEach((item) => {
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
    });
  };

  return (
    <div className="min-h-dvh flex flex-col bg-[#fafaf8] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans">
      <AnnouncementBar />
      <Navbar />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-10">
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-xs font-medium text-neutral-500 uppercase tracking-wider"
        >
          <Link href="/" className="hover:text-black dark:hover:text-white transition-colors">
            Home
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-black dark:text-white font-bold">Wishlist</span>
        </nav>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 border-b border-neutral-200/80 dark:border-neutral-800 pb-7">
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ED96D7]/20 text-[#ED96D7] dark:text-pink-300 text-xs font-black uppercase tracking-wider shadow-xs">
              <Heart className="h-3.5 w-3.5 fill-[#ED96D7] text-[#ED96D7]" />
              <span>Saved Favs</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight uppercase text-black dark:text-white">
              Wishlist Saya
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 font-medium">
              Ada <span className="font-bold text-[#396254] dark:text-[#dcf58d]">{totalCount} item</span> tersimpan untuk wishlist belanja seru kamu!
            </p>
          </div>

          {totalCount > 0 && (
            <div className="flex items-center gap-2.5 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                className="text-xs font-bold gap-1.5 rounded-full border-neutral-300 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-all active:scale-95 cursor-pointer shadow-xs"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Share2 className="h-3.5 w-3.5 text-neutral-600" />}
                <span>{copied ? "Link Tersalin!" : "Bagikan"}</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={clearWishlist}
                className="text-xs font-bold gap-1.5 rounded-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-900/50 transition-all active:scale-95 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Hapus Semua</span>
              </Button>

              <Button
                size="sm"
                onClick={handleMoveAllToCart}
                className="text-xs font-black gap-2 rounded-full bg-[#396254] hover:bg-[#2c4e43] text-white shadow-md hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer px-5 py-2"
              >
                <ShoppingBag className="h-3.5 w-3.5" />
                <span>Pindahkan Semua ke Bag</span>
              </Button>
            </div>
          )}
        </div>

        {/* Empty State */}
        {totalCount === 0 ? (
          <div className="py-20 text-center space-y-5 bg-white dark:bg-neutral-900 rounded-3xl border border-dashed border-neutral-200 dark:border-neutral-800 p-8 sm:p-14 shadow-sm max-w-2xl mx-auto">
            <div className="h-24 w-24 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center mx-auto shadow-inner">
              <Heart className="h-10 w-10 fill-rose-500 text-rose-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black uppercase tracking-tight text-neutral-900 dark:text-neutral-100">
                Wishlist Kamu Masih Kosong
              </h2>
              <p className="text-xs sm:text-sm text-neutral-500 max-w-md mx-auto leading-relaxed">
                Yuk jelajahi koleksi tas dan aksesoris seru dari it&apos;smatapanda. Tekan ikon favorit pada produk untuk menyimpannya di sini!
              </p>
            </div>
            <div className="pt-2">
              <Button
                asChild
                className="rounded-full px-8 py-6 text-xs font-black uppercase tracking-wider bg-[#396254] hover:bg-[#2c4e43] text-white shadow-md hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer"
              >
                <Link href="/new-arrivals" className="flex items-center gap-2">
                  <span>Jelajahi Koleksi Tas</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          /* Products Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map((item) => (
              <div
                key={item.id}
                className="group relative flex flex-col justify-between rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 overflow-hidden shadow-xs hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                {/* Image Area */}
                <div className="relative aspect-square w-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                  <Link href={`/products/${item.slug}`} className="block w-full h-full">
                    <Image
                      src={item.image || "/images/placeholder.jpg"}
                      alt={item.name}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                    />
                  </Link>

                  {/* Top Right Remove from Wishlist Button */}
                  <button
                    type="button"
                    onClick={() => removeFromWishlist(item.id)}
                    className="absolute top-3 right-3 h-8 w-8 rounded-full bg-white/90 dark:bg-neutral-900/90 text-neutral-400 hover:text-red-600 hover:bg-white flex items-center justify-center backdrop-blur shadow-xs transition-all active:scale-90 cursor-pointer"
                    title="Hapus dari wishlist"
                    aria-label="Hapus dari wishlist"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  {/* Category Badge */}
                  <div className="absolute bottom-3 left-3">
                    <span className="px-3 py-1 rounded-full bg-[#d5c6ff] text-[#396254] text-[10px] font-black uppercase tracking-wider shadow-xs">
                      {item.categoryName}
                    </span>
                  </div>
                </div>

                {/* Content Area */}
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <Link
                      href={`/products/${item.slug}`}
                      className="block text-sm font-black uppercase tracking-tight text-neutral-900 dark:text-neutral-100 hover:text-[#396254] line-clamp-1 transition-colors"
                    >
                      {item.name}
                    </Link>

                    {/* Price */}
                    <div className="flex items-center gap-2">
                      {item.discountPrice ? (
                        <>
                          <span className="text-sm font-black text-red-600 dark:text-red-400">
                            {item.discountPrice}
                          </span>
                          <span className="text-xs text-neutral-400 line-through font-medium">
                            {item.price}
                          </span>
                        </>
                      ) : (
                        <span className="text-sm font-black text-neutral-900 dark:text-neutral-100">
                          {item.price}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Add to Bag Button */}
                  <Button
                    onClick={() => handleMoveToCart(item)}
                    className="w-full rounded-full text-xs font-black uppercase tracking-wider gap-2 bg-[#396254] hover:bg-[#2c4e43] text-white shadow-sm hover:-translate-y-0.5 active:scale-95 transition-all py-2.5 cursor-pointer"
                  >
                    <ShoppingBag className="h-3.5 w-3.5" />
                    <span>Add to Bag</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
