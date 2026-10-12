"use client";

import * as React from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Ticket,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  Copy,
  Check,
  Users,
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
import { formatIDR } from "@/lib/products";
import { type Coupon, type CouponDiscountType } from "@/lib/coupon-store";

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = React.useState<Coupon[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"ALL" | "ACTIVE" | "EXPIRED" | "INACTIVE">("ALL");

  // Modal State
  const [modalOpen, setModalOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  // Form Fields
  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [discountType, setDiscountType] = React.useState<CouponDiscountType>("PERCENTAGE");
  const [discountValue, setDiscountValue] = React.useState<number | string>(10);
  const [minSpend, setMinSpend] = React.useState<number | string>(0);
  const [maxDiscount, setMaxDiscount] = React.useState<number | string>("");
  const [usageLimit, setUsageLimit] = React.useState<number | string>("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Delete State
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Copy Feedback
  const [copiedCode, setCopiedCode] = React.useState<string | null>(null);

  const fetchCoupons = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/coupons");
      const data = await res.json();
      if (data.coupons) {
        setCoupons(data.coupons);
      }
    } catch (err) {
      console.error("Failed to load coupons:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  // Statistics
  const nowIso = new Date().toISOString();
  const totalCount = coupons.length;
  const activeCount = coupons.filter(
    (c) => c.isActive && (!c.startDate || c.startDate <= nowIso) && (!c.endDate || c.endDate >= nowIso)
  ).length;
  const totalUses = coupons.reduce((sum, c) => sum + (c.usageCount || 0), 0);
  const expiredCount = coupons.filter((c) => c.endDate && c.endDate < nowIso).length;

  // Filtered List
  const filteredCoupons = React.useMemo(() => {
    return coupons.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q));

      if (!matchSearch) return false;

      const isLiveActive =
        c.isActive &&
        (!c.startDate || c.startDate <= nowIso) &&
        (!c.endDate || c.endDate >= nowIso);
      const isExpired = Boolean(c.endDate && c.endDate < nowIso);

      if (statusFilter === "ACTIVE") return isLiveActive;
      if (statusFilter === "EXPIRED") return isExpired;
      if (statusFilter === "INACTIVE") return !c.isActive;

      return true;
    });
  }, [coupons, searchQuery, statusFilter, nowIso]);

  // Reset Modal Form
  const resetForm = () => {
    const today = new Date();
    const future = new Date(today.getTime() + 30 * 86400000);

    const pad = (n: number) => String(n).padStart(2, "0");
    const toLocalInput = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
        d.getMinutes()
      )}`;

    setCode("");
    setName("");
    setDescription("");
    setDiscountType("PERCENTAGE");
    setDiscountValue(10);
    setMinSpend(0);
    setMaxDiscount("");
    setUsageLimit("");
    setStartDate(toLocalInput(today));
    setEndDate(toLocalInput(future));
    setIsActive(true);
    setErrorMessage(null);
    setEditingId(null);
  };

  const openCreateModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = (c: Coupon) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    const toLocalInput = (isoStr: string) => {
      if (!isoStr) return "";
      const d = new Date(isoStr);
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
        d.getMinutes()
      )}`;
    };

    setCode(c.code);
    setName(c.name);
    setDescription(c.description || "");
    setDiscountType(c.discountType);
    setDiscountValue(c.discountValue);
    setMinSpend(c.minSpend || 0);
    setMaxDiscount(c.maxDiscount ? c.maxDiscount : "");
    setUsageLimit(c.usageLimit ? c.usageLimit : "");
    setStartDate(toLocalInput(c.startDate));
    setEndDate(toLocalInput(c.endDate));
    setIsActive(c.isActive);
    setErrorMessage(null);
    setEditingId(c.id);
    setModalOpen(true);
  };

  // Toggle Active Status
  const handleToggleStatus = async (id: string, current: boolean) => {
    try {
      const res = await fetch(`/api/admin/coupons/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toggleOnly: true, isActive: !current }),
      });
      if (res.ok) {
        setCoupons((prev) =>
          prev.map((c) => (c.id === id ? { ...c, isActive: !current } : c))
        );
      }
    } catch (err) {
      console.error("Failed to toggle coupon status:", err);
    }
  };

  // Submit Create or Edit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setErrorMessage("Kode kupon wajib diisi (misal: INFLUENCER10)");
      return;
    }
    if (!name.trim()) {
      setErrorMessage("Nama kupon / influencer wajib diisi");
      return;
    }
    if (Number(discountValue) <= 0) {
      setErrorMessage("Nilai diskon harus lebih besar dari 0");
      return;
    }
    if (discountType === "PERCENTAGE" && Number(discountValue) > 100) {
      setErrorMessage("Diskon persentase tidak boleh lebih dari 100%");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const payload = {
        id: editingId || undefined,
        code: code.trim().toUpperCase(),
        name: name.trim(),
        description: description.trim(),
        discountType,
        discountValue: Number(discountValue),
        minSpend: Number(minSpend) || 0,
        maxDiscount: maxDiscount ? Number(maxDiscount) : null,
        usageLimit: usageLimit ? Number(usageLimit) : null,
        startDate: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
        endDate: endDate ? new Date(endDate).toISOString() : new Date(Date.now() + 30 * 86400000).toISOString(),
        isActive,
      };

      const url = editingId ? `/api/admin/coupons/${editingId}` : "/api/admin/coupons";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Gagal menyimpan kupon.");
        return;
      }

      setModalOpen(false);
      fetchCoupons();
    } catch (err) {
      console.error("Submit error:", err);
      setErrorMessage("Terjadi kesalahan saat menyimpan kupon.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete
  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/admin/coupons/${deleteConfirmId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setCoupons((prev) => prev.filter((c) => c.id !== deleteConfirmId));
        setDeleteConfirmId(null);
      }
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Copy Code to Clipboard
  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
              Kupon & Voucher Influencer
            </h1>
            <Badge variant="outline" className="text-xs uppercase bg-emerald-50 text-emerald-700 border-emerald-300">
              Double Discount
            </Badge>
          </div>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Kelola kode voucher khusus influencer & promo media sosial yang dapat digabungkan langsung dengan harga promo katalog.
          </p>
        </div>

        <Button
          onClick={openCreateModal}
          className="rounded-none bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 text-xs uppercase tracking-wider font-medium px-4 py-2.5 flex items-center gap-2 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>Buat Kupon Baru</span>
        </Button>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs uppercase tracking-wider">
            <span>Total Kupon</span>
            <Ticket className="h-4 w-4 text-neutral-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-neutral-900 dark:text-white">
            {totalCount}
          </p>
          <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">Semua voucher tersimpan</p>
        </div>

        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 text-xs uppercase tracking-wider">
            <span>Sedang Aktif</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {activeCount}
          </p>
          <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">Siap digunakan saat checkout</p>
        </div>

        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
          <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 text-xs uppercase tracking-wider">
            <span>Total Penggunaan</span>
            <Users className="h-4 w-4 text-blue-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-blue-600 dark:text-blue-400">
            {totalUses}
          </p>
          <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">Kali voucher ditukarkan</p>
        </div>

        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs uppercase tracking-wider">
            <span>Kedaluwarsa</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-neutral-900 dark:text-white">
            {expiredCount}
          </p>
          <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">Masa berlaku berakhir</p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-neutral-900 p-3 rounded-lg border border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-1 border-b sm:border-b-0 pb-2 sm:pb-0 overflow-x-auto">
          {[
            { key: "ALL", label: "Semua Kupon" },
            { key: "ACTIVE", label: "Aktif" },
            { key: "EXPIRED", label: "Kedaluwarsa" },
            { key: "INACTIVE", label: "Nonaktif" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key as "ALL" | "ACTIVE" | "EXPIRED" | "INACTIVE")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                statusFilter === tab.key
                  ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-black"
                  : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px] sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari kode kupon / influencer..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-neutral-200 dark:border-neutral-800 rounded-md bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:border-black dark:focus:border-white"
          />
        </div>
      </div>

      {/* Coupons Table */}
      <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-neutral-400">
            <Loader2 className="h-6 w-6 animate-spin mb-2" />
            <span className="text-xs">Memuat daftar kupon...</span>
          </div>
        ) : filteredCoupons.length === 0 ? (
          <div className="py-16 text-center text-neutral-400">
            <Ticket className="h-10 w-10 stroke-[1.2] mx-auto mb-2 text-neutral-300 dark:text-neutral-700" />
            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
              Tidak ada kupon ditemukan
            </p>
            <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? "Tidak ada kupon yang cocok dengan kata kunci pencarian Anda."
                : "Belum ada kode kupon yang dibuat. Klik tombol di atas untuk membuat voucher influencer pertama Anda."}
            </p>
            {!searchQuery && (
              <Button
                onClick={openCreateModal}
                variant="outline"
                className="mt-4 text-xs tracking-wider uppercase font-medium"
              >
                + Buat Kupon Baru
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/75 dark:bg-neutral-950/50 text-neutral-500 font-medium uppercase tracking-wider">
                  <th className="py-3.5 px-4">Kode Kupon</th>
                  <th className="py-3.5 px-4">Nama / Influencer</th>
                  <th className="py-3.5 px-4">Nilai Potongan</th>
                  <th className="py-3.5 px-4">Min. Belanja</th>
                  <th className="py-3.5 px-4">Penggunaan</th>
                  <th className="py-3.5 px-4">Masa Berlaku</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {filteredCoupons.map((coupon) => {
                  const isExpired = Boolean(coupon.endDate && coupon.endDate < nowIso);
                  const isScheduled = Boolean(coupon.startDate && coupon.startDate > nowIso);
                  const isLive = coupon.isActive && !isExpired && !isScheduled;

                  const startFormatted = coupon.startDate
                    ? new Date(coupon.startDate).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "-";
                  const endFormatted = coupon.endDate
                    ? new Date(coupon.endDate).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "Seterusnya";

                  const usagePercent =
                    coupon.usageLimit && coupon.usageLimit > 0
                      ? Math.min(100, Math.round((coupon.usageCount / coupon.usageLimit) * 100))
                      : null;

                  return (
                    <tr
                      key={coupon.id}
                      className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors"
                    >
                      {/* Code Badge with Copy button */}
                      <td className="py-4 px-4 font-mono font-bold">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-block bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 px-2.5 py-1 rounded text-neutral-900 dark:text-neutral-100 tracking-wider">
                            {coupon.code}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyCode(coupon.code)}
                            className="p-1 text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
                            title="Salin kode kupon"
                          >
                            {copiedCode === coupon.code ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Name & Description */}
                      <td className="py-4 px-4 min-w-[180px]">
                        <p className="font-semibold text-neutral-900 dark:text-neutral-100">
                          {coupon.name}
                        </p>
                        {coupon.description && (
                          <p className="text-[11px] text-neutral-500 mt-0.5 line-clamp-1">
                            {coupon.description}
                          </p>
                        )}
                      </td>

                      {/* Value */}
                      <td className="py-4 px-4 font-medium">
                        {coupon.discountType === "PERCENTAGE" ? (
                          <div>
                            <span className="text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                              {coupon.discountValue}% OFF
                            </span>
                            {coupon.maxDiscount && (
                              <p className="text-[10px] text-neutral-400">
                                Maks. {formatIDR(coupon.maxDiscount)}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                            {formatIDR(coupon.discountValue)}
                          </span>
                        )}
                      </td>

                      {/* Min Spend */}
                      <td className="py-4 px-4 text-neutral-600 dark:text-neutral-400">
                        {coupon.minSpend > 0 ? formatIDR(coupon.minSpend) : "Tanpa minimum"}
                      </td>

                      {/* Usage */}
                      <td className="py-4 px-4 min-w-[130px]">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-neutral-900 dark:text-neutral-200">
                            {coupon.usageCount}
                          </span>
                          <span className="text-neutral-400">
                            / {coupon.usageLimit ? coupon.usageLimit : "∞"}
                          </span>
                        </div>
                        {usagePercent !== null && (
                          <div className="mt-1 w-full max-w-[90px] h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                usagePercent >= 100
                                  ? "bg-red-500"
                                  : usagePercent >= 80
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                              }`}
                              style={{ width: `${usagePercent}%` }}
                            />
                          </div>
                        )}
                      </td>

                      {/* Schedule */}
                      <td className="py-4 px-4 text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                        <p>{startFormatted}</p>
                        <p className="text-[11px] text-neutral-400">s/d {endFormatted}</p>
                      </td>

                      {/* Status & Switch */}
                      <td className="py-4 px-4 text-center">
                        <div className="inline-flex flex-col items-center gap-1.5">
                          <Switch
                            checked={coupon.isActive}
                            onCheckedChange={() => handleToggleStatus(coupon.id, coupon.isActive)}
                            className="data-[state=checked]:bg-emerald-600"
                          />
                          <span
                            className={`text-[10px] font-semibold uppercase tracking-wider ${
                              isLive
                                ? "text-emerald-600"
                                : isExpired
                                ? "text-red-500"
                                : isScheduled
                                ? "text-blue-500"
                                : "text-neutral-400"
                            }`}
                          >
                            {isLive
                              ? "Aktif"
                              : isExpired
                              ? "Kedaluwarsa"
                              : isScheduled
                              ? "Terjadwal"
                              : "Nonaktif"}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditModal(coupon)}
                            className="h-8 w-8 text-neutral-500 hover:text-black dark:hover:text-white"
                            title="Edit kupon"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteConfirmId(coupon.id)}
                            className="h-8 w-8 text-neutral-400 hover:text-red-600"
                            title="Hapus kupon"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Create & Edit Coupon */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editingId ? "Edit Kupon Voucher" : "Buat Kupon Baru"}
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              Kupon ini dapat dibagikan kepada influencer atau diposting di media sosial untuk memberikan diskon tambahan saat checkout.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Kode Kupon */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-neutral-700">
                Kode Kupon (Harus Unik) *
              </Label>
              <div className="relative">
                <Input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s+/g, ""))}
                  placeholder="MISAL: INFLUENCER10 / TIKTOK50K"
                  className="font-mono uppercase font-bold tracking-wider text-sm pl-8"
                  required
                />
                <Ticket className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
              </div>
              <p className="text-[11px] text-neutral-400">
                Otomatis diubah menjadi huruf besar tanpa spasi.
              </p>
            </div>

            {/* Nama Kupon / Influencer */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-neutral-700">
                Nama Kampanye / Influencer *
              </Label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Misal: Promo Kolaborasi Sarah Kiehl"
                required
              />
            </div>

            {/* Deskripsi */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-neutral-700">
                Catatan / Deskripsi (Opsional)
              </Label>
              <Input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Catatan internal atau ketentuan voucher..."
              />
            </div>

            {/* Tipe & Nilai Diskon */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                  Tipe Diskon
                </Label>
                <div className="grid grid-cols-2 gap-1 border border-neutral-200 dark:border-neutral-800 p-1 rounded-md bg-neutral-50 dark:bg-neutral-900">
                  <button
                    type="button"
                    onClick={() => setDiscountType("PERCENTAGE")}
                    className={`py-1.5 text-xs font-medium rounded transition-colors ${
                      discountType === "PERCENTAGE"
                        ? "bg-white text-black font-bold shadow-sm dark:bg-neutral-800 dark:text-white"
                        : "text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white"
                    }`}
                  >
                    % Persen
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType("FIXED_AMOUNT")}
                    className={`py-1.5 text-xs font-medium rounded transition-colors ${
                      discountType === "FIXED_AMOUNT"
                        ? "bg-white text-black font-bold shadow-sm dark:bg-neutral-800 dark:text-white"
                        : "text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white"
                    }`}
                  >
                    Rp Nominal
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                  {discountType === "PERCENTAGE" ? "Nilai (%) *" : "Nilai Potongan (Rp) *"}
                </Label>
                {discountType === "PERCENTAGE" ? (
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    required
                  />
                ) : (
                  <NumberInput
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder="50000"
                    required
                  />
                )}
              </div>
            </div>

            {/* Min Belanja & Max Diskon */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                  Min. Belanja (Rp)
                </Label>
                <NumberInput
                  value={minSpend}
                  onChange={(e) => setMinSpend(e.target.value)}
                  placeholder="0 (Tanpa minimum)"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                  {discountType === "PERCENTAGE" ? "Maks. Diskon (Rp)" : "Batas Kuota Pakai"}
                </Label>
                {discountType === "PERCENTAGE" ? (
                  <NumberInput
                    value={maxDiscount}
                    onChange={(e) => setMaxDiscount(e.target.value)}
                    placeholder="Kosong = Tak Terbatas"
                  />
                ) : (
                  <NumberInput
                    value={usageLimit}
                    onChange={(e) => setUsageLimit(e.target.value)}
                    placeholder="Kosong = Tak Terbatas"
                  />
                )}
              </div>
            </div>

            {discountType === "PERCENTAGE" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                  Batas Kuota Pemakaian (Total)
                </Label>
                <NumberInput
                  value={usageLimit}
                  onChange={(e) => setUsageLimit(e.target.value)}
                  placeholder="Kosongkan jika kuota tidak terbatas"
                />
              </div>
            )}

            {/* Tanggal Mulai & Berakhir */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                  Mulai Aktif
                </Label>
                <Input
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-xs [color-scheme:light] dark:[color-scheme:dark]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                  Berakhir
                </Label>
                <Input
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="text-xs [color-scheme:light] dark:[color-scheme:dark]"
                />
              </div>
            </div>

            {/* Status Switch */}
            <div className="flex items-center justify-between border-t border-neutral-100 dark:border-neutral-800 pt-3">
              <div>
                <Label className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                  Aktifkan Kupon Sekarang
                </Label>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Pelanggan langsung bisa menggunakan kupon ini saat checkout.
                </p>
              </div>
              <Switch
                checked={isActive}
                onCheckedChange={setIsActive}
                className="data-[state=checked]:bg-emerald-600"
              />
            </div>

            <DialogFooter className="pt-4 border-t border-neutral-100 dark:border-neutral-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                disabled={isSubmitting}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 text-xs uppercase tracking-wider font-semibold"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Menyimpan...
                  </span>
                ) : editingId ? (
                  "Simpan Perubahan"
                ) : (
                  "Buat Kupon"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={Boolean(deleteConfirmId)} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-red-600 flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              <span>Hapus Kupon</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              Apakah Anda yakin ingin menghapus kupon ini? Kode kupon yang dihapus tidak akan dapat digunakan lagi oleh pelanggan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteConfirmId(null)}
              disabled={isDeleting}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-xs"
            >
              {isDeleting ? "Menghapus..." : "Ya, Hapus Kupon"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
