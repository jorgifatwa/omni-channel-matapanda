"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import {
  Search,
  User,
  ShoppingBag,
  ChevronDown,
  Menu,
  Plus,
  Minus,
  Trash2,
  Package,
  LogOut,
  LogIn,
  UserPlus,
  Truck,
  Ticket,
  X,
  Heart,
  Loader2,
  Check,
  Sparkles,
  Gift,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import WishlistDrawer from "@/components/WishlistDrawer";
import { CURRENCIES, type CurrencyCode } from "@/lib/products";

interface SearchProduct {
  id: string;
  name: string;
  slug: string;
  sku: string;
  price: number;
  discountPrice: number | null;
  image: string;
  categoryName: string;
  finalPrice?: number;
  hasDiscount?: boolean;
}

function CurrencyFlag({ code }: { code: CurrencyCode }) {
  if (code === "USD") {
    return (
      <span
        aria-hidden="true"
        className="inline-flex flex-col w-5 h-3.5 rounded-[1px] overflow-hidden border border-neutral-200 shrink-0 relative bg-white"
      >
        <span className="w-full h-1/3 bg-red-600" />
        <span className="w-full h-1/3 bg-white" />
        <span className="w-full h-1/3 bg-red-600" />
        <span className="absolute top-0 left-0 w-2.5 h-2 bg-blue-800" />
      </span>
    );
  }

  if (code === "SGD") {
    return (
      <span
        aria-hidden="true"
        className="inline-flex flex-col w-5 h-3.5 rounded-[1px] overflow-hidden border border-neutral-200 shrink-0 relative"
      >
        <span className="w-full h-1/2 bg-red-600" />
        <span className="w-full h-1/2 bg-white" />
        <span className="absolute top-0.5 left-0.5 w-1.5 h-1.5 rounded-full bg-white" />
      </span>
    );
  }

  if (code === "JPY") {
    return (
      <span
        aria-hidden="true"
        className="inline-flex items-center justify-center w-5 h-3.5 rounded-[1px] overflow-hidden border border-neutral-200 bg-white shrink-0"
      >
        <span className="w-2 h-2 rounded-full bg-red-600" />
      </span>
    );
  }

  // Default: IDR (Indonesia Flag)
  return (
    <span
      aria-hidden="true"
      className="inline-flex flex-col w-5 h-3.5 rounded-[1px] overflow-hidden border border-neutral-200 shrink-0"
    >
      <span className="w-full h-1/2 bg-red-600" />
      <span className="w-full h-1/2 bg-white" />
    </span>
  );
}

export default function Navbar() {
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";

  const [categoriesList, setCategoriesList] = React.useState<{ name: string; slug: string }[]>([]);

  // Slide-from-Left Partial Menu Panel (Header turns royal blue & panel slides from left)
  const [menuOpen, setMenuOpen] = React.useState(false);
  const headerRef = React.useRef<HTMLElement>(null);
  const menuRef = React.useRef<HTMLElement>(null);
  const hamburgerRef = React.useRef<HTMLButtonElement>(null);
  const [headerHeight, setHeaderHeight] = React.useState<number>(80);

  // Measure dynamic header bottom position in real-time
  const updateHeaderPosition = React.useCallback(() => {
    if (headerRef.current) {
      const rect = headerRef.current.getBoundingClientRect();
      setHeaderHeight(Math.round(rect.bottom));
    }
  }, []);

  React.useEffect(() => {
    updateHeaderPosition();

    window.addEventListener("resize", updateHeaderPosition);
    window.addEventListener("scroll", updateHeaderPosition, { passive: true });

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && headerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        updateHeaderPosition();
      });
      resizeObserver.observe(headerRef.current);
    }

    return () => {
      window.removeEventListener("resize", updateHeaderPosition);
      window.removeEventListener("scroll", updateHeaderPosition);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [updateHeaderPosition]);

  // Ensure exact measurement when menu opens
  React.useEffect(() => {
    if (menuOpen) {
      updateHeaderPosition();
    }
  }, [menuOpen, updateHeaderPosition]);

  // Close expanding menu on Escape key press or outside click
  React.useEffect(() => {
    if (!menuOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
      }
    };

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        hamburgerRef.current &&
        !hamburgerRef.current.contains(target)
      ) {
        setMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [menuOpen]);

  // Search Dialog State
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<SearchProduct[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);

  // Fetch dynamic categories from database
  React.useEffect(() => {
    let isMounted = true;
    fetch("/api/menu")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted || !data) return;

        const catItems = (data.categories || []).map(
          (c: { name: string; slug: string }) => ({
            name: c.name,
            slug: c.slug,
          })
        );

        setCategoriesList(catItems);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  // Live search handler
  React.useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery.trim())}`);
        const data = await res.json();
        setSearchResults(data.products || []);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Cart Context
  const {
    items,
    isOpen,
    setIsOpen,
    updateQuantity,
    removeItem,
    totalItems,
    subtotal,
    currency,
    setCurrency,
    formatPrice,
    appliedCoupon,
    couponDiscount,
    bundleDiscount,
    bundleProgress,
    giftProgress,
    giftItem,
    totalAfterDiscounts,
    applyCoupon,
    removeCoupon,
  } = useCart();

  // Wishlist Context
  const { openWishlist, totalCount: wishlistCount } = useWishlist();
  const [wishlistBump, setWishlistBump] = React.useState(false);
  const prevWishlistCount = React.useRef(wishlistCount);

  React.useEffect(() => {
    if (wishlistCount > prevWishlistCount.current) {
      setWishlistBump(true);
      const timer = setTimeout(() => setWishlistBump(false), 600);
      return () => clearTimeout(timer);
    }
    prevWishlistCount.current = wishlistCount;
  }, [wishlistCount]);

  const [cartBump, setCartBump] = React.useState(false);
  const prevTotalItems = React.useRef(totalItems);

  React.useEffect(() => {
    if (totalItems > prevTotalItems.current) {
      setCartBump(true);
      const timer = setTimeout(() => setCartBump(false), 600);
      return () => clearTimeout(timer);
    }
    prevTotalItems.current = totalItems;
  }, [totalItems]);

  // Coupon Drawer States
  const [drawerCouponInput, setDrawerCouponInput] = React.useState("");
  const [drawerCouponMsg, setDrawerCouponMsg] = React.useState<{ text: string; error: boolean } | null>(null);
  const [isApplyingDrawerCoupon, setIsApplyingDrawerCoupon] = React.useState(false);

  const handleApplyDrawerCoupon = async () => {
    if (!drawerCouponInput.trim()) return;
    setIsApplyingDrawerCoupon(true);
    setDrawerCouponMsg(null);
    const res = await applyCoupon(drawerCouponInput);
    setIsApplyingDrawerCoupon(false);
    if (res.success) {
      setDrawerCouponInput("");
      setDrawerCouponMsg({ text: res.message, error: false });
    } else {
      setDrawerCouponMsg({ text: res.message, error: true });
    }
  };

  return (
    <>
      {/* ============================================================== */}
      {/* 1. STOREFRONT HEADER (Turns solid Lavender Purple #d5c6ff when open)*/}
      {/* ============================================================== */}
      <header
        ref={headerRef}
        className={`sticky top-0 z-40 w-full transition-colors duration-300 ease-in-out ${
          menuOpen
            ? "bg-[#d5c6ff] text-[#396254] border-b-0"
            : "bg-white text-black border-b border-neutral-200"
        }`}
      >
        <div className="w-full px-4 sm:px-6 lg:px-8">
          {/* Main Top Row: Hamburger + Logo (Left) / Actions (Right) */}
          <div className="relative flex items-center justify-between h-16 sm:h-20">
            {/* Left: Hamburger Button & Brand Logo */}
            <div className="flex items-center gap-3 sm:gap-4 z-10">
              <Button
                ref={hamburgerRef}
                variant="ghost"
                size="icon"
                onClick={() => setMenuOpen((prev) => !prev)}
                className={`h-10 w-10 transition-colors ${
                  menuOpen
                    ? "text-[#396254] hover:bg-[#396254]/10"
                    : "text-black hover:bg-neutral-100"
                }`}
                aria-label={menuOpen ? "Tutup Menu" : "Buka Menu"}
              >
                {menuOpen ? (
                  <X className="h-5 w-5 stroke-[2.5]" />
                ) : (
                  <Menu className="h-5 w-5 stroke-[2]" />
                )}
              </Button>

              <Link
                href="/"
                onClick={() => setMenuOpen(false)}
                className="font-bold tracking-tight text-xl sm:text-2xl md:text-3xl select-none transition-opacity hover:opacity-85 focus:outline-none"
                aria-label="it'smatapanda Home"
              >
                it&apos;smatapanda
              </Link>
            </div>

            {/* Right: Search, Wishlist, Account, Cart Bag, Currency */}
            <div className="flex items-center justify-end gap-1 sm:gap-2 z-10 ml-auto">
              {/* Search Icon Button (Icon only) */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchOpen(true)}
                className={`h-9 w-9 transition-colors ${
                  menuOpen
                    ? "text-[#396254] hover:bg-[#396254]/10"
                    : "text-black hover:bg-neutral-100"
                }`}
                aria-label="Cari produk"
                title="Search"
              >
                <Search className="h-5 w-5 stroke-[1.75]" />
              </Button>

              {/* Wishlist Icon Button with live badge */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={openWishlist}
                  className={`h-9 w-9 relative transition-colors ${
                    menuOpen
                      ? "text-[#396254] hover:bg-[#396254]/10"
                      : "text-black hover:bg-neutral-100"
                  }`}
                  aria-label={`Wishlist (${wishlistCount} items)`}
                  title="Wishlist"
                >
                  <Heart
                    className={`h-5 w-5 stroke-[1.75] transition-all duration-300 ${
                      wishlistCount > 0 ? "fill-red-500 text-red-500" : ""
                    } ${wishlistBump ? "animate-heart-pop" : ""}`}
                  />
                  {wishlistCount > 0 && (
                    <span
                      className={`absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center shadow-xs transition-transform duration-300 ${
                        wishlistBump ? "scale-125" : "scale-100"
                      }`}
                    >
                      {wishlistCount}
                    </span>
                  )}
                </Button>
              </div>

              {/* Account Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-9 w-9 relative transition-colors ${
                      menuOpen
                        ? "text-[#396254] hover:bg-[#396254]/10"
                        : "text-black hover:bg-neutral-100"
                    }`}
                    aria-label="Akun Pengguna"
                  >
                    <User className="h-5 w-5 stroke-[1.75]" />
                    {isAuthenticated && (
                      <span className="absolute bottom-1 right-1 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-2 bg-white text-black shadow-xl border border-neutral-200">
                  {isAuthenticated ? (
                    <>
                      <div className="px-3 py-2 border-b border-neutral-100 mb-1">
                        <p className="text-xs font-bold text-neutral-900 truncate">
                          {session?.user?.name || "Customer it'smatapanda"}
                        </p>
                        <p className="text-[11px] text-neutral-500 truncate">
                          {session?.user?.email}
                        </p>
                      </div>
                      <DropdownMenuItem asChild className="cursor-pointer py-2">
                        <Link href="/account" className="flex items-center gap-2.5 text-xs text-neutral-800 hover:text-black font-medium">
                          <User className="h-3.5 w-3.5" />
                          <span>Akun Saya</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="cursor-pointer py-2">
                        <Link href="/account/orders" className="flex items-center gap-2.5 text-xs text-neutral-800 hover:text-black font-semibold">
                          <Package className="h-3.5 w-3.5" />
                          <span>Pesanan Saya</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="cursor-pointer py-2">
                        <Link href="/tracking" className="flex items-center gap-2.5 text-xs text-neutral-700 hover:text-black">
                          <Truck className="h-3.5 w-3.5" />
                          <span>Lacak Pesanan (Cek Resi)</span>
                        </Link>
                      </DropdownMenuItem>
                      <div className="border-t border-neutral-100 my-1" />
                      <DropdownMenuItem
                        onClick={() => signOut({ callbackUrl: "/" })}
                        className="cursor-pointer py-2 text-xs text-red-600 hover:text-red-700 flex items-center gap-2.5"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        <span>Keluar (Sign Out)</span>
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <div className="px-3 py-1.5 border-b border-neutral-100 mb-1">
                        <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                          Customer Portal
                        </p>
                      </div>
                      <DropdownMenuItem asChild className="cursor-pointer py-2">
                        <Link href="/tracking" className="flex items-center gap-2.5 text-xs text-neutral-900 hover:text-black font-semibold">
                          <Truck className="h-3.5 w-3.5" />
                          <span>Lacak Pesanan (Cek Resi)</span>
                        </Link>
                      </DropdownMenuItem>
                      <div className="border-t border-neutral-100 my-1" />
                      <DropdownMenuItem asChild className="cursor-pointer py-2">
                        <Link href="/account/login" className="flex items-center gap-2.5 text-xs text-neutral-800 hover:text-black font-medium">
                          <LogIn className="h-3.5 w-3.5" />
                          <span>Masuk ke Akun</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="cursor-pointer py-2">
                        <Link href="/account/register" className="flex items-center gap-2.5 text-xs text-neutral-700 hover:text-black">
                          <UserPlus className="h-3.5 w-3.5" />
                          <span>Daftar Akun Baru</span>
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Cart Drawer Trigger */}
              <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`relative h-9 w-9 transition-colors ${
                      menuOpen
                        ? "text-[#396254] hover:bg-[#396254]/10"
                        : "text-black hover:bg-neutral-100"
                    }`}
                    aria-label="Keranjang Belanja"
                  >
                    <ShoppingBag
                      className={`h-5 w-5 stroke-[1.75] transition-transform duration-300 ${
                        cartBump ? "scale-115 animate-playful-bounce" : "scale-100"
                      }`}
                    />
                    {totalItems > 0 && (
                      <span
                        className={`absolute -top-0.5 -right-0.5 h-4 min-w-[16px] px-1 rounded-full text-[10px] font-semibold flex items-center justify-center leading-none transition-transform duration-300 ${
                          cartBump ? "scale-125 animate-playful-bounce" : "scale-100"
                        } ${
                          menuOpen ? "bg-[#396254] text-white" : "bg-black text-white"
                        }`}
                      >
                        {totalItems}
                      </span>
                    )}
                  </Button>
                </SheetTrigger>

                {/* Cart Drawer Content */}
                <SheetContent
                  side="right"
                  className="w-full sm:max-w-md bg-[#fafaf8] dark:bg-neutral-950 p-0 flex flex-col z-50 border-l border-[#396254]/10 dark:border-neutral-800"
                >
                  <SheetHeader className="px-6 py-5 border-b border-[#396254]/10 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md text-left">
                    <SheetTitle className="text-lg font-black tracking-normal text-[#396254] dark:text-[#dcf58d] flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <ShoppingBag className="h-5 w-5" />
                        <span>Tas Belanja Kamu</span>
                      </span>
                      <span className="px-3 py-1 rounded-full bg-[#d5c6ff]/30 text-[#396254] dark:text-[#d5c6ff] text-xs font-bold shadow-xs">
                        {totalItems} barang
                      </span>
                    </SheetTitle>
                  </SheetHeader>

                  {items.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
                      <div className="w-20 h-20 rounded-3xl bg-[#d5c6ff]/30 text-[#396254] dark:text-[#d5c6ff] flex items-center justify-center mb-4 rotate-[-3deg] shadow-sm">
                        <ShoppingBag className="h-8 w-8" />
                      </div>
                      <h3 className="text-base font-black text-[#396254] dark:text-white mb-1">
                        Tas Belanja Masih Kosong
                      </h3>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-6 max-w-xs leading-relaxed">
                        Yuk jelajahi koleksi merchandise gemas it&apos;smatapanda dan bawa pulang produk favoritmu!
                      </p>
                      <Button
                        onClick={() => setIsOpen(false)}
                        asChild
                        className="rounded-full bg-[#396254] hover:bg-[#2e5044] text-[#dcf58d] px-8 py-5 text-xs font-black shadow-md hover:-translate-y-0.5 active:scale-95 transition-all"
                      >
                        <Link href="/new-arrivals">Mulai Belanja</Link>
                      </Button>
                    </div>
                  ) : (
                    <>
                      {/* Shopee-style Paket Diskon Progress Banner */}
                      {bundleProgress && bundleProgress.appliedCampaign && (
                        <div className="px-6 py-2.5 bg-white dark:bg-neutral-900 border-b border-[#396254]/10 dark:border-neutral-800">
                          {bundleProgress.isEligible ? (
                            <div className="bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-2xl p-2.5 flex items-center justify-between gap-2 shadow-xs">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-7 h-7 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0">
                                  <Check className="h-4 w-4 stroke-[3]" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-black text-purple-900 dark:text-purple-200 truncate">
                                    Paket Diskon {bundleProgress.discountValue}% Aktif!
                                  </p>
                                  <p className="text-[10px] text-purple-700 dark:text-purple-300">
                                    Hemat {formatPrice(bundleDiscount)} untuk semua produk di keranjang.
                                  </p>
                                </div>
                              </div>
                              <span className="text-[10px] font-black bg-purple-200 dark:bg-purple-800 text-purple-900 dark:text-purple-100 px-2 py-0.5 rounded-full shrink-0">
                                {bundleProgress.discountValue}% OFF
                              </span>
                            </div>
                          ) : (
                            <div className="bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl p-2.5 space-y-1.5 shadow-xs">
                              <div className="flex items-center justify-between text-xs font-bold text-amber-900 dark:text-amber-200">
                                <span className="flex items-center gap-1.5 truncate">
                                  <Sparkles className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                                  <span className="truncate">{bundleProgress.name || "Paket Diskon"}</span>
                                </span>
                                <span className="text-[11px] font-black text-amber-800 dark:text-amber-300 shrink-0">
                                  Kurang {formatPrice(bundleProgress.remainingToThreshold)}
                                </span>
                              </div>
                              <div className="w-full bg-amber-200/50 dark:bg-neutral-800 h-2 rounded-full overflow-hidden">
                                <div
                                  className="bg-amber-500 dark:bg-amber-400 h-full transition-all duration-500 rounded-full"
                                  style={{ width: `${bundleProgress.progressPercent}%` }}
                                />
                              </div>
                              <p className="text-[10px] text-amber-700 dark:text-amber-300 leading-tight">
                                Tambah belanja {formatPrice(bundleProgress.remainingToThreshold)} lagi untuk dapat diskon {bundleProgress.discountValue}% semua produk!
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Shopee-style Paket Hadiah Progress Banner */}
                      {giftProgress && giftProgress.appliedCampaign && (
                        <div className="px-6 py-2.5 bg-white dark:bg-neutral-900 border-b border-[#396254]/10 dark:border-neutral-800">
                          {giftProgress.isEligible ? (
                            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-2.5 flex items-center justify-between gap-2 shadow-xs">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                                  <Gift className="h-4 w-4 stroke-[2.5]" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-black text-emerald-900 dark:text-emerald-200 truncate">
                                    Hadiah Gratis Aktif!
                                  </p>
                                  <p className="text-[10px] text-emerald-700 dark:text-emerald-300 truncate">
                                    Gratis {giftProgress.giftQuantity}x {giftProgress.giftProductName || "Hadiah"} otomatis ditambahkan!
                                  </p>
                                </div>
                              </div>
                              <span className="text-[10px] font-black bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100 px-2 py-0.5 rounded-full shrink-0">
                                GRATIS
                              </span>
                            </div>
                          ) : (
                            <div className="bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-2.5 space-y-1.5 shadow-xs">
                              <div className="flex items-center justify-between text-xs font-bold text-emerald-900 dark:text-emerald-200">
                                <span className="flex items-center gap-1.5 truncate">
                                  <Gift className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                  <span className="truncate">Gratis {giftProgress.giftProductName || "Hadiah"}</span>
                                </span>
                                <span className="text-[11px] font-black text-emerald-800 dark:text-emerald-300 shrink-0">
                                  Kurang {formatPrice(giftProgress.remainingToThreshold)}
                                </span>
                              </div>
                              <div className="w-full bg-emerald-200/50 dark:bg-neutral-800 h-2 rounded-full overflow-hidden">
                                <div
                                  className="bg-emerald-500 dark:bg-emerald-400 h-full transition-all duration-500 rounded-full"
                                  style={{ width: `${giftProgress.progressPercent}%` }}
                                />
                              </div>
                              <p className="text-[10px] text-emerald-700 dark:text-emerald-300 leading-tight">
                                Tambah belanja {formatPrice(giftProgress.remainingToThreshold)} lagi untuk dapat gratis {giftProgress.giftProductName || "Hadiah"}!
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Cart Items List */}
                      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                        {items.map((item) => (
                          <div
                            key={item.key}
                            className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-[#396254]/10 dark:border-neutral-800 flex gap-3.5 shadow-xs transition-all hover:border-[#396254]/30"
                          >
                            <Link
                              href={`/products/${item.productId}`}
                              onClick={() => setIsOpen(false)}
                              className="relative h-22 w-20 shrink-0 bg-[#fafaf8] dark:bg-neutral-800 overflow-hidden block border-2 border-[#396254]/10 rounded-2xl"
                            >
                              <Image
                                src={item.image}
                                alt={item.name}
                                fill
                                sizes="80px"
                                className="object-cover"
                              />
                            </Link>

                            <div className="flex-1 min-w-0 flex flex-col justify-between">
                              <div>
                                <Link
                                  href={`/products/${item.productId}`}
                                  onClick={() => setIsOpen(false)}
                                  className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white hover:text-[#396254] dark:hover:text-[#dcf58d] line-clamp-2 leading-snug transition-colors"
                                >
                                  {item.name}
                                </Link>
                                <p className="mt-1 text-xs font-black text-[#396254] dark:text-[#dcf58d]">
                                  {formatPrice(item.priceNumber)}
                                </p>
                                <p className="mt-1">
                                  <span className="inline-block px-2 py-0.5 rounded-full bg-[#d5c6ff]/30 text-[#396254] dark:text-[#d5c6ff] font-bold text-[10px]">
                                    {item.size} &middot; {item.color}
                                  </span>
                                </p>
                              </div>

                              <div className="mt-3 flex items-center justify-between">
                                <div className="inline-flex items-center border-2 border-[#396254]/20 rounded-full overflow-hidden h-7.5 bg-[#fafaf8] dark:bg-neutral-800">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateQuantity(item.key, item.quantity - 1)
                                    }
                                    aria-label="Decrease quantity"
                                    className="h-full px-2 text-[#396254] dark:text-neutral-300 hover:bg-[#396254]/10 transition-colors"
                                  >
                                    <Minus className="h-3 w-3" />
                                  </button>
                                  <span className="px-2 text-xs font-black text-[#396254] dark:text-white min-w-[20px] text-center">
                                    {item.quantity}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateQuantity(item.key, item.quantity + 1)
                                    }
                                    aria-label="Increase quantity"
                                    className="h-full px-2 text-[#396254] dark:text-neutral-300 hover:bg-[#396254]/10 transition-colors"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </button>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => removeItem(item.key)}
                                  aria-label="Remove item"
                                  className="text-neutral-400 hover:text-rose-600 transition-colors p-1.5 hover:scale-110"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}

                        {/* Free Gift Item (if eligible) */}
                        {giftItem && (
                          <div
                            key={giftItem.key}
                            className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border-2 border-emerald-300 dark:border-emerald-700 flex gap-3.5 shadow-xs transition-all relative overflow-hidden"
                          >
                            <div className="relative h-22 w-20 shrink-0 bg-white dark:bg-neutral-800 overflow-hidden block border-2 border-emerald-200 rounded-2xl">
                              <Image
                                src={giftItem.image}
                                alt={giftItem.name}
                                fill
                                sizes="80px"
                                className="object-cover"
                              />
                            </div>

                            <div className="flex-1 min-w-0 flex flex-col justify-between">
                              <div>
                                <div className="flex items-center gap-1.5 mb-1">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-600 text-white font-extrabold text-[9px] uppercase tracking-wider">
                                    <Gift className="h-2.5 w-2.5" /> Hadiah Gratis
                                  </span>
                                </div>
                                <p className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white line-clamp-2 leading-snug">
                                  {giftItem.name}
                                </p>
                                <div className="mt-1 flex items-center gap-2">
                                  <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">
                                    Rp 0 (GRATIS)
                                  </span>
                                </div>
                                <p className="mt-1">
                                  <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 font-bold text-[10px]">
                                    Jumlah: {giftItem.quantity} pcs
                                  </span>
                                </p>
                              </div>

                              <div className="mt-2 text-[10px] text-emerald-700 dark:text-emerald-400 font-medium italic">
                                Bonus otomatis memenuhi syarat belanja
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Cart Drawer Footer with Coupon & Totals breakdown */}
                      <div className="border-t border-[#396254]/10 dark:border-neutral-800 px-6 py-4 bg-white dark:bg-neutral-900 space-y-3">
                        {/* Coupon / Voucher Section */}
                        <div className="border-b border-[#396254]/10 dark:border-neutral-800 pb-3">
                          {appliedCoupon ? (
                            <div className="bg-[#dcf58d]/30 dark:bg-[#dcf58d]/10 border-2 border-[#396254]/20 rounded-2xl p-2.5 flex items-center justify-between gap-2 shadow-xs">
                              <div className="flex items-center gap-2 min-w-0">
                                <Ticket className="h-4 w-4 text-[#396254] dark:text-[#dcf58d] shrink-0" />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-mono text-xs font-black text-[#396254] dark:text-white tracking-wider uppercase">
                                      {appliedCoupon.code}
                                    </span>
                                    {couponDiscount > 0 ? (
                                      <span className="text-[10px] bg-[#dcf58d] text-[#396254] font-black px-2 py-0.5 rounded-full shadow-xs">
                                        Hemat {formatPrice(couponDiscount)}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                                        Min. belanja {formatPrice(appliedCoupon.minSpend)}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">{appliedCoupon.name}</p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  removeCoupon();
                                  setDrawerCouponMsg(null);
                                }}
                                className="p-1 text-rose-500 hover:text-rose-700 transition-colors"
                                title="Hapus kupon"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-bold text-[#396254] dark:text-neutral-300 block">
                                Punya kode kupon voucher?
                              </label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={drawerCouponInput}
                                  onChange={(e) => {
                                    setDrawerCouponInput(e.target.value.toUpperCase());
                                    setDrawerCouponMsg(null);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      handleApplyDrawerCoupon();
                                    }
                                  }}
                                  placeholder="KODE KUPON (MISAL: MATAPANDA10)"
                                  className="flex-1 h-9 px-3.5 text-xs uppercase font-mono tracking-wider border-2 border-neutral-200 dark:border-neutral-700 bg-[#fafaf8] dark:bg-neutral-800 rounded-full focus:bg-white focus:border-[#396254] focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={handleApplyDrawerCoupon}
                                  disabled={isApplyingDrawerCoupon || !drawerCouponInput.trim()}
                                  className="h-9 px-4 text-xs bg-[#396254] text-[#dcf58d] hover:bg-[#2e5044] disabled:opacity-50 transition-all uppercase font-black tracking-wider rounded-full hover:-translate-y-0.5 active:scale-95 shadow-sm"
                                >
                                  {isApplyingDrawerCoupon ? "..." : "Pakai"}
                                </button>
                              </div>
                            </div>
                          )}

                          {drawerCouponMsg && (
                            <p
                              className={`mt-1.5 text-[11px] ${
                                drawerCouponMsg.error ? "text-rose-600 font-bold" : "text-emerald-600 font-bold"
                              }`}
                            >
                              {drawerCouponMsg.text}
                            </p>
                          )}
                        </div>

                        {/* Totals Breakdown */}
                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-400">
                            <span>Subtotal</span>
                            <span className="font-bold text-neutral-900 dark:text-white">{formatPrice(subtotal)}</span>
                          </div>

                          {bundleDiscount > 0 && (
                            <div className="flex items-center justify-between text-purple-700 dark:text-purple-300 font-bold bg-purple-50 dark:bg-purple-950/40 px-2.5 py-1.5 rounded-xl border border-purple-200 dark:border-purple-800">
                              <span className="flex items-center gap-1">
                                <Sparkles className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                                <span>Paket Diskon ({bundleProgress?.discountValue}%)</span>
                              </span>
                              <span>-{formatPrice(bundleDiscount)}</span>
                            </div>
                          )}

                          {giftItem && (
                            <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                              <span className="flex items-center gap-1 truncate">
                                <Gift className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <span className="truncate">Paket Hadiah ({giftItem.quantity}x {giftProgress?.giftProductName || "Hadiah"})</span>
                              </span>
                              <span className="uppercase text-[11px] font-black text-emerald-600 dark:text-emerald-400 shrink-0">GRATIS</span>
                            </div>
                          )}

                          {appliedCoupon && couponDiscount > 0 && (
                            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                              <span className="flex items-center gap-1">
                                <Ticket className="h-3 w-3" />
                                <span>Kupon ({appliedCoupon.code})</span>
                              </span>
                              <span>-{formatPrice(couponDiscount)}</span>
                            </div>
                          )}

                          <div className="flex items-center justify-between border-t border-[#396254]/10 dark:border-neutral-800 pt-2">
                            <span className="text-sm font-black text-[#396254] dark:text-white">
                              Estimasi Total
                            </span>
                            <span className="text-base font-black text-[#396254] dark:text-[#dcf58d]">
                              {formatPrice(totalAfterDiscounts)}
                            </span>
                          </div>
                        </div>

                        <p className="text-[11px] text-neutral-500">
                          Ongkos kirim &amp; voucher akan dihitung saat checkout.
                        </p>

                        <Link
                          href="/checkout"
                          onClick={() => setIsOpen(false)}
                          className="w-full h-12 bg-[#396254] hover:bg-[#2e5044] text-[#dcf58d] text-xs tracking-wider uppercase font-black transition-all flex items-center justify-center rounded-2xl shadow-md hover:-translate-y-0.5 active:scale-95 gap-2"
                        >
                          <span>Lanjut ke Checkout</span>
                        </Link>
                      </div>
                    </>
                  )}
                </SheetContent>
              </Sheet>

              {/* Currency Selector */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-9 pl-2 pr-1.5 gap-1.5 text-xs font-semibold focus-visible:ring-0 transition-colors ${
                      menuOpen
                        ? "text-[#396254] hover:bg-[#396254]/10"
                        : "text-black hover:bg-neutral-100"
                    }`}
                  >
                    <CurrencyFlag code={currency} />
                    <span className="hidden sm:inline">{currency}</span>
                    <ChevronDown className="h-3 w-3 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36 p-1 bg-white text-black shadow-lg border border-neutral-200">
                  {CURRENCIES.map((c) => (
                    <DropdownMenuItem
                      key={c.code}
                      onClick={() => setCurrency(c.code)}
                      className="cursor-pointer text-xs flex items-center justify-between py-2"
                    >
                      <div className="flex items-center gap-2">
                        <CurrencyFlag code={c.code} />
                        <span className={currency === c.code ? "font-bold text-black" : "text-neutral-700"}>
                          {c.code}
                        </span>
                      </div>
                      {currency === c.code && <Check className="h-3 w-3 text-black" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 2. SLIDE-FROM-LEFT PARTIAL SIDEBAR MENU (Beyond The Vines)     */}
        {/* Starts dynamically right below header, partial width           */}
        {/* No backdrop/dim, floating over page content without push      */}
        {/* ============================================================== */}
        <aside
          ref={menuRef}
          aria-label="Navigation Sidebar"
          style={{
            top: `${headerHeight}px`,
            height: `calc(100vh - ${headerHeight}px)`,
          }}
          className={`fixed left-0 z-40 w-[80vw] max-w-[380px] sm:w-[380px] bg-[#d5c6ff] text-[#396254] shadow-2xl border-0 transition-transform duration-300 ease-in-out ${
            menuOpen ? "translate-x-0 pointer-events-auto" : "-translate-x-full pointer-events-none"
          }`}
        >
          <nav
            aria-label="Navigation Menu"
            aria-hidden={!menuOpen}
            className="w-full h-full flex flex-col justify-between overflow-y-auto px-6 sm:px-8 py-8"
          >
            {/* Main Category Links (Large Bold Typography) */}
            <div className="flex flex-col space-y-4">
              <Link
                href="/new-arrivals"
                onClick={() => setMenuOpen(false)}
                className="text-3xl sm:text-4xl font-bold tracking-tight text-[#396254] hover:text-white transition-colors"
              >
                New In
              </Link>

              {categoriesList.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/categories/${cat.slug}`}
                  onClick={() => setMenuOpen(false)}
                  className="text-3xl sm:text-4xl font-bold tracking-tight text-[#396254] hover:text-white transition-colors"
                >
                  {cat.name}
                </Link>
              ))}
            </div>

            {/* Bottom Menu Section: Sign In / Track / Store Locator / Currency */}
            <div className="pt-8 mt-8 border-t border-[#396254]/20 flex flex-col space-y-4 text-sm font-medium text-[#396254]/90">
              <div className="flex flex-col space-y-2.5">
                {isAuthenticated ? (
                  <>
                    <div className="text-xs text-[#396254]/80 font-normal">
                      Halo, <span className="font-semibold text-[#396254]">{session?.user?.name || "Member"}</span>
                    </div>
                    <Link
                      href="/account/orders"
                      onClick={() => setMenuOpen(false)}
                      className="hover:underline hover:text-white text-[#396254] transition-colors"
                    >
                      Pesanan Saya
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        signOut({ callbackUrl: "/" });
                      }}
                      className="text-left text-red-600 hover:text-white transition-colors"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/account/login"
                      onClick={() => setMenuOpen(false)}
                      className="hover:underline hover:text-white text-[#396254] transition-colors"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/account/register"
                      onClick={() => setMenuOpen(false)}
                      className="hover:underline hover:text-white text-xs text-[#396254]/80 transition-colors"
                    >
                      Create an Account
                    </Link>
                  </>
                )}

                <Link
                  href="/tracking"
                  onClick={() => setMenuOpen(false)}
                  className="group hover:underline hover:text-white flex items-center gap-2 text-[#396254] transition-colors"
                >
                  <Truck className="h-3.5 w-3.5 text-[#396254] group-hover:text-white transition-colors" />
                  <span>Track Order (Cek Resi)</span>
                </Link>

                <Link
                  href="/contact"
                  onClick={() => setMenuOpen(false)}
                  className="hover:underline hover:text-white text-[#396254] transition-colors"
                >
                  Need Help?
                </Link>

                <Link
                  href="/about"
                  onClick={() => setMenuOpen(false)}
                  className="hover:underline hover:text-white text-[#396254] transition-colors"
                >
                  Store Locator
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    openWishlist();
                  }}
                  className="group text-left hover:underline hover:text-white flex items-center justify-between w-full text-[#396254] transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span>Wishlist</span>
                    <Heart className="h-4 w-4 fill-red-500 text-red-500 inline" />
                  </span>
                  {wishlistCount > 0 && (
                    <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-[#396254] group-hover:bg-white group-hover:text-[#396254] text-white text-xs font-bold flex items-center justify-center transition-colors">
                      {wishlistCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Currency Selector Pill */}
              <div className="pt-2 flex items-center gap-2">
                <span className="text-xs text-[#396254]/80">Currency:</span>
                <div className="inline-flex rounded-full bg-[#396254]/10 p-1 border border-[#396254]/20">
                  {CURRENCIES.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => setCurrency(c.code)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold uppercase transition-all ${
                        currency === c.code
                          ? "bg-[#396254] text-white shadow-sm"
                          : "text-[#396254]/80 hover:text-white"
                      }`}
                    >
                      {c.code}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </nav>
        </aside>
      </header>

      {/* ============================================================== */}
      {/* 3. SEARCH MODAL DIALOG                                        */}
      {/* ============================================================== */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="max-w-2xl p-6 sm:p-8 bg-[#fafaf8] dark:bg-neutral-900 rounded-3xl border-2 border-[#396254]/20 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-[#396254] dark:text-[#dcf58d] flex items-center gap-2">
              <Search className="h-5 w-5" />
              <span>Cari Produk</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ketik nama tas, baju, atau SKU (misal: Dumpling Bag, Tote, T-Shirt)..."
                autoFocus
                className="w-full h-13 pl-12 pr-4 border-2 border-[#396254]/30 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm font-medium text-neutral-900 dark:text-white rounded-2xl focus:outline-none focus:border-[#396254] focus:ring-2 focus:ring-[#d5c6ff]/50 shadow-sm"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#396254] dark:text-[#dcf58d]" />
              {isSearching && (
                <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-[#396254]" />
              )}
            </div>

            {/* Quick Keyword Suggestions */}
            {!searchQuery && (
              <div className="space-y-2.5 pt-1">
                <span className="text-xs font-bold text-[#396254] dark:text-neutral-400 flex items-center gap-1.5">
                  <span>Pencarian Populer:</span>
                </span>
                <div className="flex gap-2 flex-wrap">
                  {["Dumpling Bag", "Tote Bag", "Sling Bag", "Backpack", "Puffer", "Pouch", "Canvas"].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setSearchQuery(tag)}
                      className="px-3.5 py-1.5 bg-[#d5c6ff]/30 dark:bg-white/10 hover:bg-[#396254] hover:text-[#dcf58d] text-[#396254] dark:text-[#d5c6ff] text-xs font-bold rounded-full transition-all hover:scale-105 active:scale-95 shadow-xs"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Live Search Results */}
            {searchQuery && (
              <div className="max-h-[360px] overflow-y-auto space-y-2 pr-1">
                {searchResults.length === 0 && !isSearching ? (
                  <div className="py-10 text-center text-xs text-neutral-500 space-y-2">
                    <Search className="h-8 w-8 mx-auto text-neutral-400 stroke-1" />
                    <p className="font-bold">Tidak ada produk yang cocok dengan &quot;{searchQuery}&quot;</p>
                  </div>
                ) : (
                  searchResults.map((product) => (
                    <Link
                      key={product.id}
                      href={`/products/${product.slug || product.id}`}
                      onClick={() => setSearchOpen(false)}
                      className="p-3 rounded-2xl bg-white dark:bg-neutral-800/60 border border-[#396254]/10 dark:border-neutral-700/60 flex items-center justify-between hover:border-[#396254] hover:shadow-xs transition-all group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="relative h-15 w-13 shrink-0 bg-neutral-100 overflow-hidden border-2 border-[#396254]/10 rounded-xl">
                          <Image
                            src={product.image}
                            alt={product.name}
                            fill
                            sizes="56px"
                            className="object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#d5c6ff]/30 text-[#396254] dark:text-[#d5c6ff] uppercase">
                            {product.categoryName}
                          </span>
                          <p className="text-sm font-bold text-neutral-900 dark:text-white truncate group-hover:text-[#396254] dark:group-hover:text-[#dcf58d] mt-1 transition-colors">
                            {product.name}
                          </p>
                          <p className="text-[11px] font-mono text-neutral-400">
                            SKU: {product.sku}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-xs font-black text-[#396254] dark:text-[#dcf58d]">
                          {formatPrice(product.discountPrice ?? product.price)}
                        </p>
                        {product.discountPrice && (
                          <p className="text-[10px] text-neutral-400 line-through">
                            {formatPrice(product.price)}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Wishlist Slide-Over Sheet Drawer */}
      <WishlistDrawer />
    </>
  );
}
