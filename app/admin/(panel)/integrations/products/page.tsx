"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Zap,
  Package,
  Loader2,
  Search,
  Link2,
  Unlink,
  AlertCircle,
  ArrowRightLeft,
  Eye,
} from "lucide-react";
import { type StoredProductMapping } from "@/lib/marketplace-store";
import { type ShopeeProductItem } from "@/lib/shopee-products";

interface FlatWebsiteProduct {
  productId: string;
  variantId?: string | null;
  productName: string;
  sku: string;
  size?: string | null;
  color?: string | null;
  price: number;
  stock: number;
  image: string;
  mapping?: StoredProductMapping | null;
}

interface MappingsApiResponse {
  success: boolean;
  platform: "SHOPEE" | "TIKTOK_SHOP";
  hasShopeeConnected: boolean;
  shopeeShopName: string | null;
  shopeeShopId: string | null;
  shopeeMappedCount: number;
  hasTikTokConnected: boolean;
  tiktokShopName: string | null;
  tiktokShopId: string | null;
  tiktokMappedCount: number;
  websiteProducts: FlatWebsiteProduct[];
  marketplaceProducts: ShopeeProductItem[];
  shopeeProducts?: ShopeeProductItem[];
  totalMapped: number;
  totalWebsiteItems: number;
}

export default function ProductMappingPage() {
  const [selectedPlatform, setSelectedPlatform] = React.useState<"SHOPEE" | "TIKTOK_SHOP">("SHOPEE");
  const [data, setData] = React.useState<MappingsApiResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"ALL" | "MAPPED" | "UNMAPPED">("ALL");

  // Action states
  const [isAutoMatching, setIsAutoMatching] = React.useState(false);
  const [isSyncingAllStock, setIsSyncingAllStock] = React.useState(false);
  const [syncingSingleId, setSyncingSingleId] = React.useState<string | null>(null);
  const [unlinkingId, setUnlinkingId] = React.useState<string | null>(null);

  // Manual mapping modal state
  const [selectedProductForModal, setSelectedProductForModal] = React.useState<FlatWebsiteProduct | null>(null);
  const [modalSearch, setModalSearch] = React.useState("");
  const [selectedMarketplaceItem, setSelectedMarketplaceItem] = React.useState<ShopeeProductItem | null>(null);
  const [isSubmittingMap, setIsSubmittingMap] = React.useState(false);

  // Marketplace catalog viewer modal state
  const [showCatalogModal, setShowCatalogModal] = React.useState(false);
  const [catalogSearch, setCatalogSearch] = React.useState("");

  // Notification toast
  const [toast, setToast] = React.useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const showToast = (type: "success" | "error" | "info", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  const loadMappings = React.useCallback(async (targetPlatform = selectedPlatform) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/integrations/products/mappings?platform=${targetPlatform}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        showToast("error", "Gagal mengambil data produk");
      }
    } catch {
      showToast("error", "Koneksi terputus saat memuat data");
    } finally {
      setLoading(false);
    }
  }, [selectedPlatform]);

  React.useEffect(() => {
    loadMappings(selectedPlatform);
  }, [selectedPlatform, loadMappings]);

  const handleSwitchPlatform = (plat: "SHOPEE" | "TIKTOK_SHOP") => {
    setSelectedPlatform(plat);
    loadMappings(plat);
  };

  const isShopee = selectedPlatform === "SHOPEE";
  const platformName = isShopee ? "Shopee" : "TikTok Shop (Tokopedia)";
  const isPlatformConnected = isShopee ? data?.hasShopeeConnected : data?.hasTikTokConnected;
  const connectedShopName = isShopee
    ? data?.shopeeShopName || `ID ${data?.shopeeShopId}`
    : data?.tiktokShopName || `ID ${data?.tiktokShopId}`;

  // Handle Auto Match
  const handleAutoMatch = async () => {
    try {
      setIsAutoMatching(true);
      const res = await fetch("/api/integrations/products/auto-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: selectedPlatform }),
      });
      const json = await res.json();
      if (res.ok) {
        showToast("success", json.message || "Auto-match selesai!");
        await loadMappings();
      } else {
        showToast("error", json.error || "Gagal auto-match");
      }
    } catch {
      showToast("error", "Terjadi kesalahan sistem saat auto-match");
    } finally {
      setIsAutoMatching(false);
    }
  };

  // Handle Sync All Stock
  const handleSyncAllStock = async () => {
    try {
      setIsSyncingAllStock(true);
      const itemsPayload =
        data?.websiteProducts
          .filter((wp) => wp.mapping?.id)
          .map((wp) => ({
            mappingId: wp.mapping!.id,
            sku: wp.sku,
            stock: wp.stock,
          })) || [];

      const res = await fetch("/api/integrations/products/sync-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: selectedPlatform, items: itemsPayload }),
      });
      const json = await res.json();
      if (res.ok) {
        showToast("success", json.message || "Sinkronisasi stok selesai!");
        await loadMappings();
      } else {
        showToast("error", json.error || "Gagal sync stok");
      }
    } catch {
      showToast("error", "Gagal menghubungi server sync stok");
    } finally {
      setIsSyncingAllStock(false);
    }
  };

  // Handle Single Stock Sync
  const handleSingleStockSync = async (mappingId: string, sku: string, currentStock?: number) => {
    try {
      setSyncingSingleId(mappingId);
      const res = await fetch("/api/integrations/products/sync-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mappingId, stock: currentStock }),
      });
      const json = await res.json();
      if (res.ok) {
        showToast("success", `Stok [${sku}] berhasil disinkronkan ke ${platformName}!`);
        await loadMappings();
      } else {
        showToast("error", json.error || `Gagal sync stok [${sku}]`);
      }
    } catch {
      showToast("error", "Terjadi kesalahan jaringan");
    } finally {
      setSyncingSingleId(null);
    }
  };

  // Handle Unlink
  const handleUnlink = async (mappingId: string, sku: string) => {
    if (!confirm(`Putuskan hubungan produk [${sku}] dari ${platformName}?`)) return;
    try {
      setUnlinkingId(mappingId);
      const res = await fetch(`/api/integrations/products/map?id=${mappingId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        showToast("info", `Relasi produk [${sku}] dari ${platformName} telah dilepas.`);
        await loadMappings();
      } else {
        showToast("error", "Gagal melepas relasi produk");
      }
    } catch {
      showToast("error", "Terjadi kesalahan jaringan");
    } finally {
      setUnlinkingId(null);
    }
  };

  // Handle Submit Manual Map
  const handleSubmitManualMap = async () => {
    if (!selectedProductForModal || !selectedMarketplaceItem) return;
    try {
      setIsSubmittingMap(true);
      const res = await fetch("/api/integrations/products/map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: selectedPlatform,
          productId: selectedProductForModal.productId,
          productName: selectedProductForModal.productName,
          productImage: selectedProductForModal.image,
          variantId: selectedProductForModal.variantId,
          variantSize: selectedProductForModal.size,
          variantColor: selectedProductForModal.color,
          marketplaceItemId: selectedMarketplaceItem.itemId,
          marketplaceModelId: selectedMarketplaceItem.modelId,
          marketplaceItemName: selectedMarketplaceItem.name,
          marketplaceModelName: selectedMarketplaceItem.modelName,
          sku: selectedProductForModal.sku,
          websiteStock: selectedProductForModal.stock,
          marketplaceStock: selectedMarketplaceItem.stock,
        }),
      });

      const json = await res.json();
      if (res.ok) {
        showToast("success", `Berhasil menghubungkan [${selectedProductForModal.sku}] dengan ${platformName}!`);
        setSelectedProductForModal(null);
        setSelectedMarketplaceItem(null);
        await loadMappings();
      } else {
        showToast("error", json.error || "Gagal menyimpan pemetaan");
      }
    } catch {
      showToast("error", "Gagal menghubungi server");
    } finally {
      setIsSubmittingMap(false);
    }
  };

  // Filtered products list
  const filteredProducts = React.useMemo(() => {
    if (!data?.websiteProducts) return [];
    return data.websiteProducts.filter((p) => {
      const matchesSearch =
        p.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.mapping?.marketplaceItemName || "").toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter === "MAPPED") return !!p.mapping;
      if (statusFilter === "UNMAPPED") return !p.mapping;
      return true;
    });
  }, [data?.websiteProducts, searchQuery, statusFilter]);

  const totalMapped = data?.totalMapped || 0;
  const totalWebsiteItems = data?.totalWebsiteItems || 0;
  const totalMarketplaceItems = data?.marketplaceProducts?.length || 0;
  const totalUnmapped = totalWebsiteItems - totalMapped;

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 mb-2">
          <Link href="/admin/integrations" className="hover:text-black dark:hover:text-white flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" />
            Kembali ke Integrasi Marketplace
          </Link>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2.5">
              <ArrowRightLeft className={`h-6 w-6 ${isShopee ? "text-orange-500" : "text-neutral-900 dark:text-white"}`} />
              Pemetaan Produk & Stok Marketplace
            </h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Hubungkan SKU produk website it&apos;s matapanda ke Shopee dan TikTok Shop (Tokopedia) secara bersamaan.
            </p>
          </div>

          {/* Account status badge */}
          {isPlatformConnected ? (
            <div
              className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-1.5 text-xs ${
                isShopee
                  ? "bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-900/50 text-orange-800 dark:text-orange-300"
                  : "bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
              }`}
            >
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                Toko {platformName}: <strong>{connectedShopName}</strong>
              </span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 px-3.5 py-1.5 text-xs text-amber-800 dark:text-amber-300">
              <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <span>
                {platformName} belum terhubung.{" "}
                <Link href="/admin/integrations" className="underline font-bold">
                  Hubungkan di sini
                </Link>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Marketplace Selector Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-3">
        <button
          onClick={() => handleSwitchPlatform("SHOPEE")}
          className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            selectedPlatform === "SHOPEE"
              ? "bg-orange-500 text-white shadow-sm ring-1 ring-orange-500"
              : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 dark:hover:text-white"
          }`}
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-white text-orange-600 font-bold text-[11px]">
            S
          </span>
          <span>Shopee Indonesia</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              selectedPlatform === "SHOPEE"
                ? "bg-orange-600 text-orange-100"
                : "bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300"
            }`}
          >
            {data?.shopeeMappedCount ?? 0} Terhubung
          </span>
        </button>

        <button
          onClick={() => handleSwitchPlatform("TIKTOK_SHOP")}
          className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            selectedPlatform === "TIKTOK_SHOP"
              ? "bg-black dark:bg-white text-white dark:text-neutral-900 shadow-sm ring-1 ring-neutral-900 dark:ring-white"
              : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 dark:hover:text-white"
          }`}
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-white dark:bg-neutral-900 text-black dark:text-white font-bold text-[11px]">
            T
          </span>
          <span>TikTok Shop (Tokopedia)</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              selectedPlatform === "TIKTOK_SHOP"
                ? "bg-neutral-800 dark:bg-neutral-200 text-neutral-200 dark:text-neutral-800"
                : "bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300"
            }`}
          >
            {data?.tiktokMappedCount ?? 0} Terhubung
          </span>
        </button>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-xs font-medium shadow-sm transition-all ${
            toast.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300"
              : toast.type === "error"
              ? "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-300"
              : "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/50 text-blue-800 dark:text-blue-300"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 space-y-1">
          <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">Varian Website it&apos;s matapanda</span>
          <div className="text-2xl font-bold text-neutral-900 dark:text-white">{totalWebsiteItems}</div>
          <span className="text-[10px] text-neutral-400 dark:text-neutral-500">Total item katalog aktif</span>
        </div>

        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 space-y-1">
          <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">Produk di {platformName}</span>
          <div className={`text-2xl font-bold ${isShopee ? "text-orange-600 dark:text-orange-400" : "text-neutral-900 dark:text-white"}`}>
            {totalMarketplaceItems}
          </div>
          <span className="text-[10px] text-neutral-400 dark:text-neutral-500">Item toko yang tersedia</span>
        </div>

        <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/30 p-4 space-y-1">
          <span className="text-[11px] font-medium text-emerald-800 dark:text-emerald-300">Sudah Terhubung ({platformName})</span>
          <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{totalMapped}</div>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Stok tersinkronisasi otomatis</span>
        </div>

        <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/30 p-4 space-y-1">
          <span className="text-[11px] font-medium text-amber-800 dark:text-amber-300">Belum Terhubung</span>
          <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">{totalUnmapped}</div>
          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Perlu pencocokan SKU</span>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800">
        {/* Search & Status Filters */}
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
            <input
              type="text"
              placeholder={`Cari produk / SKU / ${platformName}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white focus:bg-white dark:focus:bg-neutral-900 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
            />
          </div>

          <div className="flex items-center border border-neutral-200 dark:border-neutral-800 rounded-lg p-0.5 bg-neutral-100 dark:bg-neutral-950 text-[11px] shrink-0">
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                statusFilter === "ALL"
                  ? "bg-white text-black shadow-sm dark:bg-neutral-800 dark:text-white"
                  : "text-neutral-500 hover:text-black dark:text-neutral-400 dark:hover:text-white"
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setStatusFilter("MAPPED")}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                statusFilter === "MAPPED"
                  ? "bg-white text-emerald-700 shadow-sm dark:bg-neutral-800 dark:text-emerald-400"
                  : "text-neutral-500 hover:text-black dark:text-neutral-400 dark:hover:text-white"
              }`}
            >
              Terhubung ({totalMapped})
            </button>
            <button
              onClick={() => setStatusFilter("UNMAPPED")}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                statusFilter === "UNMAPPED"
                  ? "bg-white text-amber-700 shadow-sm dark:bg-neutral-800 dark:text-amber-400"
                  : "text-neutral-500 hover:text-black dark:text-neutral-400 dark:hover:text-white"
              }`}
            >
              Belum ({totalUnmapped})
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            onClick={() => loadMappings()}
            disabled={loading}
            title="Tarik ulang data dari marketplace"
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 dark:hover:text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={() => {
              setShowCatalogModal(true);
              setCatalogSearch("");
            }}
            disabled={loading || !isPlatformConnected}
            title={`Lihat seluruh katalog produk dan stok live di ${platformName}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-2 text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 dark:hover:text-white transition-colors shadow-sm disabled:opacity-50"
          >
            <Eye className="h-3.5 w-3.5 text-neutral-500 dark:text-neutral-400" />
            <span>Lihat Stok {isShopee ? "Shopee" : "TikTok"}</span>
          </button>

          <button
            onClick={handleAutoMatch}
            disabled={isAutoMatching || !isPlatformConnected}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold text-white transition-colors shadow-sm disabled:opacity-50 ${
              isShopee ? "bg-orange-600 hover:bg-orange-700" : "bg-black hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
            }`}
          >
            {isAutoMatching ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Zap className="h-3.5 w-3.5 fill-current" />
            )}
            <span>Auto-Match SKU ({platformName})</span>
          </button>

          <button
            onClick={handleSyncAllStock}
            disabled={isSyncingAllStock || totalMapped === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-black hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 px-3.5 py-2 text-xs font-semibold text-white transition-colors shadow-sm disabled:opacity-50"
          >
            {isSyncingAllStock ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Package className="h-3.5 w-3.5" />
            )}
            <span>Sync Stok ke {platformName}</span>
          </button>
        </div>
      </div>

      {/* Main Mapping Table */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-950 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                <th className="py-3 px-4 w-[35%]">Produk Website it&apos;s matapanda</th>
                <th className="py-3 px-2 text-center w-[6%]">Relasi</th>
                <th className="py-3 px-4 w-[35%]">Produk di Toko {platformName}</th>
                <th className="py-3 px-3 text-center w-[12%]">Status & Stok</th>
                <th className="py-3 px-4 text-right w-[12%]">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
              {loading && data === null ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-neutral-400 dark:text-neutral-500">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-neutral-400" />
                    <span>Memuat katalog produk dan data {platformName}...</span>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-neutral-500 dark:text-neutral-400">
                    <Package className="h-8 w-8 mx-auto mb-2 text-neutral-300 dark:text-neutral-700 stroke-[1.5]" />
                    <p className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">Tidak ada produk yang cocok</p>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">Coba ubah kata kunci pencarian atau filter status.</p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isMapped = !!p.mapping;
                  const mapping = p.mapping;

                  return (
                    <tr
                      key={`${p.productId}-${p.variantId || "main"}`}
                      className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40 transition-colors"
                    >
                      {/* Website Column */}
                      <td className="py-3.5 px-4 align-middle">
                        <div className="flex items-center gap-3">
                          <div className="relative h-12 w-12 rounded-lg bg-neutral-100 dark:bg-neutral-800 overflow-hidden shrink-0 border border-neutral-200 dark:border-neutral-700">
                            {p.image ? (
                              <Image src={p.image} alt={p.productName} fill unoptimized className="object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-neutral-400">
                                <Package className="h-5 w-5" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-neutral-900 dark:text-neutral-100 leading-tight">{p.productName}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="font-mono text-[10px] bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-1.5 py-0.5 rounded font-semibold border border-neutral-200 dark:border-neutral-700">
                                {p.sku}
                              </span>
                              {p.size && (
                                <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium">
                                  Size: {p.size} {p.color ? `• ${p.color}` : ""}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                              Stok Web: <strong className="text-black dark:text-white font-mono">{p.stock} pcs</strong>
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Mapping Arrow Column */}
                      <td className="py-3.5 px-2 text-center align-middle">
                        {isMapped ? (
                          <div
                            className="h-7 w-7 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mx-auto"
                            title={`Terhubung ke ${platformName}`}
                          >
                            <Link2 className="h-3.5 w-3.5" />
                          </div>
                        ) : (
                          <div
                            className="h-7 w-7 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-400 flex items-center justify-center mx-auto"
                            title={`Belum Terhubung ke ${platformName}`}
                          >
                            <Unlink className="h-3.5 w-3.5" />
                          </div>
                        )}
                      </td>

                      {/* Marketplace Column */}
                      <td className="py-3.5 px-4 align-middle">
                        {isMapped && mapping ? (
                          <div className="flex items-start gap-2.5">
                            <div
                              className={`h-5 w-5 rounded text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                                isShopee ? "bg-orange-500" : "bg-black"
                              }`}
                            >
                              {isShopee ? "S" : "T"}
                            </div>
                            <div>
                              <p className="font-semibold text-neutral-900 dark:text-neutral-100 leading-tight">
                                {mapping.marketplaceItemName}
                              </p>
                              {mapping.marketplaceModelName && (
                                <span
                                  className={`text-[10px] font-medium px-1.5 py-0.5 rounded border inline-block mt-1 ${
                                    isShopee
                                      ? "text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/50 border-orange-200 dark:border-orange-900/50"
                                      : "text-neutral-800 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700"
                                  }`}
                                >
                                  Varian: {mapping.marketplaceModelName}
                                </span>
                              )}
                              <div className="flex items-center gap-2 mt-1 text-[10px] text-neutral-400 dark:text-neutral-500">
                                <span>
                                  Item ID:{" "}
                                  <strong className="font-mono text-neutral-700 dark:text-neutral-300">
                                    {mapping.marketplaceItemId}
                                  </strong>
                                </span>
                                {mapping.marketplaceModelId && (
                                  <span>
                                    Model/SKU ID:{" "}
                                    <strong className="font-mono text-neutral-700 dark:text-neutral-300">
                                      {mapping.marketplaceModelId}
                                    </strong>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-neutral-400 dark:text-neutral-500 italic text-[11px] flex items-center gap-1.5">
                            <Unlink className="h-3.5 w-3.5 text-neutral-300 dark:text-neutral-600" />
                            <span>Belum dipasangkan dengan {platformName}</span>
                          </div>
                        )}
                      </td>

                      {/* Status & Stock Sync Column */}
                      <td className="py-3.5 px-3 text-center align-middle">
                        {isMapped && mapping ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="h-3 w-3" />
                              Terhubung
                            </span>
                            <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                              Stok {isShopee ? "Shopee" : "TikTok"}:{" "}
                              <strong className="font-mono text-black dark:text-white">{mapping.marketplaceStock}</strong>
                            </p>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">
                            <XCircle className="h-3 w-3" />
                            Belum
                          </span>
                        )}
                      </td>

                      {/* Actions Column */}
                      <td className="py-3.5 px-4 text-right align-middle">
                        {isMapped && mapping ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleSingleStockSync(mapping.id, p.sku, p.stock)}
                              disabled={syncingSingleId === mapping.id}
                              title={`Update stok ${platformName} sesuai stok website saat ini`}
                              className="px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 text-[11px] font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 dark:hover:text-white transition-colors disabled:opacity-50"
                            >
                              {syncingSingleId === mapping.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                "Sync Stok"
                              )}
                            </button>

                            <button
                              onClick={() => handleUnlink(mapping.id, p.sku)}
                              disabled={unlinkingId === mapping.id}
                              title={`Lepaskan hubungan dengan produk ${platformName}`}
                              className="px-2 py-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-[11px] font-semibold transition-colors disabled:opacity-50"
                            >
                              {unlinkingId === mapping.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Unlink className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedProductForModal(p);
                              setSelectedMarketplaceItem(null);
                              setModalSearch("");
                            }}
                            className={`px-3 py-1.5 rounded-lg text-white text-[11px] font-semibold transition-colors shadow-sm ${
                              isShopee ? "bg-orange-600 hover:bg-orange-700" : "bg-black hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
                            }`}
                          >
                            Hubungkan
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Link Modal */}
      {selectedProductForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-neutral-900 p-6 shadow-xl border border-neutral-200 dark:border-neutral-800 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  Hubungkan ke Produk {platformName}
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Pilih produk di {platformName} yang sesuai dengan produk website berikut:
                </p>
              </div>
              <button
                onClick={() => setSelectedProductForModal(null)}
                className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Target Website Product Summary */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs">
              <div className="relative h-11 w-11 rounded-lg bg-neutral-200 dark:bg-neutral-800 overflow-hidden shrink-0">
                {selectedProductForModal.image && (
                  <Image
                    src={selectedProductForModal.image}
                    alt={selectedProductForModal.productName}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-neutral-900 dark:text-neutral-100 truncate">{selectedProductForModal.productName}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-[10px] bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-1.5 py-0.5 rounded font-bold">
                    SKU: {selectedProductForModal.sku}
                  </span>
                  {selectedProductForModal.size && (
                    <span className="text-[10px] text-neutral-600 dark:text-neutral-400">Size: {selectedProductForModal.size}</span>
                  )}
                  <span className="text-[10px] text-neutral-500 dark:text-neutral-400">Stok: {selectedProductForModal.stock} pcs</span>
                </div>
              </div>
            </div>

            {/* Search Marketplace Items */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-400" />
              <input
                type="text"
                placeholder={`Cari item di toko ${platformName} berdasarkan nama / SKU...`}
                value={modalSearch}
                onChange={(e) => setModalSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
              />
            </div>

            {/* Marketplace Items List */}
            <div className="flex-1 overflow-y-auto space-y-2 max-h-[300px] pr-1">
              {!data?.marketplaceProducts?.length ? (
                <div className="text-center py-8 text-neutral-400 dark:text-neutral-500 text-xs">
                  Tidak ada produk ditemukan di toko {platformName} Anda.
                </div>
              ) : (
                data.marketplaceProducts
                  .filter((s) => {
                    if (!modalSearch) return true;
                    return (
                      s.name.toLowerCase().includes(modalSearch.toLowerCase()) ||
                      (s.modelName || "").toLowerCase().includes(modalSearch.toLowerCase()) ||
                      s.sku.toLowerCase().includes(modalSearch.toLowerCase())
                    );
                  })
                  .map((item) => {
                    const isSelected =
                      selectedMarketplaceItem?.itemId === item.itemId &&
                      selectedMarketplaceItem?.modelId === item.modelId;

                    return (
                      <div
                        key={`${item.itemId}-${item.modelId || "main"}`}
                        onClick={() => setSelectedMarketplaceItem(item)}
                        className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between gap-3 ${
                          isSelected
                            ? isShopee
                              ? "border-orange-500 bg-orange-50/60 dark:bg-orange-950/40 ring-1 ring-orange-500"
                              : "border-black dark:border-white bg-neutral-100 dark:bg-neutral-800 ring-1 ring-black dark:ring-white"
                            : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-8 w-8 rounded-lg text-white flex items-center justify-center font-bold text-xs shrink-0 ${
                              isShopee ? "bg-orange-500" : "bg-black"
                            }`}
                          >
                            {isShopee ? "S" : "T"}
                          </div>
                          <div>
                            <p className="font-bold text-neutral-900 dark:text-neutral-100 leading-snug">{item.name}</p>
                            {item.modelName && (
                              <p
                                className={`text-[10px] font-medium mt-0.5 ${
                                  isShopee ? "text-orange-700 dark:text-orange-400" : "text-neutral-700 dark:text-neutral-300"
                                }`}
                              >
                                Varian: {item.modelName}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1 text-[10px] text-neutral-500 dark:text-neutral-400">
                              <span className="font-mono bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-1 rounded">SKU: {item.sku}</span>
                              <span>
                                Stok: <strong className="text-neutral-800 dark:text-neutral-200">{item.stock}</strong>
                              </span>
                              <span>Rp {item.price.toLocaleString("id-ID")}</span>
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0">
                          <input
                            type="radio"
                            checked={isSelected}
                            onChange={() => setSelectedMarketplaceItem(item)}
                            className={`h-4 w-4 cursor-pointer ${
                              isShopee ? "accent-orange-600" : "accent-black"
                            }`}
                          />
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <button
                onClick={() => setSelectedProductForModal(null)}
                className="px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 dark:hover:text-white"
              >
                Batal
              </button>
              <button
                onClick={handleSubmitManualMap}
                disabled={!selectedMarketplaceItem || isSubmittingMap}
                className={`px-4 py-2 rounded-lg text-white text-xs font-semibold transition-colors disabled:opacity-50 inline-flex items-center gap-1.5 ${
                  isShopee ? "bg-orange-600 hover:bg-orange-700" : "bg-black hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
                }`}
              >
                {isSubmittingMap ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Link2 className="h-3.5 w-3.5" />
                )}
                <span>Simpan Hubungan ({platformName})</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Live Marketplace Catalog & Stock Viewer Modal */}
      {showCatalogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-neutral-900 p-6 shadow-xl border border-neutral-200 dark:border-neutral-800 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  <div
                    className={`h-6 w-6 rounded-md text-white text-xs font-bold flex items-center justify-center ${
                      isShopee ? "bg-orange-500" : "bg-black"
                    }`}
                  >
                    {isShopee ? "S" : "T"}
                  </div>
                  Katalog & Stok Live Toko {platformName}
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Toko: <strong className="text-neutral-800 dark:text-neutral-200">{connectedShopName}</strong> • Menampilkan seluruh stok yang tercatat di akun seller Anda
                </p>
              </div>
              <button
                onClick={() => setShowCatalogModal(false)}
                className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white text-sm font-bold p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                ✕
              </button>
            </div>

            {/* Search items in catalog */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-400" />
              <input
                type="text"
                placeholder={`Cari item / SKU di toko ${platformName}...`}
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
              />
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto space-y-2 max-h-[420px] pr-1">
              {!data?.marketplaceProducts?.length ? (
                <div className="text-center py-12 text-neutral-400 dark:text-neutral-500 text-xs">
                  <Package className="h-8 w-8 mx-auto mb-2 text-neutral-300 dark:text-neutral-700" />
                  <span>Tidak ada produk yang terdeteksi di toko {platformName}.</span>
                </div>
              ) : (
                data.marketplaceProducts
                  .filter((item) => {
                    if (!catalogSearch) return true;
                    return (
                      item.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
                      (item.modelName || "").toLowerCase().includes(catalogSearch.toLowerCase()) ||
                      item.sku.toLowerCase().includes(catalogSearch.toLowerCase())
                    );
                  })
                  .map((item) => {
                    const isMapped = data?.websiteProducts?.some(
                      (wp) =>
                        wp.mapping?.marketplaceItemId === item.itemId &&
                        (item.modelId ? wp.mapping?.marketplaceModelId === item.modelId : true)
                    );

                    return (
                      <div
                        key={`${item.itemId}-${item.modelId || "main"}`}
                        className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/50 hover:bg-white dark:hover:bg-neutral-800/60 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-10 w-10 rounded-lg bg-neutral-200 dark:bg-neutral-800 overflow-hidden shrink-0 flex items-center justify-center text-neutral-400 dark:text-neutral-500">
                            {item.image ? (
                              <Image src={item.image} alt={item.name} width={40} height={40} unoptimized className="object-cover h-full w-full" />
                            ) : (
                              <Package className="h-5 w-5" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-neutral-900 dark:text-neutral-100 truncate leading-snug">{item.name}</p>
                            {item.modelName && (
                              <span
                                className={`text-[10px] font-medium px-1.5 py-0.5 rounded border inline-block mt-0.5 ${
                                  isShopee
                                    ? "text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/50 border-orange-200 dark:border-orange-900/50"
                                    : "text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700"
                                }`}
                              >
                                Varian: {item.modelName}
                              </span>
                            )}
                            <div className="flex items-center gap-2 mt-1 text-[10px] text-neutral-500 dark:text-neutral-400">
                              <span className="font-mono bg-white dark:bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-200 dark:border-neutral-700 font-semibold text-neutral-700 dark:text-neutral-300">
                                SKU: {item.sku}
                              </span>
                              <span>Item ID: {item.itemId}</span>
                              <span>Rp {item.price.toLocaleString("id-ID")}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end shrink-0 gap-1.5">
                          <div className="text-right">
                            <span className="text-[10px] text-neutral-400 block">Stok di {isShopee ? "Shopee" : "TikTok"}:</span>
                            <span className="font-mono font-bold text-sm text-neutral-900 dark:text-white px-2 py-0.5 rounded-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 inline-block">
                              {item.stock} pcs
                            </span>
                          </div>
                          {isMapped ? (
                            <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                              <CheckCircle2 className="h-2.5 w-2.5" /> Terhubung ke Web
                            </span>
                          ) : (
                            <span className="text-[9px] font-medium text-neutral-400 dark:text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">
                              Belum terhubung
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-neutral-100 dark:border-neutral-800 text-xs">
              <span className="text-neutral-500 dark:text-neutral-400">
                Total <strong>{data?.marketplaceProducts?.length || 0}</strong> produk di toko {platformName}
              </span>
              <button
                onClick={() => setShowCatalogModal(false)}
                className="px-4 py-2 rounded-lg bg-neutral-900 text-white font-semibold text-xs hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
