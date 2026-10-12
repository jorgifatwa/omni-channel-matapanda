"use client";

import * as React from "react";
import {
  type AdminBrand,
  type AdminCategory,
  type AdminCustomer,
  type AdminOrder,
  type AdminProduct,
  type AdminProductSeries,
  INITIAL_BRANDS,
  INITIAL_CATEGORIES,
  INITIAL_CUSTOMERS,
  INITIAL_ORDERS,
  INITIAL_PRODUCTS,
  INITIAL_SERIES,
} from "@/lib/admin-data";

type AdminStoreContextType = {
  products: AdminProduct[];
  brands: AdminBrand[];
  categories: AdminCategory[];
  series: AdminProductSeries[];
  orders: AdminOrder[];
  customers: AdminCustomer[];
  saveProduct: (product: AdminProduct) => void;
  deleteProduct: (id: string) => void;
  saveBrand: (brand: AdminBrand) => void;
  deleteBrand: (id: string) => void;
  saveCategory: (category: AdminCategory) => void;
  deleteCategory: (id: string) => void;
  saveSeries: (series: AdminProductSeries) => void;
  deleteSeries: (id: string) => void;
  addOrder: (order: AdminOrder) => void;
  updateOrder: (order: AdminOrder) => void;
};

const AdminStoreContext = React.createContext<
  AdminStoreContextType | undefined
>(undefined);

const KEYS = {
  products: "matapanda_admin_products_v1",
  brands: "matapanda_admin_brands_v1",
  categories: "matapanda_admin_categories_v1",
  series: "matapanda_admin_series_v1",
  orders: "matapanda_admin_orders_v1",
  customers: "matapanda_admin_customers_v1",
};

export function saveOrderLocally(order: AdminOrder): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(KEYS.orders);
    const existing: AdminOrder[] = raw ? JSON.parse(raw) : INITIAL_ORDERS;
    const updated = [order, ...existing.filter((o) => o.id !== order.id)];
    window.localStorage.setItem(KEYS.orders, JSON.stringify(updated));
  } catch (err) {
    console.error("Failed to save order locally:", err);
  }
}

export function AdminStoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [products, setProducts] =
    React.useState<AdminProduct[]>(INITIAL_PRODUCTS);
  const [brands, setBrands] = React.useState<AdminBrand[]>(INITIAL_BRANDS);
  const [categories, setCategories] =
    React.useState<AdminCategory[]>(INITIAL_CATEGORIES);
  const [series, setSeries] =
    React.useState<AdminProductSeries[]>(INITIAL_SERIES);
  const [orders, setOrders] = React.useState<AdminOrder[]>(INITIAL_ORDERS);
  const [customers] = React.useState<AdminCustomer[]>(INITIAL_CUSTOMERS);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    try {
      const p = window.localStorage.getItem(KEYS.products);
      if (p) {
        const storedProducts: AdminProduct[] = JSON.parse(p);
        const existingIds = new Set(storedProducts.map((sp) => sp.id));
        const missing = INITIAL_PRODUCTS.filter((ip) => !existingIds.has(ip.id));
        setProducts(missing.length > 0 ? [...storedProducts, ...missing] : storedProducts);
      }
      const b = window.localStorage.getItem(KEYS.brands);
      if (b) setBrands(JSON.parse(b));
      const c = window.localStorage.getItem(KEYS.categories);
      if (c) setCategories(JSON.parse(c));
      const s = window.localStorage.getItem(KEYS.series);
      if (s) {
        const storedSeries: AdminProductSeries[] = JSON.parse(s);
        const existingIds = new Set(storedSeries.map((ss) => ss.id));
        const missing = INITIAL_SERIES.filter((is) => !existingIds.has(is.id));
        setSeries(missing.length > 0 ? [...storedSeries, ...missing] : storedSeries);
      }
      const o = window.localStorage.getItem(KEYS.orders);
      if (o) setOrders(JSON.parse(o));
    } catch {
      // Ignore storage errors
    }
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(KEYS.products, JSON.stringify(products));
      window.localStorage.setItem(KEYS.brands, JSON.stringify(brands));
      window.localStorage.setItem(KEYS.categories, JSON.stringify(categories));
      window.localStorage.setItem(KEYS.series, JSON.stringify(series));
      window.localStorage.setItem(KEYS.orders, JSON.stringify(orders));
    } catch {
      // Ignore storage errors
    }
  }, [products, brands, categories, series, orders, hydrated]);

  const saveProduct = React.useCallback((product: AdminProduct) => {
    setProducts((prev) => {
      const idx = prev.findIndex((item) => item.id === product.id);
      if (idx > -1) {
        const next = [...prev];
        next[idx] = product;
        return next;
      }
      return [product, ...prev];
    });
  }, []);

  const deleteProduct = React.useCallback((id: string) => {
    setProducts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const saveBrand = React.useCallback((brand: AdminBrand) => {
    setBrands((prev) => {
      const idx = prev.findIndex((item) => item.id === brand.id);
      if (idx > -1) {
        const next = [...prev];
        next[idx] = brand;
        return next;
      }
      return [brand, ...prev];
    });
  }, []);

  const deleteBrand = React.useCallback((id: string) => {
    setBrands((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const saveCategory = React.useCallback((category: AdminCategory) => {
    setCategories((prev) => {
      const idx = prev.findIndex((item) => item.id === category.id);
      if (idx > -1) {
        const next = [...prev];
        next[idx] = category;
        return next;
      }
      return [category, ...prev];
    });
  }, []);

  const deleteCategory = React.useCallback((id: string) => {
    setCategories((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const saveSeries = React.useCallback((sItem: AdminProductSeries) => {
    setSeries((prev) => {
      const idx = prev.findIndex((item) => item.id === sItem.id);
      if (idx > -1) {
        const next = [...prev];
        next[idx] = sItem;
        return next;
      }
      return [sItem, ...prev];
    });
  }, []);

  const deleteSeries = React.useCallback((id: string) => {
    setSeries((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const addOrder = React.useCallback((order: AdminOrder) => {
    setOrders((prev) => [order, ...prev.filter((item) => item.id !== order.id)]);
  }, []);

  const updateOrder = React.useCallback((order: AdminOrder) => {
    setOrders((prev) =>
      prev.map((item) => (item.id === order.id ? order : item))
    );
  }, []);

  return (
    <AdminStoreContext.Provider
      value={{
        products,
        brands,
        categories,
        series,
        orders,
        customers,
        saveProduct,
        deleteProduct,
        saveBrand,
        deleteBrand,
        saveCategory,
        deleteCategory,
        saveSeries,
        deleteSeries,
        addOrder,
        updateOrder,
      }}
    >
      {children}
    </AdminStoreContext.Provider>
  );
}

export function useAdminStore() {
  const ctx = React.useContext(AdminStoreContext);
  if (!ctx) {
    throw new Error("useAdminStore must be used within AdminStoreProvider");
  }
  return ctx;
}
