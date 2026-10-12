"use client";

import * as React from "react";

export type WishlistItem = {
  id: string;
  slug: string;
  name: string;
  price: string;
  priceNumber: number;
  discountPrice?: string | null;
  discountPriceNumber?: number | null;
  image: string;
  categoryName?: string;
  inStock?: boolean;
  addedAt: string;
};

export type AddToWishlistInput = {
  id: string;
  slug: string;
  name: string;
  price: string | number;
  priceNumber?: number;
  discountPrice?: string | null;
  discountPriceNumber?: number | null;
  image: string;
  categoryName?: string;
  inStock?: boolean;
};

type WishlistContextType = {
  items: WishlistItem[];
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
  openWishlist: () => void;
  closeWishlist: () => void;
  addToWishlist: (item: AddToWishlistInput) => void;
  removeFromWishlist: (id: string) => void;
  toggleWishlist: (item: AddToWishlistInput) => boolean; // returns true if added, false if removed
  isWishlisted: (id: string) => boolean;
  clearWishlist: () => void;
  totalCount: number;
};

const WishlistContext = React.createContext<WishlistContextType | null>(null);

const STORAGE_KEY = "itspanda_wishlist_v1";

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<WishlistItem[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const [isInitialized, setIsInitialized] = React.useState(false);

  // Load from localStorage on mount
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setItems(parsed);
        }
      }
    } catch (e) {
      console.warn("Failed to load wishlist from storage:", e);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // Save to localStorage on change
  React.useEffect(() => {
    if (!isInitialized) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn("Failed to save wishlist to storage:", e);
    }
  }, [items, isInitialized]);

  const openWishlist = React.useCallback(() => setIsDrawerOpen(true), []);
  const closeWishlist = React.useCallback(() => setIsDrawerOpen(false), []);

  const parseNumber = (val: string | number | undefined): number => {
    if (typeof val === "number") return val;
    if (!val) return 0;
    const clean = String(val).replace(/[^0-9]/g, "");
    return Number(clean) || 0;
  };

  const formatPriceStr = (val: string | number): string => {
    if (typeof val === "string" && val.includes("Rp")) return val;
    const num = typeof val === "number" ? val : parseNumber(val);
    return `Rp ${new Intl.NumberFormat("id-ID").format(num)}`;
  };

  const addToWishlist = React.useCallback((input: AddToWishlistInput) => {
    setItems((prev) => {
      if (prev.some((item) => item.id === input.id)) {
        return prev;
      }
      const priceNum = input.priceNumber ?? parseNumber(input.price);
      const discPriceNum =
        input.discountPriceNumber ??
        (input.discountPrice ? parseNumber(input.discountPrice) : null);

      const newItem: WishlistItem = {
        id: input.id,
        slug: input.slug,
        name: input.name,
        price: formatPriceStr(input.price),
        priceNumber: priceNum,
        discountPrice: input.discountPrice ? formatPriceStr(input.discountPrice) : null,
        discountPriceNumber: discPriceNum,
        image: input.image,
        categoryName: input.categoryName || "Bag",
        inStock: input.inStock ?? true,
        addedAt: new Date().toISOString(),
      };
      return [newItem, ...prev];
    });
  }, []);

  const removeFromWishlist = React.useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const toggleWishlist = React.useCallback(
    (input: AddToWishlistInput): boolean => {
      let isAdded = false;
      setItems((prev) => {
        const exists = prev.some((item) => item.id === input.id);
        if (exists) {
          isAdded = false;
          return prev.filter((item) => item.id !== input.id);
        } else {
          isAdded = true;
          const priceNum = input.priceNumber ?? parseNumber(input.price);
          const discPriceNum =
            input.discountPriceNumber ??
            (input.discountPrice ? parseNumber(input.discountPrice) : null);

          const newItem: WishlistItem = {
            id: input.id,
            slug: input.slug,
            name: input.name,
            price: formatPriceStr(input.price),
            priceNumber: priceNum,
            discountPrice: input.discountPrice ? formatPriceStr(input.discountPrice) : null,
            discountPriceNumber: discPriceNum,
            image: input.image,
            categoryName: input.categoryName || "Bag",
            inStock: input.inStock ?? true,
            addedAt: new Date().toISOString(),
          };
          return [newItem, ...prev];
        }
      });
      return isAdded;
    },
    []
  );

  const isWishlisted = React.useCallback(
    (id: string): boolean => {
      return items.some((item) => item.id === id);
    },
    [items]
  );

  const clearWishlist = React.useCallback(() => {
    setItems([]);
  }, []);

  const value = React.useMemo<WishlistContextType>(
    () => ({
      items,
      isDrawerOpen,
      setIsDrawerOpen,
      openWishlist,
      closeWishlist,
      addToWishlist,
      removeFromWishlist,
      toggleWishlist,
      isWishlisted,
      clearWishlist,
      totalCount: items.length,
    }),
    [
      items,
      isDrawerOpen,
      openWishlist,
      closeWishlist,
      addToWishlist,
      removeFromWishlist,
      toggleWishlist,
      isWishlisted,
      clearWishlist,
    ]
  );

  return (
    <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = React.useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
}
