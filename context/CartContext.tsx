"use client";

import * as React from "react";
import {
  type CurrencyCode,
  formatPriceByCurrency,
} from "@/lib/products";
import { type DiscountCampaign } from "@/lib/discount-store";
import {
  calculateBundlePackageDiscount,
  calculateGiftPackageReward,
  type BundleDiscountResult,
  type GiftPackageResult,
} from "@/lib/discount-engine";

export type CartItem = {
  key: string;
  productId: string;
  name: string;
  price: string;
  priceNumber: number;
  image: string;
  size: string;
  color: string;
  quantity: number;
  maxStock?: number;
};

export type AppliedCoupon = {
  id: string;
  code: string;
  name: string;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: number;
  minSpend: number;
  maxDiscount?: number | null;
  discountAmount: number;
};

type AddToCartInput = {
  productId: string;
  name: string;
  price: string;
  priceNumber: number;
  image: string;
  size: string;
  color: string;
  quantity?: number;
  maxStock?: number;
};

type CartContextType = {
  items: CartItem[];
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  addItem: (item: AddToCartInput) => void;
  updateQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => void;
  formatPrice: (amountInIDR: number) => string;
  appliedCoupon: AppliedCoupon | null;
  couponDiscount: number;
  bundleDiscount: number;
  appliedBundle: DiscountCampaign | null;
  bundleProgress: BundleDiscountResult | null;
  appliedGiftPackage: DiscountCampaign | null;
  giftProgress: GiftPackageResult | null;
  giftItem: CartItem | null;
  totalDiscount: number;
  totalAfterDiscounts: number;
  totalAfterCoupon: number;
  activeDiscounts: DiscountCampaign[];
  refreshDiscounts: () => Promise<void>;
  applyCoupon: (code: string) => Promise<{ success: boolean; message: string }>;
  removeCoupon: () => void;
};

const CartContext = React.createContext<CartContextType | undefined>(undefined);

const STORAGE_KEY = "zodiac_cart_v1";
const CURRENCY_STORAGE_KEY = "zodiac_currency_v1";
const COUPON_STORAGE_KEY = "zodiac_coupon_v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<CartItem[]>([]);
  const [currency, setCurrencyState] = React.useState<CurrencyCode>("IDR");
  const [appliedCoupon, setAppliedCoupon] = React.useState<AppliedCoupon | null>(null);
  const [isOpen, setIsOpen] = React.useState(false);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setItems(parsed);
        }
      }
      const savedCurrency = window.localStorage.getItem(CURRENCY_STORAGE_KEY);
      if (
        savedCurrency === "IDR" ||
        savedCurrency === "USD" ||
        savedCurrency === "SGD" ||
        savedCurrency === "JPY"
      ) {
        setCurrencyState(savedCurrency);
      }
      const savedCoupon = window.localStorage.getItem(COUPON_STORAGE_KEY);
      if (savedCoupon) {
        setAppliedCoupon(JSON.parse(savedCoupon));
      }
    } catch {
      // Ignore storage errors
    }
    setHydrated(true);
  }, []);

  const [activeCampaigns, setActiveCampaigns] = React.useState<DiscountCampaign[]>([]);

  const refreshDiscounts = React.useCallback(async () => {
    try {
      const res = await fetch("/api/discounts/active");
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.activeCampaigns)) {
          setActiveCampaigns(json.activeCampaigns);
        }
      }
    } catch {
      // Ignore
    }
  }, []);

  React.useEffect(() => {
    refreshDiscounts();
  }, [refreshDiscounts]);

  React.useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Ignore storage errors
    }
  }, [items, hydrated]);

  React.useEffect(() => {
    if (!hydrated) return;
    try {
      if (appliedCoupon) {
        window.localStorage.setItem(COUPON_STORAGE_KEY, JSON.stringify(appliedCoupon));
      } else {
        window.localStorage.removeItem(COUPON_STORAGE_KEY);
      }
    } catch {
      // Ignore storage errors
    }
  }, [appliedCoupon, hydrated]);

  const setCurrency = React.useCallback((nextCurrency: CurrencyCode) => {
    setCurrencyState(nextCurrency);
    try {
      window.localStorage.setItem(CURRENCY_STORAGE_KEY, nextCurrency);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const formatPrice = React.useCallback(
    (amountInIDR: number) => formatPriceByCurrency(amountInIDR, currency),
    [currency]
  );

  const addItem = React.useCallback((input: AddToCartInput) => {
    const key = `${input.productId}__${input.size}__${input.color}`;
    const qtyToAdd = input.quantity ?? 1;

    setItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.key === key);
      if (existingIndex > -1) {
        const currentItem = prev[existingIndex];
        const max = input.maxStock ?? currentItem.maxStock ?? 999;
        const targetQty = Math.min(max, currentItem.quantity + qtyToAdd);

        const updated = [...prev];
        updated[existingIndex] = {
          ...currentItem,
          quantity: targetQty,
          maxStock: max,
        };
        return updated;
      }

      const max = input.maxStock ?? 999;
      return [
        ...prev,
        {
          key,
          productId: input.productId,
          name: input.name,
          price: input.price,
          priceNumber: input.priceNumber,
          image: input.image,
          size: input.size,
          color: input.color,
          quantity: Math.min(max, qtyToAdd),
          maxStock: input.maxStock,
        },
      ];
    });
  }, []);

  const updateQuantity = React.useCallback((key: string, quantity: number) => {
    setItems((prev) => {
      if (quantity <= 0) {
        return prev.filter((item) => item.key !== key);
      }
      return prev.map((item) => {
        if (item.key === key) {
          const max = item.maxStock ?? 999;
          return { ...item, quantity: Math.min(max, quantity) };
        }
        return item;
      });
    });
  }, []);

  const removeItem = React.useCallback((key: string) => {
    setItems((prev) => prev.filter((item) => item.key !== key));
  }, []);

  const clearCart = React.useCallback(() => {
    setItems([]);
    setAppliedCoupon(null);
  }, []);

  const totalItems = React.useMemo(
    () => items.reduce((acc, item) => acc + item.quantity, 0),
    [items]
  );

  const subtotal = React.useMemo(
    () => items.reduce((acc, item) => acc + item.priceNumber * item.quantity, 0),
    [items]
  );

  // Dynamic recalculation of Shopee-style Paket Diskon (Bundle Package Discount)
  const bundleResult = React.useMemo(() => {
    return calculateBundlePackageDiscount(items, activeCampaigns);
  }, [items, activeCampaigns]);

  const bundleDiscount = bundleResult.discountAmount;
  const appliedBundle = bundleResult.appliedCampaign;
  const bundleProgress = bundleResult;

  // Dynamic recalculation of Shopee-style Paket Hadiah (Free Gift Package)
  const giftResult = React.useMemo(() => {
    return calculateGiftPackageReward(items, activeCampaigns);
  }, [items, activeCampaigns]);

  const appliedGiftPackage = giftResult.isEligible ? giftResult.appliedCampaign : null;
  const giftProgress = giftResult;

  const giftItem: CartItem | null = React.useMemo(() => {
    if (!giftResult.isEligible || !giftResult.giftProductId) return null;
    return {
      key: `free_gift__${giftResult.giftProductId}`,
      productId: giftResult.giftProductId,
      name: `${giftResult.giftProductName || "Hadiah Gratis"} (Hadiah Gratis)`,
      price: "Rp 0",
      priceNumber: 0,
      image: giftResult.giftProductImage || "/placeholder.jpg",
      size: "Free",
      color: "Hadiah",
      quantity: giftResult.giftQuantity || 1,
      maxStock: 999,
    };
  }, [giftResult]);

  // Dynamic recalculation of coupon discount based on current subtotal and remaining amount
  const couponDiscount = React.useMemo(() => {
    if (!appliedCoupon) return 0;
    if (subtotal < appliedCoupon.minSpend) return 0;

    const remainingSubtotal = Math.max(0, subtotal - bundleDiscount);
    let disc = 0;
    if (appliedCoupon.discountType === "PERCENTAGE") {
      disc = Math.round(remainingSubtotal * (appliedCoupon.discountValue / 100));
      if (appliedCoupon.maxDiscount && appliedCoupon.maxDiscount > 0) {
        disc = Math.min(disc, appliedCoupon.maxDiscount);
      }
    } else {
      disc = Math.min(remainingSubtotal, appliedCoupon.discountValue);
    }
    return Math.min(disc, remainingSubtotal);
  }, [appliedCoupon, subtotal, bundleDiscount]);

  const totalDiscount = bundleDiscount + couponDiscount;
  const totalAfterDiscounts = Math.max(0, subtotal - totalDiscount);
  const totalAfterCoupon = totalAfterDiscounts;

  const applyCoupon = React.useCallback(
    async (code: string) => {
      try {
        const res = await fetch("/api/coupons/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, subtotal }),
        });
        const data = await res.json();
        if (!res.ok || !data.valid) {
          return {
            success: false,
            message: data.message || "Kode kupon tidak valid atau tidak dapat digunakan.",
          };
        }

        const couponData: AppliedCoupon = {
          ...data.coupon,
          discountAmount: data.discountAmount,
        };
        setAppliedCoupon(couponData);
        return {
          success: true,
          message: data.message || `Kupon ${couponData.code} berhasil diterapkan!`,
        };
      } catch (err) {
        console.error("Error validating coupon:", err);
        return { success: false, message: "Terjadi kesalahan jaringan saat memvalidasi kupon." };
      }
    },
    [subtotal]
  );

  const removeCoupon = React.useCallback(() => {
    setAppliedCoupon(null);
  }, []);

  return (
    <CartContext.Provider
      value={{
        items,
        isOpen,
        setIsOpen,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        totalItems,
        subtotal,
        currency,
        setCurrency,
        formatPrice,
        appliedCoupon,
        couponDiscount,
        bundleDiscount,
        appliedBundle,
        bundleProgress,
        appliedGiftPackage,
        giftProgress,
        giftItem,
        totalDiscount,
        totalAfterDiscounts,
        totalAfterCoupon,
        activeDiscounts: activeCampaigns,
        refreshDiscounts,
        applyCoupon,
        removeCoupon,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = React.useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return ctx;
}
