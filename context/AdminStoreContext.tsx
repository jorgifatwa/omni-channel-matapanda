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
  isLoading: boolean;
  saveProduct: (product: AdminProduct) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  saveBrand: (brand: AdminBrand) => Promise<void>;
  deleteBrand: (id: string) => Promise<void>;
  saveCategory: (category: AdminCategory) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  saveSeries: (series: AdminProductSeries) => Promise<void>;
  deleteSeries: (id: string) => Promise<void>;
  addOrder: (order: AdminOrder) => void;
  updateOrder: (order: AdminOrder) => Promise<void>;
  refreshAll: () => Promise<void>;
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

    // Also persist order to PostgreSQL database asynchronously
    fetch("/api/admin/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(order),
    }).catch((err) => {
      console.warn("[saveOrderLocally] Failed to sync order to PostgreSQL:", err);
    });
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
  const [customers, setCustomers] =
    React.useState<AdminCustomer[]>(INITIAL_CUSTOMERS);
  const [isLoading, setIsLoading] = React.useState(false);
  const [hydrated, setHydrated] = React.useState(false);

  // 1. Initial hydration from localStorage (instant cache)
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
      const cust = window.localStorage.getItem(KEYS.customers);
      if (cust) setCustomers(JSON.parse(cust));
    } catch {
      // Ignore storage errors
    }
    setHydrated(true);
  }, []);

  // 2. Fetch fresh data from PostgreSQL database
  const refreshAll = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [pRes, bRes, cRes, sRes, oRes, custRes] = await Promise.allSettled([
        fetch("/api/admin/products").then((r) => r.json()),
        fetch("/api/admin/brands").then((r) => r.json()),
        fetch("/api/admin/categories").then((r) => r.json()),
        fetch("/api/admin/series").then((r) => r.json()),
        fetch("/api/admin/orders").then((r) => r.json()),
        fetch("/api/admin/customers").then((r) => r.json()),
      ]);

      if (pRes.status === "fulfilled" && pRes.value.products) {
        setProducts(pRes.value.products);
      }
      if (bRes.status === "fulfilled" && bRes.value.brands) {
        setBrands(bRes.value.brands);
      }
      if (cRes.status === "fulfilled" && cRes.value.categories) {
        setCategories(cRes.value.categories);
      }
      if (sRes.status === "fulfilled" && sRes.value.series) {
        setSeries(sRes.value.series);
      }
      if (oRes.status === "fulfilled" && oRes.value.orders) {
        setOrders(oRes.value.orders);
      }
      if (custRes.status === "fulfilled" && custRes.value.customers) {
        setCustomers(custRes.value.customers);
      }
    } catch (err) {
      console.warn("[AdminStoreContext] Sync from database encountered errors:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // 3. Cache latest state to localStorage
  React.useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(KEYS.products, JSON.stringify(products));
      window.localStorage.setItem(KEYS.brands, JSON.stringify(brands));
      window.localStorage.setItem(KEYS.categories, JSON.stringify(categories));
      window.localStorage.setItem(KEYS.series, JSON.stringify(series));
      window.localStorage.setItem(KEYS.orders, JSON.stringify(orders));
      window.localStorage.setItem(KEYS.customers, JSON.stringify(customers));
    } catch {
      // Ignore storage errors
    }
  }, [products, brands, categories, series, orders, customers, hydrated]);

  // ─── Products Mutations ─────────────────────────────────────────────
  const saveProduct = React.useCallback(
    async (product: AdminProduct) => {
      const isExisting = products.some((p) => p.id === product.id);

      // Optimistic state update
      setProducts((prev) => {
        const idx = prev.findIndex((item) => item.id === product.id);
        if (idx > -1) {
          const next = [...prev];
          next[idx] = product;
          return next;
        }
        return [product, ...prev];
      });

      try {
        if (isExisting) {
          const res = await fetch(`/api/admin/products/${product.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(product),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.product) {
              setProducts((prev) =>
                prev.map((p) => (p.id === product.id ? { ...p, ...data.product } : p))
              );
            }
          }
        } else {
          const res = await fetch("/api/admin/products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(product),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.product) {
              // Replace temporary product id with database record
              setProducts((prev) =>
                prev.map((p) => (p.id === product.id ? { ...p, id: data.product.id } : p))
              );
            }
          }
        }
      } catch (err) {
        console.error("[AdminStore] Failed to sync product to PostgreSQL:", err);
      }
    },
    [products]
  );

  const deleteProduct = React.useCallback(async (id: string) => {
    // Optimistic remove
    setProducts((prev) => prev.filter((item) => item.id !== id));

    try {
      await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    } catch (err) {
      console.error("[AdminStore] Failed to delete product from database:", err);
    }
  }, []);

  // ─── Brands Mutations ───────────────────────────────────────────────
  const saveBrand = React.useCallback(
    async (brand: AdminBrand) => {
      const isExisting = brands.some((b) => b.id === brand.id);

      setBrands((prev) => {
        const idx = prev.findIndex((item) => item.id === brand.id);
        if (idx > -1) {
          const next = [...prev];
          next[idx] = brand;
          return next;
        }
        return [brand, ...prev];
      });

      try {
        if (isExisting) {
          await fetch(`/api/admin/brands/${brand.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(brand),
          });
        } else {
          const res = await fetch("/api/admin/brands", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(brand),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.brand) {
              setBrands((prev) =>
                prev.map((b) => (b.id === brand.id ? data.brand : b))
              );
            }
          }
        }
      } catch (err) {
        console.error("[AdminStore] Failed to sync brand to PostgreSQL:", err);
      }
    },
    [brands]
  );

  const deleteBrand = React.useCallback(async (id: string) => {
    setBrands((prev) => prev.filter((item) => item.id !== id));
    try {
      await fetch(`/api/admin/brands/${id}`, { method: "DELETE" });
    } catch (err) {
      console.error("[AdminStore] Failed to delete brand from database:", err);
    }
  }, []);

  // ─── Categories Mutations ───────────────────────────────────────────
  const saveCategory = React.useCallback(
    async (category: AdminCategory) => {
      const isExisting = categories.some((c) => c.id === category.id);

      setCategories((prev) => {
        const idx = prev.findIndex((item) => item.id === category.id);
        if (idx > -1) {
          const next = [...prev];
          next[idx] = category;
          return next;
        }
        return [category, ...prev];
      });

      try {
        if (isExisting) {
          await fetch(`/api/admin/categories/${category.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(category),
          });
        } else {
          const res = await fetch("/api/admin/categories", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(category),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.category) {
              setCategories((prev) =>
                prev.map((c) => (c.id === category.id ? data.category : c))
              );
            }
          }
        }
      } catch (err) {
        console.error("[AdminStore] Failed to sync category to PostgreSQL:", err);
      }
    },
    [categories]
  );

  const deleteCategory = React.useCallback(async (id: string) => {
    setCategories((prev) => prev.filter((item) => item.id !== id));
    try {
      await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
    } catch (err) {
      console.error("[AdminStore] Failed to delete category from database:", err);
    }
  }, []);

  // ─── Series Mutations ───────────────────────────────────────────────
  const saveSeries = React.useCallback(
    async (sItem: AdminProductSeries) => {
      const isExisting = series.some((s) => s.id === sItem.id);

      setSeries((prev) => {
        const idx = prev.findIndex((item) => item.id === sItem.id);
        if (idx > -1) {
          const next = [...prev];
          next[idx] = sItem;
          return next;
        }
        return [sItem, ...prev];
      });

      try {
        if (isExisting) {
          await fetch(`/api/admin/series/${sItem.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(sItem),
          });
        } else {
          const res = await fetch("/api/admin/series", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(sItem),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.series) {
              setSeries((prev) =>
                prev.map((s) => (s.id === sItem.id ? data.series : s))
              );
            }
          }
        }
      } catch (err) {
        console.error("[AdminStore] Failed to sync series to PostgreSQL:", err);
      }
    },
    [series]
  );

  const deleteSeries = React.useCallback(async (id: string) => {
    setSeries((prev) => prev.filter((item) => item.id !== id));
    try {
      await fetch(`/api/admin/series/${id}`, { method: "DELETE" });
    } catch (err) {
      console.error("[AdminStore] Failed to delete series from database:", err);
    }
  }, []);

  // ─── Orders Mutations ───────────────────────────────────────────────
  const addOrder = React.useCallback((order: AdminOrder) => {
    setOrders((prev) => [order, ...prev.filter((item) => item.id !== order.id)]);
    fetch("/api/admin/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(order),
    }).catch((err) => {
      console.warn("[AdminStore] addOrder sync error:", err);
    });
  }, []);

  const updateOrder = React.useCallback(async (order: AdminOrder) => {
    setOrders((prev) =>
      prev.map((item) => (item.id === order.id ? order : item))
    );

    try {
      await fetch(`/api/admin/orders/${order.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order),
      });
    } catch (err) {
      console.error("[AdminStore] Failed to sync updated order to PostgreSQL:", err);
    }
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
        isLoading,
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
        refreshAll,
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
