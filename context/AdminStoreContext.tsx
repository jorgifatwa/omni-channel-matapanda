"use client";

import * as React from "react";
import {
  type AdminBrand,
  type AdminCategory,
  type AdminCustomer,
  type AdminOrder,
  type AdminProduct,
  type AdminProductSeries,
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
  /** Set when orders or customers could not be loaded from the database */
  ordersLoadError: string | null;
  saveProduct: (product: AdminProduct) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  saveBrand: (brand: AdminBrand) => Promise<void>;
  deleteBrand: (id: string) => Promise<void>;
  saveCategory: (category: AdminCategory) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  saveSeries: (series: AdminProductSeries) => Promise<void>;
  deleteSeries: (id: string) => Promise<void>;
  addOrder: (order: AdminOrder) => Promise<void>;
  updateOrder: (order: AdminOrder) => Promise<void>;
  refreshAll: () => Promise<void>;
};

const AdminStoreContext = React.createContext<
  AdminStoreContextType | undefined
>(undefined);

// Keys used by older versions to cache admin data in the browser. They are
// only removed now: all admin data comes from the database.
const LEGACY_STORAGE_KEYS = [
  "matapanda_admin_products_v1",
  "matapanda_admin_brands_v1",
  "matapanda_admin_categories_v1",
  "matapanda_admin_series_v1",
  "matapanda_admin_orders_v1",
  "matapanda_admin_customers_v1",
];

/**
 * Saves an order to the database. A new order is created; when the order
 * number already exists, its statuses are updated instead.
 * Throws when the database write failed.
 */
export async function persistOrder(order: AdminOrder): Promise<void> {
  const res = await fetch("/api/admin/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(order),
  }).catch(() => null);
  if (res && res.status === 409) {
    await requestJson(
      `/api/admin/orders/${encodeURIComponent(order.orderNumber)}`,
      "PUT",
      order,
      "pesanan"
    );
    return;
  }
  if (!res) {
    throw new Error("Gagal menghubungi server saat menyimpan pesanan. Periksa koneksi internet.");
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const reason = (data as { error?: string }).error;
    throw new Error(
      reason
        ? `Gagal menyimpan pesanan ke database: ${reason}`
        : `Gagal menyimpan pesanan ke database (HTTP ${res.status}).`
    );
  }
}

/**
 * Creates a NEW order from the storefront checkout via the public endpoint.
 * The server forces all statuses to PENDING. Throws when it was not saved.
 */
export async function createCheckoutOrder(order: AdminOrder): Promise<void> {
  let res: Response;
  try {
    res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(order),
    });
  } catch {
    throw new Error("Gagal menghubungi server saat menyimpan pesanan. Periksa koneksi internet.");
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const reason = (data as { error?: string }).error;
    throw new Error(
      reason
        ? `Gagal menyimpan pesanan: ${reason}`
        : `Gagal menyimpan pesanan (HTTP ${res.status}).`
    );
  }
}

/**
 * Fire-and-forget variant of {@link persistOrder} (admin only).
 * Despite the historical name, nothing is stored in the browser anymore:
 * the order is only saved to the database, and failures are logged.
 */
export function saveOrderLocally(order: AdminOrder): void {
  persistOrder(order).catch((err) => {
    console.error("[saveOrderLocally] Pesanan gagal disimpan ke database:", err);
  });
}

/** Fetches an admin list endpoint and rejects when the server reports an error. */
async function fetchList(url: string): Promise<Record<string, unknown>> {
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || `HTTP ${res.status}`);
  return data as Record<string, unknown>;
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
  const [orders, setOrders] = React.useState<AdminOrder[]>([]);
  const [customers, setCustomers] = React.useState<AdminCustomer[]>([]);
  // Starts as true: the first database load runs immediately on mount
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [ordersLoadError, setOrdersLoadError] = React.useState<string | null>(null);

  // 1. Remove data cached in the browser by older versions (it could show
  // orders/customers that are not in the database)
  React.useEffect(() => {
    try {
      LEGACY_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));
    } catch {
      // Ignore storage errors
    }
  }, []);

  // 2. Fetch fresh data from PostgreSQL database
  const refreshAll = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [pRes, bRes, cRes, sRes, oRes, custRes] = await Promise.allSettled([
        fetchList("/api/admin/products"),
        fetchList("/api/admin/brands"),
        fetchList("/api/admin/categories"),
        fetchList("/api/admin/series"),
        fetchList("/api/admin/orders"),
        fetchList("/api/admin/customers"),
      ]);

      const failed: string[] = [];
      if (pRes.status === "fulfilled" && Array.isArray(pRes.value.products)) {
        setProducts(pRes.value.products as AdminProduct[]);
      } else failed.push("produk");
      if (bRes.status === "fulfilled" && Array.isArray(bRes.value.brands)) {
        setBrands(bRes.value.brands as AdminBrand[]);
      } else failed.push("brand");
      if (cRes.status === "fulfilled" && Array.isArray(cRes.value.categories)) {
        setCategories(cRes.value.categories as AdminCategory[]);
      } else failed.push("kategori");
      if (sRes.status === "fulfilled" && Array.isArray(sRes.value.series)) {
        setSeries(sRes.value.series as AdminProductSeries[]);
      } else failed.push("series");
      setLoadError(
        failed.length > 0
          ? `Gagal memuat data ${failed.join(", ")} dari database.`
          : null
      );
      const failedOrders: string[] = [];
      if (oRes.status === "fulfilled" && Array.isArray(oRes.value.orders)) {
        setOrders(oRes.value.orders as AdminOrder[]);
      } else {
        setOrders([]);
        failedOrders.push("pesanan");
      }
      if (custRes.status === "fulfilled" && Array.isArray(custRes.value.customers)) {
        setCustomers(custRes.value.customers as AdminCustomer[]);
      } else {
        setCustomers([]);
        failedOrders.push("pelanggan");
      }
      setOrdersLoadError(
        failedOrders.length > 0
          ? `Gagal memuat data ${failedOrders.join(" dan ")} dari database.`
          : null
      );
    } catch (err) {
      console.warn("[AdminStoreContext] Sync from database encountered errors:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refreshAll();
  }, [refreshAll]);

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
  const addOrder = React.useCallback(async (order: AdminOrder) => {
    await persistOrder(order);
    setOrders((prev) => [order, ...prev.filter((item) => item.id !== order.id)]);
  }, []);

  const updateOrder = React.useCallback(async (order: AdminOrder) => {
    await requestJson(`/api/admin/orders/${order.id}`, "PUT", order, "pesanan");
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
        isLoading,
        loadError,
        ordersLoadError,
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
