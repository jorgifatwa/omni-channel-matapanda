"use client";

import * as React from "react";
import {
  type AdminBrand,
  type AdminCategory,
  type AdminCustomer,
  type AdminOrder,
  type AdminProduct,
  type AdminProductSeries,
  INITIAL_CUSTOMERS,
  INITIAL_ORDERS,
} from "@/lib/admin-data";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Records saved in the database have UUIDs; new (unsaved) records have temporary ids. */
function isUuid(id: string | undefined | null): boolean {
  return !!id && UUID_RE.test(id);
}

function upsertById<T extends { id: string }>(list: T[], item: T, replaceId?: string): T[] {
  const targetId = replaceId ?? item.id;
  const idx = list.findIndex((x) => x.id === targetId);
  if (idx === -1) return [item, ...list];
  const next = [...list];
  next[idx] = item;
  return next;
}

/** Calls an admin API and throws a readable error when the database rejects it. */
async function requestJson<T = unknown>(
  url: string,
  method: "POST" | "PUT" | "DELETE",
  body: unknown,
  label: string
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error(`Gagal menghubungi server saat menyimpan ${label}. Periksa koneksi internet.`);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const reason = (data as { error?: string }).error;
    throw new Error(
      reason
        ? `Gagal menyimpan ${label} ke database: ${reason}`
        : `Gagal menyimpan ${label} ke database (HTTP ${res.status}).`
    );
  }
  return data as T;
}

type AdminStoreContextType = {
  products: AdminProduct[];
  brands: AdminBrand[];
  categories: AdminCategory[];
  series: AdminProductSeries[];
  orders: AdminOrder[];
  customers: AdminCustomer[];
  isLoading: boolean;
  /** Set when catalog data could not be loaded from the database */
  loadError: string | null;
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
  // Catalog data comes only from the database (no dummy data, no browser cache)
  const [products, setProducts] = React.useState<AdminProduct[]>([]);
  const [brands, setBrands] = React.useState<AdminBrand[]>([]);
  const [categories, setCategories] = React.useState<AdminCategory[]>([]);
  const [series, setSeries] = React.useState<AdminProductSeries[]>([]);
  const [orders, setOrders] = React.useState<AdminOrder[]>(INITIAL_ORDERS);
  const [customers, setCustomers] =
    React.useState<AdminCustomer[]>(INITIAL_CUSTOMERS);
  const [isLoading, setIsLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [hydrated, setHydrated] = React.useState(false);

  // 1. Initial hydration from localStorage (instant cache)
  React.useEffect(() => {
    try {
      // Remove catalog data cached by older versions (it could show items
      // that were never saved to the database)
      window.localStorage.removeItem(KEYS.products);
      window.localStorage.removeItem(KEYS.brands);
      window.localStorage.removeItem(KEYS.categories);
      window.localStorage.removeItem(KEYS.series);
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

      const failed: string[] = [];
      if (pRes.status === "fulfilled" && Array.isArray(pRes.value.products)) {
        setProducts(pRes.value.products);
      } else failed.push("produk");
      if (bRes.status === "fulfilled" && Array.isArray(bRes.value.brands)) {
        setBrands(bRes.value.brands);
      } else failed.push("brand");
      if (cRes.status === "fulfilled" && Array.isArray(cRes.value.categories)) {
        setCategories(cRes.value.categories);
      } else failed.push("kategori");
      if (sRes.status === "fulfilled" && Array.isArray(sRes.value.series)) {
        setSeries(sRes.value.series);
      } else failed.push("series");
      setLoadError(
        failed.length > 0
          ? `Gagal memuat data ${failed.join(", ")} dari database.`
          : null
      );
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
      window.localStorage.setItem(KEYS.orders, JSON.stringify(orders));
      window.localStorage.setItem(KEYS.customers, JSON.stringify(customers));
    } catch {
      // Ignore storage errors
    }
  }, [orders, customers, hydrated]);

  // ─── Products Mutations ─────────────────────────────────────────────
  const saveProduct = React.useCallback(
    async (product: AdminProduct) => {
      const isExisting = isUuid(product.id);
      const data = await requestJson<{ product?: AdminProduct }>(
        isExisting ? `/api/admin/products/${product.id}` : "/api/admin/products",
        isExisting ? "PUT" : "POST",
        product,
        "produk"
      );
      const saved = data.product ? { ...product, ...data.product } : product;
      setProducts((prev) => upsertById(prev, saved, isExisting ? product.id : undefined));
    },
    []
  );

  const deleteProduct = React.useCallback(async (id: string) => {
    await requestJson(`/api/admin/products/${id}`, "DELETE", undefined, "produk");
    setProducts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // ─── Brands Mutations ───────────────────────────────────────────────
  const saveBrand = React.useCallback(async (brand: AdminBrand) => {
    const isExisting = isUuid(brand.id);
    const data = await requestJson<{ brand?: AdminBrand }>(
      isExisting ? `/api/admin/brands/${brand.id}` : "/api/admin/brands",
      isExisting ? "PUT" : "POST",
      brand,
      "brand"
    );
    const saved = data.brand ? { ...brand, ...data.brand } : brand;
    setBrands((prev) => upsertById(prev, saved, isExisting ? brand.id : undefined));
  }, []);

  const deleteBrand = React.useCallback(async (id: string) => {
    await requestJson(`/api/admin/brands/${id}`, "DELETE", undefined, "brand");
    setBrands((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // ─── Categories Mutations ───────────────────────────────────────────
  const saveCategory = React.useCallback(async (category: AdminCategory) => {
    const isExisting = isUuid(category.id);
    const data = await requestJson<{ category?: AdminCategory }>(
      isExisting ? `/api/admin/categories/${category.id}` : "/api/admin/categories",
      isExisting ? "PUT" : "POST",
      category,
      "kategori"
    );
    const saved = data.category ? { ...category, ...data.category } : category;
    setCategories((prev) => upsertById(prev, saved, isExisting ? category.id : undefined));
  }, []);

  const deleteCategory = React.useCallback(async (id: string) => {
    await requestJson(`/api/admin/categories/${id}`, "DELETE", undefined, "kategori");
    setCategories((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // ─── Series Mutations ───────────────────────────────────────────────
  const saveSeries = React.useCallback(async (sItem: AdminProductSeries) => {
    const isExisting = isUuid(sItem.id);
    const data = await requestJson<{ series?: AdminProductSeries }>(
      isExisting ? `/api/admin/series/${sItem.id}` : "/api/admin/series",
      isExisting ? "PUT" : "POST",
      sItem,
      "series"
    );
    const saved = data.series ? { ...sItem, ...data.series } : sItem;
    setSeries((prev) => upsertById(prev, saved, isExisting ? sItem.id : undefined));
  }, []);

  const deleteSeries = React.useCallback(async (id: string) => {
    await requestJson(`/api/admin/series/${id}`, "DELETE", undefined, "series");
    setSeries((prev) => prev.filter((item) => item.id !== id));
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
        loadError,
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
