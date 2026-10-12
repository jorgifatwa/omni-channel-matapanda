"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Plus,
  Pencil,
  Trash2,
  SlidersHorizontal,
  ArrowUp,
  ArrowDown,
  Upload,
  Eye,
  CheckCircle2,
  Sparkles,
  Layers,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertDialog } from "@/components/ui/alert-dialog";
import {
  type AdminBannerItem,
  type BannerType,
  INITIAL_HERO_BANNERS,
  INITIAL_SECONDARY_BANNERS,
} from "@/lib/banner-store";

const LOCAL_STORAGE_KEY = "zodiac_admin_banners_v1";

export default function AdminBannersPage() {
  const [activeTab, setActiveTab] = React.useState<BannerType>("HERO_BANNER");
  const [banners, setBanners] = React.useState<AdminBannerItem[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [editingBanner, setEditingBanner] = React.useState<AdminBannerItem | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<AdminBannerItem | null>(null);

  // Form Fields
  const [formType, setFormType] = React.useState<BannerType>("HERO_BANNER");
  const [title, setTitle] = React.useState("");
  const [subtitle, setSubtitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [imageUrl, setImageUrl] = React.useState("");
  const [ctaText, setCtaText] = React.useState("");
  const [ctaLink, setCtaLink] = React.useState("");
  const [sortOrder, setSortOrder] = React.useState<number>(0);
  const [isActive, setIsActive] = React.useState(true);
  const [formError, setFormError] = React.useState<string | null>(null);

  const [categoriesList, setCategoriesList] = React.useState<{ name: string; slug: string }[]>([]);

  // Fetch categories for Quick Selector
  React.useEffect(() => {
    fetch("/api/menu")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.categories) {
          setCategoriesList(data.categories);
        }
      })
      .catch(() => {});
  }, []);

  // Toast
  const [toast, setToast] = React.useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const showToast = (type: "success" | "error" | "info", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  // Load Banners
  const loadBanners = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/banners");
      if (res.ok) {
        const json = await res.json();
        if (json.banners && Array.isArray(json.banners) && json.banners.length > 0) {
          setBanners(json.banners);
          if (typeof window !== "undefined") {
            window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(json.banners));
          }
          return;
        }
      }
    } catch {
      console.warn("Failed fetching banners from API, trying localStorage...");
    } finally {
      setLoading(false);
    }

    // Fallback to localStorage or initial presets
    if (typeof window !== "undefined") {
      try {
        const local = window.localStorage.getItem(LOCAL_STORAGE_KEY);
        if (local) {
          setBanners(JSON.parse(local));
          setLoading(false);
          return;
        }
      } catch {
        // Ignore JSON error
      }
    }

    setBanners([...INITIAL_HERO_BANNERS, ...INITIAL_SECONDARY_BANNERS]);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    loadBanners();
  }, [loadBanners]);

  // Persist locally on change
  const saveBannersLocally = (updated: AdminBannerItem[]) => {
    setBanners(updated);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Ignore
      }
    }
  };

  // Filtered by active tab
  const currentTabBanners = React.useMemo(() => {
    return banners
      .filter((b) => b.type === activeTab)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [banners, activeTab]);

  const heroBanners = React.useMemo(
    () => banners.filter((b) => b.type === "HERO_BANNER").sort((a, b) => a.sortOrder - b.sortOrder),
    [banners]
  );
  const secondaryBanners = React.useMemo(
    () => banners.filter((b) => b.type === "SECONDARY_BANNER").sort((a, b) => a.sortOrder - b.sortOrder),
    [banners]
  );

  // Open Add Modal
  const openCreateModal = (type: BannerType) => {
    setEditingBanner(null);
    setFormType(type);
    setTitle("");
    setSubtitle("");
    setDescription("");
    setImageUrl("");
    setCtaText(type === "HERO_BANNER" ? "Discover Collection" : "Shop The Collection");
    setCtaLink(type === "HERO_BANNER" ? "/new-arrivals" : "/new-arrivals");
    const sameTypeBanners = banners.filter((b) => b.type === type);
    setSortOrder(sameTypeBanners.length);
    setIsActive(true);
    setFormError(null);
    setModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (banner: AdminBannerItem) => {
    setEditingBanner(banner);
    setFormType(banner.type);
    setTitle(banner.title);
    setSubtitle(banner.subtitle || "");
    setDescription(banner.description || "");
    setImageUrl(banner.imageUrl);
    setCtaText(banner.ctaText || "");
    setCtaLink(banner.ctaLink || "");
    setSortOrder(banner.sortOrder);
    setIsActive(banner.isActive);
    setFormError(null);
    setModalOpen(true);
  };

  // Image Upload handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "banners");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload gagal");
      const data = await res.json();
      if (data.url) {
        setImageUrl(data.url);
        showToast("success", "Foto banner berhasil diunggah!");
      }
    } catch {
      showToast("error", "Gagal mengunggah foto banner. Silakan masukkan URL gambar.");
    } finally {
      setIsUploading(false);
    }
  };

  // Save Banner (Create / Update)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError(
        formType === "HERO_BANNER"
          ? "Label Kategori / Judul wajib diisi."
          : "Judul Promo Utama wajib diisi."
      );
      return;
    }
    if (!imageUrl.trim()) {
      setFormError("Gambar Banner wajib diunggah atau masukkan URL gambar.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const payload = {
      type: formType,
      title: title.trim(),
      subtitle: subtitle.trim() || null,
      description: description.trim() || null,
      imageUrl: imageUrl.trim(),
      ctaText: ctaText.trim() || null,
      ctaLink: ctaLink.trim() || null,
      sortOrder: Number(sortOrder) || 0,
      isActive,
    };

    try {
      if (editingBanner) {
        // Update via API
        const res = await fetch(`/api/admin/banners/${editingBanner.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const updatedItem: AdminBannerItem = {
          ...editingBanner,
          ...payload,
          updatedAt: new Date().toISOString(),
        };

        if (res.ok) {
          const data = await res.json();
          if (data.banner) Object.assign(updatedItem, data.banner);
        }

        const nextList = banners.map((b) => (b.id === editingBanner.id ? updatedItem : b));
        saveBannersLocally(nextList);
        showToast("success", `Banner "${payload.title}" berhasil diperbarui!`);
      } else {
        // Create via API
        const res = await fetch("/api/admin/banners", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        let newItem: AdminBannerItem = {
          id: `banner-${Date.now()}`,
          ...payload,
          createdAt: new Date().toISOString(),
        };

        if (res.ok) {
          const data = await res.json();
          if (data.banner) newItem = data.banner;
        }

        const nextList = [...banners, newItem];
        saveBannersLocally(nextList);
        showToast("success", `Banner "${payload.title}" berhasil ditambahkan!`);
      }

      setModalOpen(false);
    } catch {
      showToast("error", "Terjadi kesalahan saat menyimpan banner.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Active Switch directly from list
  const handleToggleActive = async (banner: AdminBannerItem) => {
    const nextActive = !banner.isActive;
    const updated: AdminBannerItem = { ...banner, isActive: nextActive };
    const nextList = banners.map((b) => (b.id === banner.id ? updated : b));
    saveBannersLocally(nextList);

    try {
      await fetch(`/api/admin/banners/${banner.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextActive }),
      });
    } catch {
      // Ignore API failure, local already saved
    }

    showToast(
      "info",
      `Banner "${banner.title}" ${nextActive ? "diaktifkan" : "dinonaktifkan"}.`
    );
  };

  // Move Order Up / Down
  const handleMoveOrder = async (banner: AdminBannerItem, direction: "UP" | "DOWN") => {
    const sameType = banners
      .filter((b) => b.type === banner.type)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const idx = sameType.findIndex((b) => b.id === banner.id);
    if (idx < 0) return;
    if (direction === "UP" && idx === 0) return;
    if (direction === "DOWN" && idx === sameType.length - 1) return;

    const targetIdx = direction === "UP" ? idx - 1 : idx + 1;
    const currentItem = sameType[idx];
    const targetItem = sameType[targetIdx];

    // Swap sortOrder
    const currentOrder = currentItem.sortOrder;
    const targetOrder = targetItem.sortOrder;

    const updatedList = banners.map((b) => {
      if (b.id === currentItem.id) return { ...b, sortOrder: targetOrder };
      if (b.id === targetItem.id) return { ...b, sortOrder: currentOrder };
      return b;
    });

    saveBannersLocally(updatedList);

    // Sync to API
    try {
      await Promise.all([
        fetch(`/api/admin/banners/${currentItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: targetOrder }),
        }),
        fetch(`/api/admin/banners/${targetItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: currentOrder }),
        }),
      ]);
    } catch {
      // Ignore
    }

    showToast("info", `Urutan banner "${banner.title}" berhasil dipindahkan.`);
  };

  // Delete Banner Confirmation
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    try {
      await fetch(`/api/admin/banners/${deleteTarget.id}`, {
        method: "DELETE",
      }).catch(() => {});
    } finally {
      const nextList = banners.filter((b) => b.id !== deleteTarget.id);
      saveBannersLocally(nextList);
      showToast("success", `Banner "${deleteTarget.title}" berhasil dihapus.`);
      setDeleteTarget(null);
    }
  };

  // Reset to default presets
  const handleResetDefaults = () => {
    const nextList = [...INITIAL_HERO_BANNERS, ...INITIAL_SECONDARY_BANNERS];
    saveBannersLocally(nextList);
    showToast("success", "Banner beranda berhasil direset ke preset default.");
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-lg shadow-xl text-xs font-semibold flex items-center gap-2 border animate-in slide-in-from-bottom-3 ${
            toast.type === "success"
              ? "bg-emerald-950 border-emerald-700 text-emerald-100"
              : toast.type === "error"
              ? "bg-red-950 border-red-700 text-red-100"
              : "bg-neutral-900 border-neutral-700 text-white"
          }`}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
              Pengaturan Banner Beranda
            </h1>
            <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">
              Storefront UI
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            Atur dan kelola visual slide <strong>Banner Kesatu</strong> (Hero Lifestyle Carousel) dan <strong>Banner Kedua</strong> (Secondary Promo Carousel) pada halaman utama.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetDefaults}
            className="h-9 gap-1.5 text-xs text-neutral-600 hover:text-black dark:text-neutral-400 dark:hover:text-white"
            title="Reset ke preset default toko"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Reset Default</span>
          </Button>

          <Button
            onClick={() => openCreateModal(activeTab)}
            className="h-9 gap-1.5 bg-black hover:bg-neutral-800 text-white dark:bg-white dark:text-black dark:hover:bg-neutral-200 text-xs font-semibold"
          >
            <Plus className="h-4 w-4" />
            <span>
              {activeTab === "HERO_BANNER" ? "Tambah Slide Hero" : "Tambah Promo Banner"}
            </span>
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as BannerType)}
        className="w-full space-y-6"
      >
        <TabsList className="grid w-full grid-cols-2 max-w-md bg-neutral-100 dark:bg-neutral-900 p-1 rounded-xl">
          <TabsTrigger
            value="HERO_BANNER"
            className="text-xs font-semibold gap-2 py-2 data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm dark:data-[state=active]:bg-neutral-800 dark:data-[state=active]:text-white"
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Banner Kesatu (Hero)</span>
            <Badge
              variant="secondary"
              className="ml-1 text-[10px] px-1.5 py-0 h-4 min-w-[16px] flex items-center justify-center font-bold"
            >
              {heroBanners.length}
            </Badge>
          </TabsTrigger>

          <TabsTrigger
            value="SECONDARY_BANNER"
            className="text-xs font-semibold gap-2 py-2 data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm dark:data-[state=active]:bg-neutral-800 dark:data-[state=active]:text-white"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Banner Kedua (Promo)</span>
            <Badge
              variant="secondary"
              className="ml-1 text-[10px] px-1.5 py-0 h-4 min-w-[16px] flex items-center justify-center font-bold"
            >
              {secondaryBanners.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1 Content: Hero Banner */}
        <TabsContent value="HERO_BANNER" className="space-y-4 outline-none">
          <div className="bg-neutral-50 dark:bg-neutral-900/50 p-4 rounded-xl border border-neutral-200/80 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                Struktur Banner Kesatu:
              </span>
              <span className="text-neutral-500">
                Carousel kategori editorial full-screen di bagian paling atas halaman beranda (Default: 8 kategori).
              </span>
            </div>
            <Link
              href="/"
              target="_blank"
              className="inline-flex items-center gap-1.5 text-neutral-700 hover:text-black dark:text-neutral-300 dark:hover:text-white font-medium underline underline-offset-4 shrink-0"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Lihat di Beranda</span>
            </Link>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-neutral-400 gap-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-xs">Memuat data banner...</p>
            </div>
          ) : currentTabBanners.length === 0 ? (
            <div className="py-16 text-center border border-dashed rounded-xl border-neutral-300 dark:border-neutral-800">
              <SlidersHorizontal className="h-10 w-10 text-neutral-400 mx-auto mb-2 stroke-[1.2]" />
              <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                Belum ada Slide Hero
              </p>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto mt-1 mb-4">
                Tambahkan slide kategori baru untuk ditampilkan pada carousel hero beranda.
              </p>
              <Button
                onClick={() => openCreateModal("HERO_BANNER")}
                className="h-9 gap-1.5 bg-black text-white dark:bg-white dark:text-black text-xs"
              >
                <Plus className="h-4 w-4" />
                <span>Tambah Slide Hero Pertama</span>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {currentTabBanners.map((banner, index) => (
                <div
                  key={banner.id}
                  className={`group relative flex flex-col justify-between rounded-xl border overflow-hidden bg-white dark:bg-neutral-950 transition-all ${
                    banner.isActive
                      ? "border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-md"
                      : "border-neutral-200/50 dark:border-neutral-800/50 opacity-60 bg-neutral-50 dark:bg-neutral-900"
                  }`}
                >
                  {/* Visual Card Image */}
                  <div className="relative aspect-[16/10] w-full bg-neutral-100 dark:bg-neutral-900 overflow-hidden">
                    <Image
                      src={banner.imageUrl}
                      alt={banner.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 300px"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/30" />

                    {/* Badge Order & Status */}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10">
                      <span className="h-5 px-2 rounded-full bg-black/80 text-white text-[10px] font-mono font-bold flex items-center justify-center backdrop-blur-sm">
                        Slide {index + 1}
                      </span>
                      {!banner.isActive && (
                        <span className="h-5 px-2 rounded-full bg-red-600 text-white text-[9px] font-bold uppercase tracking-wider flex items-center justify-center">
                          Nonaktif
                        </span>
                      )}
                    </div>

                    {/* Slide Overlay Title & Link */}
                    <div className="absolute bottom-2.5 inset-x-2.5 z-10 text-white">
                      <h3 className="text-lg font-bold uppercase tracking-tight leading-tight drop-shadow-sm">
                        {banner.title}
                      </h3>
                      {banner.ctaLink && (
                        <p className="text-[11px] text-neutral-300 font-mono truncate">
                          {banner.ctaLink}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Card Content & Action Bar */}
                  <div className="p-3.5 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-1">
                      {banner.subtitle && (
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-1 font-medium">
                          {banner.subtitle}
                        </p>
                      )}
                      <p className="text-[11px] text-neutral-500">
                        CTA: <span className="font-semibold text-neutral-700 dark:text-neutral-300">{banner.ctaText || `Discover ${banner.title}`} &rarr;</span>
                      </p>
                    </div>

                    {/* Bottom Controls */}
                    <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-2">
                      {/* Order buttons */}
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={index === 0}
                          onClick={() => handleMoveOrder(banner, "UP")}
                          className="h-7 w-7 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30"
                          title="Geser ke urutan sebelumnya"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={index === currentTabBanners.length - 1}
                          onClick={() => handleMoveOrder(banner, "DOWN")}
                          className="h-7 w-7 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30"
                          title="Geser ke urutan berikutnya"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      {/* Active Switch & Action Buttons */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5" title={banner.isActive ? "Slide aktif" : "Slide nonaktif"}>
                          <Switch
                            checked={banner.isActive}
                            onCheckedChange={() => handleToggleActive(banner)}
                            className="scale-75 origin-right"
                          />
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => openEditModal(banner)}
                          className="h-7 w-7 rounded-md border-neutral-200 dark:border-neutral-800"
                          title="Edit Slide"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setDeleteTarget(banner)}
                          className="h-7 w-7 rounded-md text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-950"
                          title="Hapus Slide"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab 2 Content: Secondary Banner */}
        <TabsContent value="SECONDARY_BANNER" className="space-y-4 outline-none">
          <div className="bg-neutral-50 dark:bg-neutral-900/50 p-4 rounded-xl border border-neutral-200/80 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                Struktur Banner Kedua:
              </span>
              <span className="text-neutral-500">
                Banner promosi beranda tepat di bawah Hero Carousel. Anda dapat mengatur dan menambahkan slide promo tanpa batasan jumlah (2, 3, 4, 5+ slide).
              </span>
            </div>
            <Link
              href="/"
              target="_blank"
              className="inline-flex items-center gap-1.5 text-neutral-700 hover:text-black dark:text-neutral-300 dark:hover:text-white font-medium underline underline-offset-4 shrink-0"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Lihat di Beranda</span>
            </Link>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-neutral-400 gap-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-xs">Memuat data banner...</p>
            </div>
          ) : currentTabBanners.length === 0 ? (
            <div className="py-16 text-center border border-dashed rounded-xl border-neutral-300 dark:border-neutral-800">
              <Sparkles className="h-10 w-10 text-neutral-400 mx-auto mb-2 stroke-[1.2]" />
              <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                Belum ada Banner Promo Kedua
              </p>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto mt-1 mb-4">
                Tambahkan slide promosi untuk ditampilkan di bawah Hero Carousel.
              </p>
              <Button
                onClick={() => openCreateModal("SECONDARY_BANNER")}
                className="h-9 gap-1.5 bg-black text-white dark:bg-white dark:text-black text-xs"
              >
                <Plus className="h-4 w-4" />
                <span>Tambah Promo Banner Pertama</span>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentTabBanners.map((banner, index) => (
                <div
                  key={banner.id}
                  className={`group relative flex flex-col justify-between rounded-xl border overflow-hidden bg-white dark:bg-neutral-950 transition-all ${
                    banner.isActive
                      ? "border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-md"
                      : "border-neutral-200/50 dark:border-neutral-800/50 opacity-60 bg-neutral-50 dark:bg-neutral-900"
                  }`}
                >
                  {/* Visual Promo Preview */}
                  <div className="relative aspect-[16/9] w-full bg-neutral-100 dark:bg-neutral-900 overflow-hidden">
                    <Image
                      src={banner.imageUrl}
                      alt={banner.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 600px"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/45" />

                    {/* Order Badge & Status */}
                    <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
                      <span className="h-5 px-2.5 rounded-full bg-black/80 text-white text-[10px] font-mono font-bold flex items-center justify-center backdrop-blur-sm">
                        Promo Slide {index + 1}
                      </span>
                      {!banner.isActive && (
                        <span className="h-5 px-2 rounded-full bg-red-600 text-white text-[9px] font-bold uppercase tracking-wider flex items-center justify-center">
                          Nonaktif
                        </span>
                      )}
                    </div>

                    {/* Centered Promo Typography Preview */}
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center p-6 text-white space-y-2">
                      <h3 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight drop-shadow-md">
                        {banner.title}
                      </h3>
                      {banner.subtitle && (
                        <p className="text-xs sm:text-sm font-medium text-white/90 max-w-md line-clamp-2 drop-shadow-sm">
                          {banner.subtitle}
                        </p>
                      )}
                      {banner.ctaText && (
                        <span className="mt-2 inline-flex items-center gap-1.5 bg-white text-black px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider shadow-md">
                          <span>{banner.ctaText}</span>
                          <span>&rarr;</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Promo Details & Action Footer */}
                  <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-1 text-xs">
                      {banner.description && (
                        <p className="text-neutral-600 dark:text-neutral-400 line-clamp-2">
                          {banner.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 pt-1 font-mono text-[11px] text-neutral-500">
                        <span>Link:</span>
                        <code className="bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded text-black dark:text-neutral-200 truncate">
                          {banner.ctaLink || "-"}
                        </code>
                      </div>
                    </div>

                    {/* Bottom Action Row */}
                    <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-3">
                      {/* Order buttons */}
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={index === 0}
                          onClick={() => handleMoveOrder(banner, "UP")}
                          className="h-8 w-8 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30"
                          title="Geser ke atas"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={index === currentTabBanners.length - 1}
                          onClick={() => handleMoveOrder(banner, "DOWN")}
                          className="h-8 w-8 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30"
                          title="Geser ke bawah"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Active switch & edit/delete */}
                      <div className="flex items-center gap-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-neutral-500 font-medium">
                            {banner.isActive ? "Aktif" : "Nonaktif"}
                          </span>
                          <Switch
                            checked={banner.isActive}
                            onCheckedChange={() => handleToggleActive(banner)}
                          />
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(banner)}
                          className="h-8 px-3 gap-1.5 text-xs font-semibold border-neutral-200 dark:border-neutral-800"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span>Edit</span>
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setDeleteTarget(banner)}
                          className="h-8 w-8 text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-950"
                          title="Hapus Promo Banner"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal Tambah / Edit Banner */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>
                {editingBanner
                  ? `Edit ${formType === "HERO_BANNER" ? "Slide Hero" : "Promo Banner"}`
                  : `Tambah ${formType === "HERO_BANNER" ? "Slide Hero Baru" : "Promo Banner Baru"}`}
              </DialogTitle>
              <DialogDescription>
                {formType === "HERO_BANNER"
                  ? "Atur kategori, link navigasi, dan foto background resolusi tinggi untuk carousel beranda utama."
                  : "Atur judul promosi, subtitle, tombol CTA, dan gambar latar untuk promo banner sekunder."}
              </DialogDescription>
            </DialogHeader>

            {formError && (
              <div className="mt-4 p-3 text-xs bg-red-50 border border-red-200 text-red-700 rounded-md">
                {formError}
              </div>
            )}

            <div className="space-y-4 py-4">
              {/* Quick Category / Page Selector (Opsi 1) */}
              <div className="space-y-1.5 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800">
                <Label htmlFor="banner-quick-target" className="text-xs font-semibold flex items-center justify-between">
                  <span>Pilih Cepat Kategori / Halaman Target (Opsi 1)</span>
                  <span className="text-[10px] text-neutral-500 font-normal">Otomatis isi judul &amp; link</span>
                </Label>
                <select
                  id="banner-quick-target"
                  className="flex h-9 w-full rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-3 text-xs"
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) return;
                    const [optTitle, optLink] = val.split("|");
                    if (optTitle) setTitle(optTitle);
                    if (optLink) {
                      setCtaLink(optLink);
                      setCtaText(formType === "HERO_BANNER" ? `Discover ${optTitle}` : "Shop The Collection");
                    }
                  }}
                >
                  <option value="">-- Pilih dari Kategori / Halaman --</option>
                  <option value="New in|/new-arrivals">New in (/new-arrivals)</option>
                  {categoriesList.map((cat) => (
                    <option key={cat.slug} value={`${cat.name}|/categories/${cat.slug}`}>
                      {cat.name} (/categories/{cat.slug})
                    </option>
                  ))}
                  <option value="All Bags|/new-arrivals">All Bags (/new-arrivals)</option>
                </select>
              </div>

              {/* Field 1: Title / Label */}
              <div className="space-y-1.5">
                <Label htmlFor="banner-title" className="text-xs font-semibold">
                  {formType === "HERO_BANNER"
                    ? "Label Kategori / Judul Slide *"
                    : "Judul Promo Utama *"}
                </Label>
                <Input
                  id="banner-title"
                  placeholder={
                    formType === "HERO_BANNER"
                      ? "Misal: New in, Tote Bags, Sling Bags, Backpacks"
                      : "Misal: Free shipping, Everyday carryalls"
                  }
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              {/* Field 2: Subtitle */}
              <div className="space-y-1.5">
                <Label htmlFor="banner-subtitle" className="text-xs font-semibold">
                  Subtitle (Opsional)
                </Label>
                <Input
                  id="banner-subtitle"
                  placeholder={
                    formType === "HERO_BANNER"
                      ? "Misal: Koleksi tas fungsional & stylish"
                      : "Misal: With minimum spend inclusive of custom duties and taxes"
                  }
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              {/* Field 3: Description (For Secondary Banner) */}
              {formType === "SECONDARY_BANNER" && (
                <div className="space-y-1.5">
                  <Label htmlFor="banner-desc" className="text-xs font-semibold">
                    Deskripsi Singkat (Opsional)
                  </Label>
                  <textarea
                    id="banner-desc"
                    rows={2}
                    placeholder="Nikmati pengiriman gratis ke seluruh Indonesia..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full rounded-md border border-neutral-200 dark:border-neutral-800 bg-transparent p-2 text-xs focus:outline-none focus:ring-1 focus:ring-neutral-950"
                  />
                </div>
              )}

              {/* Field 4: Image Upload & URL */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">
                  Foto Banner Background *
                </Label>

                {/* Image Preview */}
                {imageUrl && (
                  <div className="relative aspect-[16/9] w-full max-h-48 rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900">
                    <Image
                      src={imageUrl}
                      alt="Banner Preview"
                      fill
                      className="object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setImageUrl("")}
                      className="absolute top-2 right-2 bg-black/80 hover:bg-black text-white text-[10px] font-bold px-2 py-1 rounded-md"
                    >
                      Hapus Foto
                    </button>
                  </div>
                )}

                {/* Upload or URL input */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="flex items-center justify-center gap-2 h-9 px-3 border border-neutral-300 dark:border-neutral-700 rounded-md cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-xs font-medium">
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-neutral-500" />
                        <span>Mengunggah...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 text-neutral-500" />
                        <span>Upload File Gambar</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={isUploading}
                      className="hidden"
                    />
                  </label>

                  <Input
                    placeholder="Atau masukkan URL gambar..."
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="h-9 text-xs font-mono"
                  />
                </div>
                <p className="text-[11px] text-neutral-400">
                  Rekomendasi rasio gambar: 16:9 atau 21:9 resolusi tinggi (minimal 1920x1080px).
                </p>
              </div>

              {/* Field 5: CTA Text & CTA Link */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="banner-cta-text" className="text-xs font-semibold">
                    Teks Tombol CTA
                  </Label>
                  <Input
                    id="banner-cta-text"
                    placeholder={
                      formType === "HERO_BANNER"
                        ? `Discover ${title || "Collection"}`
                        : "Shop The Collection"
                    }
                    value={ctaText}
                    onChange={(e) => setCtaText(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="banner-cta-link" className="text-xs font-semibold">
                    Link Tujuan (URL / Route)
                  </Label>
                  <Input
                    id="banner-cta-link"
                    placeholder="/new-arrivals atau /categories/bags-totes"
                    value={ctaLink}
                    onChange={(e) => setCtaLink(e.target.value)}
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Field 6: Status Aktif & Urutan */}
              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    id="banner-active"
                    checked={isActive}
                    onCheckedChange={setIsActive}
                  />
                  <Label htmlFor="banner-active" className="text-xs font-medium cursor-pointer">
                    Aktifkan Slide di Toko
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <Label htmlFor="banner-sort" className="text-xs text-neutral-500">
                    Urutan:
                  </Label>
                  <Input
                    id="banner-sort"
                    type="number"
                    min={0}
                    value={sortOrder}
                    onChange={(e) => setSortOrder(Number(e.target.value))}
                    className="h-8 w-16 text-xs text-center font-mono"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                className="h-9 text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || isUploading}
                className="h-9 text-xs bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black font-semibold"
              >
                {isSubmitting ? "Menyimpan..." : "Simpan Banner"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Konfirmasi Hapus */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Hapus Banner?"
        description={`Apakah Anda yakin ingin menghapus slide "${deleteTarget?.title}"? Tindakan ini tidak dapat dibatalkan.`}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
