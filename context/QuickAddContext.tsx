"use client";

import * as React from "react";
import { type StorefrontProduct } from "@/lib/data-fetcher";
import QuickAddModal from "@/components/QuickAddModal";

interface QuickAddContextType {
  openQuickAdd: (product: StorefrontProduct) => void;
  closeQuickAdd: () => void;
  activeProduct: StorefrontProduct | null;
}

const QuickAddContext = React.createContext<QuickAddContextType | undefined>(undefined);

export function QuickAddProvider({ children }: { children: React.ReactNode }) {
  const [activeProduct, setActiveProduct] = React.useState<StorefrontProduct | null>(null);

  const openQuickAdd = React.useCallback((product: StorefrontProduct) => {
    setActiveProduct(product);
  }, []);

  const closeQuickAdd = React.useCallback(() => {
    setActiveProduct(null);
  }, []);

  return (
    <QuickAddContext.Provider value={{ openQuickAdd, closeQuickAdd, activeProduct }}>
      {children}
      <QuickAddModal
        product={activeProduct}
        isOpen={!!activeProduct}
        onClose={closeQuickAdd}
      />
    </QuickAddContext.Provider>
  );
}

export function useQuickAdd() {
  const ctx = React.useContext(QuickAddContext);
  if (!ctx) {
    throw new Error("useQuickAdd must be used within QuickAddProvider");
  }
  return ctx;
}
