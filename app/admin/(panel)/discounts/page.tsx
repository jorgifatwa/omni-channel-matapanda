"use client";

import * as React from "react";
import Image from "next/image";
import {
  Plus,
  Pencil,
  Trash2,
  BadgePercent,
  Calendar,
  Layers,
  Search,
  CheckCircle2,
  AlertCircle,
  Tag,
  Loader2,
  Flame,
  Package,
  Gift,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAdminStore } from "@/context/AdminStoreContext";
import { formatIDR } from "@/lib/products";
import {
  type DiscountCampaign,
  type DiscountType,
  type DiscountTargetType,
  type CampaignType,
} from "@/lib/discount-store";

export default function AdminDiscountsPage() {
  const { products, categories } = useAdminStore();

  const [discounts, setDiscounts] = React.useState<DiscountCampaign[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"ALL" | "ACTIVE" | "SCHEDULED" | "INACTIVE">("ALL");

  // Modal State
  const [modalOpen, setModalOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  // Form Fields
  const [campaignType, setCampaignType] = React.useState<CampaignType>("CATALOG_DISCOUNT");
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [bannerText, setBannerText] = React.useState("");
  const [discountType, setDiscountType] = React.useState<DiscountType>("PERCENTAGE");
  const [discountValue, setDiscountValue] = React.useState<number | string>(5);
  const [minSpend, setMinSpend] = React.useState<number | string>(200000);
  const [maxDiscountAmount, setMaxDiscountAmount] = React.useState<number | string>("");
  const [giftProductId, setGiftProductId] = React.useState<string | null>(null);
  const [giftProductName, setGiftProductName] = React.useState<string | null>(null);
  const [giftProductImage, setGiftProductImage] = React.useState<string | null>(null);
  const [giftQuantity, setGiftQuantity] = React.useState<number | string>(1);
  const [giftProductSearch, setGiftProductSearch] = React.useState("");
  const [targetType, setTargetType] = React.useState<DiscountTargetType>("ALL_PRODUCTS");
  const [selectedCategoryIds, setSelectedCategoryIds] = React.useState<string[]>([]);
  const [selectedProductIds, setSelectedProductIds] = React.useState<string[]>([]);
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);

  // Product Selection Search
  const [productSearch, setProductSearch] = React.useState("");

  // Toast
  const [toast, setToast] = React.useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  const showToast = (type: "success" | "error" | "info", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Load Discounts
  const loadDiscounts = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/discounts");
      if (res.ok) {
        const json = await res.json();
        setDiscounts(json.discounts || []);
      } else {
        showToast("error", "Gagal memuat daftar diskon");
      }
    } catch {
      showToast("error", "Koneksi terputus saat mengambil data");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadDiscounts();
  }, [loadDiscounts]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingId(null);
    setCampaignType("CATALOG_DISCOUNT");
    setName("");
    setDescription("");
    setBannerText("");
    setDiscountType("PERCENTAGE");
    setDiscountValue(5);
    setMinSpend(200000);
    setMaxDiscountAmount("");
    setGiftProductId(null);
    setGiftProductName(null);
    setGiftProductImage(null);
    setGiftQuantity(1);
    setGiftProductSearch("");
    setTargetType("ALL_PRODUCTS");
    setSelectedCategoryIds([]);
    setSelectedProductIds([]);

    const now = new Date();
    const end = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    setStartDate(now.toISOString().slice(0, 16));
    setEndDate(end.toISOString().slice(0, 16));
    setIsActive(true);
    setProductSearch("");
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (d: DiscountCampaign) => {
    setEditingId(d.id);
    setCampaignType(d.campaignType || "CATALOG_DISCOUNT");
    setName(d.name);
    setDescription(d.description || "");
    setBannerText(d.bannerText || "");
    setDiscountType(d.discountType);
    setDiscountValue(d.discountValue);
    setMinSpend(d.minSpend !== undefined ? d.minSpend : 200000);
    setMaxDiscountAmount(d.maxDiscountAmount ? d.maxDiscountAmount : "");
    setGiftProductId(d.giftProductId || null);
    setGiftProductName(d.giftProductName || null);
    setGiftProductImage(d.giftProductImage || null);
    setGiftQuantity(d.giftQuantity || 1);
    setGiftProductSearch("");
    setTargetType(d.targetType);
    setSelectedCategoryIds(d.targetCategoryIds || []);
    setSelectedProductIds(d.targetProductIds || []);
    setStartDate(d.startDate ? new Date(d.startDate).toISOString().slice(0, 16) : "");
    setEndDate(d.endDate ? new Date(d.endDate).toISOString().slice(0, 16) : "");
    setIsActive(d.isActive);
    setProductSearch("");
    setModalOpen(true);
  };

  // Quick Toggle Active
  const handleToggleActive = async (id: string, current: boolean) => {
    try {
      const res = await fetch(`/api/admin/discounts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toggleOnly: true, isActive: !current }),
      });
      if (res.ok) {
        setDiscounts((prev) =>
          prev.map((item) => (item.id === id ? { ...item, isActive: !current } : item))
        );
        showToast("success", `Status promo berhasil diubah menjadi ${!current ? "Aktif" : "Nonaktif"}.`);
      } else {
        showToast("error", "Gagal memperbarui status diskon");
      }
    } catch {
      showToast("error", "Terjadi kesalahan jaringan");
    }
  };

  // Delete Discount
  const handleDelete = async (id: string, campaignName: string) => {
    if (!confirm(`Hapus kampanye diskon "${campaignName}"?`)) return;
    try {
      const res = await fetch(`/api/admin/discounts/${id}`, { method: "DELETE" });
      if (res.ok) {
        setDiscounts((prev) => prev.filter((d) => d.id !== id));
        showToast("info", `Kampanye diskon "${campaignName}" telah dihapus.`);
      } else {
        showToast("error", "Gagal menghapus diskon");
      }
    } catch {
      showToast("error", "Terjadi kesalahan jaringan");
    }
  };

  // Save Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast("error", "Nama kampanye promo wajib diisi");
      return;
    }

    const numVal = Number(discountValue);
    if (campaignType !== "GIFT_PACKAGE") {
      if (isNaN(numVal) || numVal <= 0) {
        showToast("error", "Nilai diskon harus lebih besar dari 0");
        return;
      }

      if (discountType === "PERCENTAGE" && numVal > 100) {
        showToast("error", "Diskon persentase maksimal 100%");
        return;
      }
    }

    if (targetType === "CATEGORY" && selectedCategoryIds.length === 0) {
      showToast("error", "Pilih minimal satu kategori produk");
      return;
    }

    if (targetType === "SPECIFIC_PRODUCTS" && selectedProductIds.length === 0) {
      showToast("error", "Pilih minimal satu produk untuk diskon");
      return;
    }

    if (campaignType === "BUNDLE_PACKAGE" || campaignType === "GIFT_PACKAGE") {
      const minVal = Number(minSpend);
      if (isNaN(minVal) || minVal <= 0) {
        showToast("error", "Minimal pembelian belanja harus lebih besar dari Rp 0");
        return;
      }
    }

    if (campaignType === "GIFT_PACKAGE") {
      if (!giftProductId) {
        showToast("error", "Silakan pilih produk hadiah gratis yang diberikan");
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const payload = {
        id: editingId || undefined,
        name: name.trim(),
        description: description.trim(),
        bannerText: bannerText.trim(),
        campaignType,
        discountType: campaignType === "GIFT_PACKAGE" ? "FIXED_AMOUNT" : discountType,
        discountValue: campaignType === "GIFT_PACKAGE" ? 0 : numVal,
        minSpend: (campaignType === "BUNDLE_PACKAGE" || campaignType === "GIFT_PACKAGE") ? Number(minSpend) : undefined,
        maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : null,
        giftProductId: campaignType === "GIFT_PACKAGE" ? giftProductId : null,
        giftProductName: campaignType === "GIFT_PACKAGE" ? giftProductName : null,
        giftProductImage: campaignType === "GIFT_PACKAGE" ? giftProductImage : null,
        giftQuantity: campaignType === "GIFT_PACKAGE" ? Number(giftQuantity) || 1 : 1,
        targetType,
        targetCategoryIds: selectedCategoryIds,
        targetProductIds: selectedProductIds,
        startDate: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
        endDate: endDate ? new Date(endDate).toISOString() : new Date(Date.now() + 14 * 86400000).toISOString(),
        isActive,
      };

      const res = await fetch("/api/admin/discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok) {
        showToast("success", json.message || "Diskon berhasil disimpan!");
        setModalOpen(false);
        await loadDiscounts();
      } else {
        showToast("error", json.error || "Gagal menyimpan diskon");
      }
    } catch {
      showToast("error", "Gagal menghubungi server");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered List
  const nowIso = new Date().toISOString();
  const filteredDiscounts = React.useMemo(() => {
    return discounts.filter((d) => {
      const matchSearch =
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.bannerText || "").toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchSearch) return false;

      const isLive = d.isActive && (!d.startDate || d.startDate <= nowIso) && (!d.endDate || d.endDate >= nowIso);
      const isSched = d.isActive && d.startDate && d.startDate > nowIso;

      if (statusFilter === "ACTIVE") return isLive;
      if (statusFilter === "SCHEDULED") return isSched;
      if (statusFilter === "INACTIVE") return !d.isActive || (d.endDate && d.endDate < nowIso);
      return true;
    });
  }, [discounts, searchQuery, statusFilter, nowIso]);

  const activeCount = discounts.filter(
    (d) => d.isActive && (!d.startDate || d.startDate <= nowIso) && (!d.endDate || d.endDate >= nowIso)
  ).length;

  const scheduledCount = discounts.filter(
    (d) => d.isActive && d.startDate && d.startDate > nowIso
  ).length;

  const inactiveCount = discounts.length - activeCount - scheduledCount;

  // Filtered products for specific selection checklist
  const filteredModalProducts = React.useMemo(() => {
    if (!productSearch.trim()) return products;
    const q = productSearch.toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
  }, [products, productSearch]);

  // Filtered products for gift selection
  const filteredGiftCandidates = React.useMemo(() => {
    if (!giftProductSearch.trim()) return products.slice(0, 10);
    const q = giftProductSearch.toLowerCase();
    return products
      .filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
      .slice(0, 15);
  }, [products, giftProductSearch]);

  const toggleSelectAllProducts = () => {
    if (selectedProductIds.length === products.length) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(products.map((p) => p.id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-xs font-medium shadow-sm transition-all ${
            toast.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : toast.type === "error"
              ? "bg-red-50 border-red-200 text-red-800"
              : "bg-blue-50 border-blue-200 text-blue-800"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 flex items-center gap-2.5">
            <BadgePercent className="h-6 w-6 text-red-600" />
            Diskon & Kampanye Promosi
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Atur diskon harga otomatis pada katalog website, tentukan produk atau kategori yang terdiskon, dan jadwalkan periode promo.
          </p>
        </div>

        <Button
          onClick={handleOpenCreate}
          className="bg-black hover:bg-neutral-800 text-white dark:bg-white dark:text-black dark:hover:bg-neutral-200 text-xs font-semibold shadow-sm"
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Buat Diskon Baru
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 space-y-1">
          <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">Total Kampanye</span>
          <div className="text-2xl font-bold text-neutral-900 dark:text-white">{discounts.length}</div>
          <span className="text-[10px] text-neutral-400 dark:text-neutral-500">Semua promo tersimpan</span>
        </div>

        <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 space-y-1">
          <span className="text-[11px] font-medium text-emerald-800 dark:text-emerald-300">Sedang Aktif</span>
          <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{activeCount}</div>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400/80 font-medium">Berlaku langsung di website</span>
        </div>

        <div className="rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 p-4 space-y-1">
          <span className="text-[11px] font-medium text-blue-800 dark:text-blue-300">Terjadwal</span>
          <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">{scheduledCount}</div>
          <span className="text-[10px] text-blue-600 dark:text-blue-400/80 font-medium">Akan datang</span>
        </div>

        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40 p-4 space-y-1">
          <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">Selesai / Nonaktif</span>
          <div className="text-2xl font-bold text-neutral-600 dark:text-neutral-300">{inactiveCount}</div>
          <span className="text-[10px] text-neutral-400 dark:text-neutral-500">Tidak tampil di toko</span>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Cari kampanye promo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:bg-white dark:focus:bg-neutral-900 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
          />
        </div>

        <div className="flex items-center border border-neutral-200 dark:border-neutral-800 rounded-lg p-0.5 bg-neutral-100 dark:bg-neutral-800 text-[11px] shrink-0">
          <button
            onClick={() => setStatusFilter("ALL")}
            className={`px-3 py-1 rounded-md font-semibold transition-colors ${
              statusFilter === "ALL"
                ? "bg-white dark:bg-neutral-950 text-black dark:text-white shadow-sm"
                : "text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white"
            }`}
          >
            Semua ({discounts.length})
          </button>
          <button
            onClick={() => setStatusFilter("ACTIVE")}
            className={`px-3 py-1 rounded-md font-semibold transition-colors ${
              statusFilter === "ACTIVE"
                ? "bg-white dark:bg-neutral-950 text-emerald-700 dark:text-emerald-400 shadow-sm"
                : "text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white"
            }`}
          >
            Aktif ({activeCount})
          </button>
          <button
            onClick={() => setStatusFilter("SCHEDULED")}
            className={`px-3 py-1 rounded-md font-semibold transition-colors ${
              statusFilter === "SCHEDULED"
                ? "bg-white dark:bg-neutral-950 text-blue-700 dark:text-blue-400 shadow-sm"
                : "text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white"
            }`}
          >
            Terjadwal ({scheduledCount})
          </button>
          <button
            onClick={() => setStatusFilter("INACTIVE")}
            className={`px-3 py-1 rounded-md font-semibold transition-colors ${
              statusFilter === "INACTIVE"
                ? "bg-white dark:bg-neutral-950 text-neutral-700 dark:text-neutral-300 shadow-sm"
                : "text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white"
            }`}
          >
            Nonaktif ({inactiveCount})
          </button>
        </div>
      </div>

      {/* Discounts List / Table */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-950/60 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                <th className="py-3 px-4 w-[28%]">Nama Kampanye</th>
                <th className="py-3 px-3 text-center w-[15%]">Besaran Diskon</th>
                <th className="py-3 px-4 w-[22%]">Target Produk</th>
                <th className="py-3 px-4 w-[18%]">Periode Promo</th>
                <th className="py-3 px-3 text-center w-[8%]">Status</th>
                <th className="py-3 px-4 text-right w-[9%]">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading && discounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-400">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-neutral-400" />
                    <span>Memuat daftar diskon...</span>
                  </td>
                </tr>
              ) : filteredDiscounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-500">
                    <BadgePercent className="h-8 w-8 mx-auto mb-2 text-neutral-300 stroke-[1.5]" />
                    <p className="font-semibold text-sm">Belum ada kampanye diskon</p>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Klik tombol &ldquo;Buat Diskon Baru&rdquo; untuk memulai promosi produk Anda.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredDiscounts.map((d) => {
                  const isLive = d.isActive && (!d.startDate || d.startDate <= nowIso) && (!d.endDate || d.endDate >= nowIso);
                  const isSched = d.isActive && d.startDate && d.startDate > nowIso;
                  const isEnded = d.endDate && d.endDate < nowIso;

                  // Resolve target label
                  let targetLabel = "Semua Produk Toko";
                  if (d.targetType === "CATEGORY") {
                    const catNames = categories
                      .filter((c) => d.targetCategoryIds.includes(c.id))
                      .map((c) => c.name);
                    targetLabel = catNames.length > 0 ? `Kategori: ${catNames.join(", ")}` : "Semua Kategori";
                  } else if (d.targetType === "SPECIFIC_PRODUCTS") {
                    targetLabel = `${d.targetProductIds.length} Produk Pilihan`;
                  }

                  return (
                    <tr key={d.id} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40 transition-colors">
                      {/* Name & Banner */}
                      <td className="py-3.5 px-4 align-middle">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {d.campaignType === "GIFT_PACKAGE" ? (
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-extrabold px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 inline-flex items-center gap-1">
                                <Gift className="h-3 w-3" />
                                Paket Hadiah (Min. {formatIDR(d.minSpend || 0)})
                              </span>
                            ) : d.campaignType === "BUNDLE_PACKAGE" ? (
                              <span className="text-[10px] bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 font-extrabold px-2 py-0.5 rounded-md border border-purple-200 dark:border-purple-800 inline-flex items-center gap-1">
                                Paket Diskon (Min. {formatIDR(d.minSpend || 0)})
                              </span>
                            ) : (
                              <span className="text-[10px] bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 font-medium px-2 py-0.5 rounded-md border border-neutral-200 dark:border-neutral-700">
                                Diskon Produk
                              </span>
                            )}
                          </div>
                          <p className="font-bold text-neutral-900 dark:text-neutral-100 leading-tight flex items-center gap-1.5">
                            {isLive && <Flame className="h-3.5 w-3.5 text-red-600 fill-red-600 shrink-0" />}
                            <span>{d.name}</span>
                          </p>
                          {d.bannerText && (
                            <p className="text-[10px] text-red-700 bg-red-50 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/60 px-2 py-0.5 rounded-md inline-block">
                              Banner: {d.bannerText}
                            </p>
                          )}
                          {d.description && (
                            <p className="text-[11px] text-neutral-400 dark:text-neutral-500 line-clamp-1">{d.description}</p>
                          )}
                        </div>
                      </td>

                      {/* Discount Value */}
                      <td className="py-3.5 px-3 text-center align-middle">
                        {d.campaignType === "GIFT_PACKAGE" ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 font-extrabold text-xs">
                              <Gift className="h-3 w-3" />
                              Hadiah Gratis
                            </span>
                            <span className="text-[11px] font-semibold text-neutral-800 dark:text-neutral-200 line-clamp-1 max-w-[150px] text-center" title={d.giftProductName || ""}>
                              {d.giftQuantity || 1}x {d.giftProductName || "Produk Hadiah"}
                            </span>
                          </div>
                        ) : d.discountType === "PERCENTAGE" ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-300 font-extrabold text-xs">
                              <Tag className="h-3 w-3" />
                              {d.discountValue}% OFF
                            </span>
                            {d.maxDiscountAmount && d.maxDiscountAmount > 0 && (
                              <span className="text-[10px] text-neutral-400">
                                Maks. {formatIDR(d.maxDiscountAmount)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 font-extrabold text-xs">
                            Potongan {formatIDR(d.discountValue)}
                          </span>
                        )}
                      </td>

                      {/* Target Products */}
                      <td className="py-3.5 px-4 align-middle">
                        <div className="flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300 font-medium">
                          <Layers className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                          <span className="truncate">{targetLabel}</span>
                        </div>
                      </td>

                      {/* Period */}
                      <td className="py-3.5 px-4 align-middle text-[11px] text-neutral-500 dark:text-neutral-400">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                          <div>
                            <div>{new Date(d.startDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</div>
                            <div className="text-[10px] text-neutral-400 dark:text-neutral-500">
                              s/d {new Date(d.endDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Status & Switch */}
                      <td className="py-3.5 px-3 text-center align-middle">
                        <div className="flex flex-col items-center gap-1.5">
                          {isLive ? (
                            <Badge variant="default" className="bg-emerald-600 text-white text-[10px] font-bold">
                              Aktif
                            </Badge>
                          ) : isSched ? (
                            <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-bold">
                              Terjadwal
                            </Badge>
                          ) : isEnded ? (
                            <Badge variant="secondary" className="bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 text-[10px]">
                              Berakhir
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 text-[10px]">
                              Nonaktif
                            </Badge>
                          )}
                          <Switch
                            checked={d.isActive}
                            onCheckedChange={() => handleToggleActive(d.id, d.isActive)}
                            className="scale-75"
                          />
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right align-middle">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(d)}
                            className="h-8 w-8 p-0 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
                            title="Edit Diskon"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(d.id, d.name)}
                            className="h-8 w-8 p-0 hover:bg-red-50 dark:hover:bg-red-950/50 text-red-600 dark:text-red-400"
                            title="Hapus Diskon"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Dialog Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-5">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                <BadgePercent className="h-5 w-5 text-red-600" />
                {editingId ? "Edit Kampanye Diskon" : "Buat Kampanye Diskon Baru"}
              </DialogTitle>
              <DialogDescription className="text-xs text-neutral-500">
                Tentukan nama promo, besaran potongan, produk yang didiskon, dan periode waktu berlakunya promo.
              </DialogDescription>
            </DialogHeader>

            {/* Step 0: Model Promosi */}
            <div className="space-y-3 border-b border-neutral-100 dark:border-neutral-800 pb-4">
              <Label className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                Model Promosi <span className="text-red-500">*</span>
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div
                  onClick={() => setCampaignType("CATALOG_DISCOUNT")}
                  className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all flex flex-col justify-between ${
                    campaignType === "CATALOG_DISCOUNT"
                      ? "border-black bg-neutral-100 font-bold dark:border-white dark:bg-neutral-800 dark:text-white ring-1 ring-black dark:ring-white"
                      : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-700 dark:text-neutral-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-extrabold text-xs">Diskon Produk (Katalog)</span>
                    <input
                      type="radio"
                      checked={campaignType === "CATALOG_DISCOUNT"}
                      onChange={() => setCampaignType("CATALOG_DISCOUNT")}
                      className="accent-black dark:accent-white"
                    />
                  </div>
                  <p className="text-[10px] text-neutral-500 font-normal">
                    Potongan harga langsung pada produk di katalog/etalase toko.
                  </p>
                </div>

                <div
                  onClick={() => setCampaignType("BUNDLE_PACKAGE")}
                  className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all flex flex-col justify-between ${
                    campaignType === "BUNDLE_PACKAGE"
                      ? "border-purple-600 bg-purple-50 font-bold dark:border-purple-400 dark:bg-purple-950/40 dark:text-white ring-1 ring-purple-600 dark:ring-purple-400"
                      : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-700 dark:text-neutral-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-extrabold text-xs text-purple-700 dark:text-purple-300">Paket Diskon (Bundle Deal)</span>
                    <input
                      type="radio"
                      checked={campaignType === "BUNDLE_PACKAGE"}
                      onChange={() => setCampaignType("BUNDLE_PACKAGE")}
                      className="accent-purple-600 dark:accent-purple-400"
                    />
                  </div>
                  <p className="text-[10px] text-neutral-500 font-normal">
                    Diskon transaksi otomatis jika belanja mencapai minimal nominal (ala Shopee).
                  </p>
                </div>

                <div
                  onClick={() => setCampaignType("GIFT_PACKAGE")}
                  className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all flex flex-col justify-between ${
                    campaignType === "GIFT_PACKAGE"
                      ? "border-emerald-600 bg-emerald-50 font-bold dark:border-emerald-400 dark:bg-emerald-950/40 dark:text-white ring-1 ring-emerald-600 dark:ring-emerald-400"
                      : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-700 dark:text-neutral-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-extrabold text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                      <Gift className="h-3.5 w-3.5" />
                      Paket Hadiah
                    </span>
                    <input
                      type="radio"
                      checked={campaignType === "GIFT_PACKAGE"}
                      onChange={() => setCampaignType("GIFT_PACKAGE")}
                      className="accent-emerald-600 dark:accent-emerald-400"
                    />
                  </div>
                  <p className="text-[10px] text-neutral-500 font-normal">
                    Hadiah produk gratis otomatis jika pembeli belanja mencapai minimal nominal.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 1: Info Dasar */}
            <div className="space-y-3.5 border-b border-neutral-100 pb-4">
              <div>
                <Label htmlFor="disc-name" className="text-xs font-semibold">
                  Nama Kampanye Diskon <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="disc-name"
                  placeholder={
                    campaignType === "GIFT_PACKAGE"
                      ? "Contoh: Paket Hadiah Spesial - Belanja Min. 300rb Gratis Tote Bag"
                      : campaignType === "BUNDLE_PACKAGE"
                      ? "Contoh: Paket Diskon Hemat - Min. 200rb Diskon 5%"
                      : "Contoh: Mid-Month Sale 10.10 / Weekend Promo Streetwear"
                  }
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 text-xs"
                  required
                />
              </div>

              <div>
                <Label htmlFor="disc-banner" className="text-xs font-semibold">
                  Teks Banner Atas Website <span className="text-neutral-400 font-normal">(Opsional)</span>
                </Label>
                <Input
                  id="disc-banner"
                  placeholder={
                    campaignType === "GIFT_PACKAGE"
                      ? "Contoh: SPESIAL HADIAH: Belanja minimal Rp 300.000, dapatkan Hadiah Gratis pilihan spesial!"
                      : campaignType === "BUNDLE_PACKAGE"
                      ? "Contoh: PAKET DISKON: Belanja minimal Rp 200.000, nikmati diskon 5% untuk semua produk!"
                      : "Contoh: FLASH SALE 10.10: Diskon s/d 50% Koleksi Streetwear Terpilih!"
                  }
                  value={bannerText}
                  onChange={(e) => setBannerText(e.target.value)}
                  className="mt-1 text-xs"
                />
                <p className="text-[10px] text-neutral-400 mt-1">
                  Jika diisi, teks ini akan muncul di bar pengumuman paling atas halaman website.
                </p>
              </div>
            </div>

            {/* Step 2: Besaran Diskon & Syarat Minimal ATAU Pengaturan Paket Hadiah */}
            {campaignType === "GIFT_PACKAGE" ? (
              <div className="space-y-4 border-b border-neutral-100 dark:border-neutral-800 pb-4">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                    <Gift className="h-4 w-4 text-emerald-600" />
                    Pengaturan Hadiah & Minimal Belanja
                  </Label>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-md">
                    Hadiah Gratis Rp 0
                  </span>
                </div>

                <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/60 space-y-3">
                  <div>
                    <Label htmlFor="gift-min-spend" className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                      Minimal Belanja untuk Dapat Hadiah (Rp) *
                    </Label>
                    <div className="relative mt-1">
                      <NumberInput
                        id="gift-min-spend"
                        placeholder="300000"
                        value={minSpend}
                        onChange={(e) => setMinSpend(e.target.value)}
                        className="text-xs font-bold pr-12 bg-white dark:bg-neutral-900"
                        required
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-neutral-400 font-bold">
                        IDR
                      </span>
                    </div>
                    <p className="text-[10px] text-emerald-700/80 dark:text-emerald-300/80 mt-1">
                      Contoh: Jika diisi 300.000, pembeli yang belanja minimal Rp 300.000 akan otomatis mendapatkan hadiah gratis.
                    </p>
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                      Produk Hadiah yang Diberikan *
                    </Label>
                    {giftProductId ? (
                      <div className="mt-2 p-3 bg-white dark:bg-neutral-900 rounded-xl border border-emerald-300 dark:border-emerald-700 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {giftProductImage ? (
                            <div className="w-12 h-12 rounded-lg overflow-hidden relative border border-neutral-200 dark:border-neutral-800 shrink-0">
                              <Image
                                src={giftProductImage}
                                alt={giftProductName || "Hadiah"}
                                fill
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                              <Gift className="h-6 w-6 text-emerald-600" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-bold text-xs text-neutral-900 dark:text-neutral-100 truncate">
                              {giftProductName}
                            </p>
                            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold inline-flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Hadiah Terpilih (Harga Rp 0)
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="flex items-center gap-1.5">
                            <Label htmlFor="gift-qty" className="text-[10px] text-neutral-500 font-medium">Qty:</Label>
                            <NumberInput
                              id="gift-qty"
                              value={giftQuantity}
                              onChange={(e) => setGiftQuantity(e.target.value)}
                              className="w-16 h-8 text-xs text-center font-bold"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setGiftProductId(null);
                              setGiftProductName(null);
                              setGiftProductImage(null);
                            }}
                            className="text-xs h-8 text-red-600 border-red-200 hover:bg-red-50"
                          >
                            Ganti Hadiah
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 space-y-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-400" />
                          <Input
                            placeholder="Cari produk untuk dijadikan hadiah gratis..."
                            value={giftProductSearch}
                            onChange={(e) => setGiftProductSearch(e.target.value)}
                            className="pl-8 text-xs bg-white dark:bg-neutral-900"
                          />
                        </div>

                        <div className="max-h-48 overflow-y-auto space-y-1.5 p-1 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
                          {filteredGiftCandidates.length === 0 ? (
                            <p className="text-xs text-center py-4 text-neutral-400">
                              Tidak ada produk ditemukan
                            </p>
                          ) : (
                            filteredGiftCandidates.map((p) => (
                              <div
                                key={p.id}
                                onClick={() => {
                                  const img = p.images?.[0] || "/placeholder.jpg";
                                  setGiftProductId(p.id);
                                  setGiftProductName(p.name);
                                  setGiftProductImage(img);
                                }}
                                className="p-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer flex items-center justify-between text-xs transition-colors border border-transparent hover:border-emerald-200"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="w-8 h-8 rounded-md overflow-hidden relative border border-neutral-100 shrink-0">
                                    <Image
                                      src={p.images?.[0] || "/placeholder.jpg"}
                                      alt={p.name}
                                      fill
                                      className="object-cover"
                                    />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">{p.name}</p>
                                    <p className="text-[10px] text-neutral-400">Normal: {formatIDR(p.price)}</p>
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  className="h-7 text-[11px] font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900 dark:text-emerald-200 shrink-0"
                                >
                                  Pilih Hadiah
                                </Button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 border-b border-neutral-100 dark:border-neutral-800 pb-4">
                <Label className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">Jenis & Besaran Diskon</Label>

                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setDiscountType("PERCENTAGE")}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                      discountType === "PERCENTAGE"
                        ? "border-black bg-neutral-100 font-bold dark:border-white dark:bg-neutral-800 dark:text-white"
                        : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-700 dark:text-neutral-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm">%</span>
                      <span>Persentase (%)</span>
                    </div>
                    <input
                      type="radio"
                      checked={discountType === "PERCENTAGE"}
                      onChange={() => setDiscountType("PERCENTAGE")}
                      className="accent-black dark:accent-white"
                    />
                  </div>

                  <div
                    onClick={() => setDiscountType("FIXED_AMOUNT")}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                      discountType === "FIXED_AMOUNT"
                        ? "border-black bg-neutral-100 font-bold dark:border-white dark:bg-neutral-800 dark:text-white"
                        : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-700 dark:text-neutral-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm">Rp</span>
                      <span>Potongan Rupiah (Rp)</span>
                    </div>
                    <input
                      type="radio"
                      checked={discountType === "FIXED_AMOUNT"}
                      onChange={() => setDiscountType("FIXED_AMOUNT")}
                      className="accent-black dark:accent-white"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="disc-val" className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                    {discountType === "PERCENTAGE" ? "Persentase Diskon (%) *" : "Nominal Potongan Harga (Rp) *"}
                  </Label>
                  {discountType === "PERCENTAGE" ? (
                    <div className="relative mt-1">
                      <Input
                        id="disc-val"
                        type="number"
                        min="1"
                        max="100"
                        placeholder="5"
                        value={discountValue}
                        onChange={(e) => setDiscountValue(e.target.value)}
                        className="text-xs pr-10 font-bold"
                        required
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-neutral-400 font-bold">
                        %
                      </span>
                    </div>
                  ) : (
                    <div className="relative mt-1">
                      <NumberInput
                        id="disc-val"
                        placeholder="15000"
                        value={discountValue}
                        onChange={(e) => setDiscountValue(e.target.value)}
                        className="text-xs pr-12 font-bold"
                        required
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-neutral-400 font-bold">
                        IDR
                      </span>
                    </div>
                  )}
                </div>

                {/* Syarat Khusus Paket Diskon */}
                {campaignType === "BUNDLE_PACKAGE" && (
                  <div className="p-3.5 bg-purple-50/70 dark:bg-purple-950/30 rounded-xl border border-purple-200 dark:border-purple-800/60 space-y-3 mt-2">
                    <div>
                      <Label htmlFor="disc-min-spend" className="text-xs font-bold text-purple-900 dark:text-purple-200">
                        Minimal Pembelian Belanja (Rp) *
                      </Label>
                      <div className="relative mt-1">
                        <NumberInput
                          id="disc-min-spend"
                          placeholder="200000"
                          value={minSpend}
                          onChange={(e) => setMinSpend(e.target.value)}
                          className="text-xs font-bold pr-12 bg-white dark:bg-neutral-900"
                          required={campaignType === "BUNDLE_PACKAGE"}
                        />
                        <span className="absolute right-3 top-2.5 text-xs text-neutral-400 font-bold">
                          IDR
                        </span>
                      </div>
                      <p className="text-[10px] text-purple-700/80 dark:text-purple-300/80 mt-1">
                        Contoh: Jika diisi 200.000, pembeli yang belanja minimal Rp 200.000 akan otomatis mendapatkan diskon {discountValue || "5"}% untuk semua produknya.
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="disc-max-cap" className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                        Maksimal Potongan Diskon (Rp) <span className="text-neutral-400 font-normal">(Opsional)</span>
                      </Label>
                      <div className="relative mt-1">
                        <NumberInput
                          id="disc-max-cap"
                          placeholder="Kosongkan jika tanpa batas"
                          value={maxDiscountAmount}
                          onChange={(e) => setMaxDiscountAmount(e.target.value)}
                          className="text-xs pr-12 bg-white dark:bg-neutral-900"
                        />
                        <span className="absolute right-3 top-2.5 text-xs text-neutral-400 font-bold">
                          IDR
                        </span>
                      </div>
                      <p className="text-[10px] text-neutral-400 mt-1">
                        Batas maksimal nominal rupiah yang didapat pembeli (misal diskon 5% maksimal Rp 50.000).
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Target Produk */}
            <div className="space-y-3 border-b border-neutral-100 dark:border-neutral-800 pb-4">
              <Label className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                {campaignType === "GIFT_PACKAGE" ? "Target Produk Pembelian (Syarat Hadiah)" : "Target Produk yang Didiskon"}
              </Label>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTargetType("ALL_PRODUCTS")}
                  className={`py-2 px-3 rounded-lg border text-xs font-semibold transition-all ${
                    targetType === "ALL_PRODUCTS"
                      ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white"
                      : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50 dark:bg-neutral-900 dark:text-neutral-300 dark:border-neutral-800 dark:hover:bg-neutral-800"
                  }`}
                >
                  Semua Produk
                </button>

                <button
                  type="button"
                  onClick={() => setTargetType("CATEGORY")}
                  className={`py-2 px-3 rounded-lg border text-xs font-semibold transition-all ${
                    targetType === "CATEGORY"
                      ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white"
                      : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50 dark:bg-neutral-900 dark:text-neutral-300 dark:border-neutral-800 dark:hover:bg-neutral-800"
                  }`}
                >
                  Pilih Kategori
                </button>

                <button
                  type="button"
                  onClick={() => setTargetType("SPECIFIC_PRODUCTS")}
                  className={`py-2 px-3 rounded-lg border text-xs font-semibold transition-all ${
                    targetType === "SPECIFIC_PRODUCTS"
                      ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white"
                      : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50 dark:bg-neutral-900 dark:text-neutral-300 dark:border-neutral-800 dark:hover:bg-neutral-800"
                  }`}
                >
                  Pilih Produk Manual
                </button>
              </div>

              {/* Sub-view if Category */}
              {targetType === "CATEGORY" && (
                <div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-2">
                  <span className="text-[11px] font-bold text-neutral-600 dark:text-neutral-300 block">Centang Kategori yang Didiskon:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-1">
                    {categories.map((c) => {
                      const isChecked = selectedCategoryIds.includes(c.id);
                      return (
                        <label
                          key={c.id}
                          className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                            isChecked
                              ? "bg-white border-black font-semibold dark:bg-neutral-800 dark:border-white dark:text-white"
                              : "border-neutral-200 hover:bg-white dark:border-neutral-800 dark:hover:bg-neutral-800 dark:text-neutral-300"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCategoryIds((prev) => [...prev, c.id]);
                              } else {
                                setSelectedCategoryIds((prev) => prev.filter((id) => id !== c.id));
                              }
                            }}
                            className="accent-black dark:accent-white h-3.5 w-3.5"
                          />
                          <span className="truncate">{c.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sub-view if Specific Products */}
              {targetType === "SPECIFIC_PRODUCTS" && (
                <div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-neutral-600 dark:text-neutral-300">
                      Pilih Produk ({selectedProductIds.length} terpilih):
                    </span>
                    <button
                      type="button"
                      onClick={toggleSelectAllProducts}
                      className="text-[11px] text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white font-semibold underline"
                    >
                      {selectedProductIds.length === products.length ? "Batal Pilih Semua" : "Pilih Semua"}
                    </button>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-neutral-400" />
                    <input
                      type="text"
                      placeholder="Cari produk / SKU..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
                    />
                  </div>

                  <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                    {filteredModalProducts.map((p) => {
                      const isChecked = selectedProductIds.includes(p.id);
                      return (
                        <div
                          key={p.id}
                          onClick={() => {
                            if (isChecked) {
                              setSelectedProductIds((prev) => prev.filter((id) => id !== p.id));
                            } else {
                              setSelectedProductIds((prev) => [...prev, p.id]);
                            }
                          }}
                          className={`p-2 rounded-lg border text-xs cursor-pointer flex items-center justify-between gap-2 transition-colors ${
                            isChecked
                              ? "bg-white border-black shadow-sm dark:bg-neutral-800 dark:border-white"
                              : "border-neutral-200 bg-white/50 hover:bg-white dark:border-neutral-800 dark:bg-neutral-900/50 dark:hover:bg-neutral-800"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}} // handled by parent onClick
                              className="accent-black dark:accent-white h-3.5 w-3.5 shrink-0"
                            />
                            <div className="relative h-8 w-8 rounded bg-neutral-100 dark:bg-neutral-800 overflow-hidden shrink-0">
                              {p.images?.[0] ? (
                                <Image src={p.images[0]} alt={p.name} fill unoptimized className="object-cover" />
                              ) : (
                                <Package className="h-4 w-4 m-2 text-neutral-300" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">{p.name}</p>
                              <p className="text-[10px] text-neutral-400 font-mono">
                                SKU: {p.sku} • {formatIDR(p.price)}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            {discountType === "PERCENTAGE" && discountValue ? (
                              <div className="text-[10px]">
                                <span className="line-through text-neutral-400 block">{formatIDR(p.price)}</span>
                                <span className="font-bold text-red-600 dark:text-red-400">
                                  {formatIDR(Math.round(p.price * (1 - Number(discountValue) / 100)))}
                                </span>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Step 4: Periode & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-b border-neutral-100 dark:border-neutral-800 pb-4">
              <div>
                <Label htmlFor="start-date" className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                  Mulai Diskon
                </Label>
                <Input
                  id="start-date"
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1 text-xs [color-scheme:light] dark:[color-scheme:dark]"
                  required
                />
              </div>

              <div>
                <Label htmlFor="end-date" className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                  Berakhir Diskon
                </Label>
                <Input
                  id="end-date"
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1 text-xs [color-scheme:light] dark:[color-scheme:dark]"
                  required
                />
              </div>
            </div>

            {/* Status Aktif */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800">
              <div>
                <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 block">Status Kampanye</span>
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  {isActive ? "Promo aktif dan akan langsung berlaku di website" : "Promo disimpan sebagai draft (tidak aktif)"}
                </span>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting} className="bg-black hover:bg-neutral-800 text-white dark:bg-white dark:text-black dark:hover:bg-neutral-200">
                {isSubmitting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                Simpan Kampanye Diskon
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
