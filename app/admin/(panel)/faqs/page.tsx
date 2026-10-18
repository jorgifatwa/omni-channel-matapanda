"use client";

import * as React from "react";
import Link from "next/link";
import {
  HelpCircle,
  Plus,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RotateCcw,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
  FAQ_CATEGORIES,
  INITIAL_FAQS,
  type FaqItem,
} from "@/lib/faq-data";

export default function AdminFaqsPage() {
  const [faqs, setFaqs] = React.useState<FaqItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedCategory, setSelectedCategory] = React.useState<string>("All");
  const [filterStatus, setFilterStatus] = React.useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [searchQuery, setSearchQuery] = React.useState("");

  // Live Accordion Preview State
  const [previewOpenId, setPreviewOpenId] = React.useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<FaqItem | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<FaqItem | null>(null);

  // Form Fields
  const [category, setCategory] = React.useState<string>("Most Asked");
  const [customCategory, setCustomCategory] = React.useState<string>("");
  const [question, setQuestion] = React.useState("");
  const [answer, setAnswer] = React.useState("");
  const [sortOrder, setSortOrder] = React.useState<number>(0);
  const [isActive, setIsActive] = React.useState(true);
  const [formError, setFormError] = React.useState<string | null>(null);

  // Toast
  const [toast, setToast] = React.useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const showToast = (type: "success" | "error" | "info", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  // Load FAQs from API
  const loadFaqs = React.useCallback(async () => {
    try {
      setLoading(true);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("itspanda_admin_faqs_v1");
      }
      const res = await fetch("/api/admin/faqs");
      if (res.ok) {
        const json = await res.json();
        if (json.faqs && Array.isArray(json.faqs)) {
          setFaqs(json.faqs);
          return;
        }
      }
      setFaqs(INITIAL_FAQS);
    } catch (err) {
      console.warn("Failed to load faqs from server:", err);
      setFaqs(INITIAL_FAQS);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadFaqs();
  }, [loadFaqs]);

  const handleResetDefaults = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/faqs");
      if (res.ok) {
        const json = await res.json();
        if (json.faqs) setFaqs(json.faqs);
      }
      showToast("info", "Dataset FAQ dimuat ulang dari server.");
    } finally {
      setLoading(false);
    }
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingItem(null);
    setCategory(selectedCategory !== "All" ? selectedCategory : "Most Asked");
    setCustomCategory("");
    setQuestion("");
    setAnswer("");
    const maxOrder = faqs.reduce((max, item) => Math.max(max, item.sortOrder || 0), 0);
    setSortOrder(maxOrder + 1);
    setIsActive(true);
    setFormError(null);
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item: FaqItem) => {
    setEditingItem(item);
    if ((FAQ_CATEGORIES as readonly string[]).includes(item.category)) {
      setCategory(item.category);
      setCustomCategory("");
    } else {
      setCategory("CUSTOM");
      setCustomCategory(item.category);
    }
    setQuestion(item.question);
    setAnswer(item.answer);
    setSortOrder(item.sortOrder || 0);
    setIsActive(item.isActive);
    setFormError(null);
    setModalOpen(true);
  };

  // Handle Form Submit
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const finalCategory = category === "CUSTOM" ? customCategory.trim() : category;

    if (!finalCategory) {
      setFormError("Kategori pertanyaan wajib dipilih atau diisi.");
      return;
    }

    if (!question.trim()) {
      setFormError("Pertanyaan FAQ wajib diisi.");
      return;
    }

    if (!answer.trim()) {
      setFormError("Jawaban FAQ wajib diisi.");
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        category: finalCategory,
        question: question.trim(),
        answer: answer.trim(),
        sortOrder: Number(sortOrder) || 0,
        isActive: Boolean(isActive),
      };

      if (editingItem) {
        // UPDATE
        const res = await fetch(`/api/admin/faqs/${editingItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const json = await res.json();
          const updatedItem = json.faq || { ...editingItem, ...payload };
          setFaqs((prev) => prev.map((f) => (f.id === editingItem.id ? updatedItem : f)));
          showToast("success", "FAQ berhasil diperbarui!");
        } else {
          showToast("error", "Gagal memperbarui FAQ di server.");
        }
      } else {
        // CREATE
        const res = await fetch("/api/admin/faqs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.faq) {
            setFaqs((prev) => [json.faq, ...prev]);
          }
          showToast("success", "FAQ baru berhasil ditambahkan!");
        } else {
          showToast("error", "Gagal menambahkan FAQ di server.");
        }
      }

      setModalOpen(false);
    } catch {
      setFormError("Gagal menyimpan FAQ. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Active Switch
  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    setFaqs((prev) => prev.map((f) => (f.id === id ? { ...f, isActive: nextStatus } : f)));

    try {
      const res = await fetch(`/api/admin/faqs/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextStatus }),
      });
      if (!res.ok) throw new Error("Gagal update");
      showToast("info", `Status FAQ diubah menjadi ${nextStatus ? "Aktif" : "Non-aktif"}.`);
    } catch {
      setFaqs((prev) => prev.map((f) => (f.id === id ? { ...f, isActive: currentStatus } : f)));
      showToast("error", "Gagal memperbarui status di server.");
    }
  };

  // Move Order
  const handleMove = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= filteredFaqs.length) return;

    const currentItem = filteredFaqs[index];
    const targetItem = filteredFaqs[targetIndex];

    const updated = [...faqs];
    const idxA = updated.findIndex((f) => f.id === currentItem.id);
    const idxB = updated.findIndex((f) => f.id === targetItem.id);

    if (idxA !== -1 && idxB !== -1) {
      const tempOrder = updated[idxA].sortOrder;
      updated[idxA].sortOrder = updated[idxB].sortOrder || 0;
      updated[idxB].sortOrder = tempOrder;

      // Swap in array
      const temp = updated[idxA];
      updated[idxA] = updated[idxB];
      updated[idxB] = temp;

      setFaqs(updated);

      try {
        await Promise.all([
          fetch(`/api/admin/faqs/${currentItem.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sortOrder: updated[idxA].sortOrder }),
          }),
          fetch(`/api/admin/faqs/${targetItem.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sortOrder: updated[idxB].sortOrder }),
          }),
        ]);
      } catch {}

      showToast("info", "Urutan FAQ berhasil diperbarui.");
    }
  };

  // Delete FAQ
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      const res = await fetch(`/api/admin/faqs/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setFaqs((prev) => prev.filter((f) => f.id !== deleteTarget.id));
        showToast("success", "FAQ berhasil dihapus.");
      } else {
        showToast("error", "Gagal menghapus FAQ dari server.");
      }
    } catch {
      showToast("error", "Gagal menghapus FAQ dari server.");
    } finally {
      setDeleteTarget(null);
    }
  };

  // Filtered FAQs
  const filteredFaqs = React.useMemo(() => {
    return faqs.filter((item) => {
      if (selectedCategory !== "All" && item.category !== selectedCategory) {
        return false;
      }
      if (filterStatus === "ACTIVE" && !item.isActive) return false;
      if (filterStatus === "INACTIVE" && item.isActive) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          item.question.toLowerCase().includes(q) ||
          item.answer.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [faqs, selectedCategory, filterStatus, searchQuery]);

  const activeCount = faqs.filter((f) => f.isActive).length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white transition-all animate-in fade-in slide-in-from-bottom-3 ${
            toast.type === "success"
              ? "bg-emerald-600"
              : toast.type === "error"
              ? "bg-red-600"
              : "bg-neutral-900 dark:bg-neutral-800"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-[#95b59a]/20 text-[#456b4a] dark:text-[#95b59a] flex items-center justify-center font-bold">
              <HelpCircle className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight uppercase">
                FAQs &amp; Panduan
              </h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Kelola pertanyaan umum, panduan perawatan tas, garansi, pengiriman, dan kebijakan toko.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetDefaults}
            className="text-xs gap-1.5 border-neutral-200 dark:border-neutral-800"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Default</span>
          </Button>

          <Link href="/faq" target="_blank">
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5 border-neutral-200 dark:border-neutral-800"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Lihat Halaman FAQ</span>
            </Button>
          </Link>

          <Button
            onClick={handleOpenCreate}
            size="sm"
            className="text-xs gap-1.5 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah FAQ Baru</span>
          </Button>
        </div>
      </div>

      {/* Live Storefront Preview Widget */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-[#95b59a]" />
            <h2 className="text-xs font-black uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
              Live Accordion Preview (Sage Green Beyond The Vines Theme)
            </h2>
          </div>
          <span className="text-[11px] text-neutral-500">
            {activeCount} FAQ Aktif di Storefront
          </span>
        </div>

        {/* Mini Preview Box */}
        <div className="p-4 rounded-xl bg-[#fafaf8] dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-2.5">
          {faqs.filter((f) => f.isActive).slice(0, 3).map((item) => {
            const isExpanded = previewOpenId === item.id;
            return (
              <div
                key={item.id}
                className="rounded-xl bg-[#95b59a] text-neutral-950 overflow-hidden shadow-xs"
              >
                <button
                  type="button"
                  onClick={() => setPreviewOpenId(isExpanded ? null : item.id)}
                  className="w-full flex items-center justify-between p-3.5 text-left font-bold text-xs uppercase tracking-wide hover:bg-black/5"
                >
                  <span className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[9px] bg-white/40 border-black/10 text-neutral-900 font-mono uppercase">
                      {item.category}
                    </Badge>
                    <span>{item.question}</span>
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0" />
                  )}
                </button>
                {isExpanded && (
                  <div className="p-3.5 pt-2 text-xs font-medium text-neutral-900/90 border-t border-black/10 bg-[#8dae92]/30">
                    <p>{item.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
          {activeCount === 0 && (
            <p className="text-xs text-neutral-500 text-center py-3">
              Tidak ada FAQ aktif yang dapat dipratinjau.
            </p>
          )}
        </div>
      </div>

      {/* Category Pills & Filters */}
      <div className="space-y-3">
        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <Button
            size="sm"
            variant={selectedCategory === "All" ? "default" : "outline"}
            onClick={() => setSelectedCategory("All")}
            className="rounded-full text-xs font-bold uppercase tracking-wider"
          >
            Semua Kategori ({faqs.length})
          </Button>
          {FAQ_CATEGORIES.map((cat) => {
            const count = faqs.filter((f) => f.category.toLowerCase() === cat.toLowerCase()).length;
            const isSelected = selectedCategory === cat;
            return (
              <Button
                key={cat}
                size="sm"
                variant={isSelected ? "default" : "outline"}
                onClick={() => setSelectedCategory(cat)}
                className="rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap"
              >
                {cat} ({count})
              </Button>
            );
          })}
        </div>

        {/* Search & Status Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-neutral-900 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
            <Input
              type="text"
              placeholder="Cari pertanyaan / jawaban..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs h-9"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <div className="flex items-center rounded-lg border border-neutral-200 dark:border-neutral-800 p-0.5 bg-neutral-50 dark:bg-neutral-950 text-xs">
              <button
                type="button"
                onClick={() => setFilterStatus("ALL")}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  filterStatus === "ALL"
                    ? "bg-white dark:bg-neutral-800 shadow-xs font-bold text-neutral-900 dark:text-white"
                    : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                }`}
              >
                Semua ({faqs.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus("ACTIVE")}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  filterStatus === "ACTIVE"
                    ? "bg-white dark:bg-neutral-800 shadow-xs font-bold text-emerald-600 dark:text-emerald-400"
                    : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                }`}
              >
                Aktif ({activeCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus("INACTIVE")}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  filterStatus === "INACTIVE"
                    ? "bg-white dark:bg-neutral-800 shadow-xs font-bold text-neutral-600 dark:text-neutral-300"
                    : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                }`}
              >
                Non-aktif ({faqs.length - activeCount})
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Item List Table / Cards */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
            <p className="text-xs text-neutral-500">Memuat daftar FAQ...</p>
          </div>
        ) : filteredFaqs.length === 0 ? (
          <div className="py-16 text-center space-y-3 px-4">
            <HelpCircle className="h-10 w-10 text-neutral-300 dark:text-neutral-700 mx-auto" />
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 uppercase">
              Tidak ada FAQ ditemukan
            </h3>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              {searchQuery
                ? `Tidak ada hasil untuk pencarian "${searchQuery}". Coba kata kunci lain.`
                : "Belum ada item FAQ dalam kategori ini. Klik tombol di bawah untuk menambahkan."}
            </p>
            <Button
              size="sm"
              onClick={handleOpenCreate}
              className="text-xs gap-1.5 mt-2"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Tambah FAQ Sekarang</span>
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {filteredFaqs.map((item, idx) => (
              <div
                key={item.id}
                className="p-4 sm:p-5 flex flex-col md:flex-row md:items-start justify-between gap-4 hover:bg-neutral-50/70 dark:hover:bg-neutral-800/50 transition-colors"
              >
                {/* Left: Info & Content */}
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <Badge
                      variant="secondary"
                      className="text-[11px] font-bold uppercase tracking-wider bg-[#95b59a]/20 text-[#3d5e42] dark:text-[#95b59a] border border-[#95b59a]/30"
                    >
                      {item.category}
                    </Badge>
                    <span className="text-[11px] font-mono text-neutral-400">
                      Sort: #{item.sortOrder}
                    </span>
                    <Badge
                      variant={item.isActive ? "default" : "outline"}
                      className={`text-[10px] ${
                        item.isActive
                          ? "bg-emerald-600 text-white border-transparent"
                          : "text-neutral-500 border-neutral-300 dark:border-neutral-700"
                      }`}
                    >
                      {item.isActive ? "Aktif" : "Non-aktif"}
                    </Badge>
                  </div>

                  <h4 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-neutral-100">
                    {item.question}
                  </h4>

                  <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed line-clamp-3">
                    {item.answer}
                  </p>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  {/* Reorder Buttons */}
                  <div className="flex items-center border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMove(idx, "up")}
                      className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                      title="Geser ke Atas"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <div className="w-[1px] h-4 bg-neutral-200 dark:bg-neutral-800" />
                    <button
                      type="button"
                      disabled={idx === filteredFaqs.length - 1}
                      onClick={() => handleMove(idx, "down")}
                      className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                      title="Geser ke Bawah"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Toggle Active Switch */}
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800">
                    <span className="text-[10px] text-neutral-500 font-medium">Aktif</span>
                    <Switch
                      checked={item.isActive}
                      onCheckedChange={() => handleToggleActive(item.id, item.isActive)}
                    />
                  </div>

                  {/* Edit Button */}
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => handleOpenEdit(item)}
                    className="h-8 w-8 text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white"
                    title="Edit FAQ"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>

                  {/* Delete Button */}
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => setDeleteTarget(item)}
                    className="h-8 w-8 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 border-neutral-200 dark:border-neutral-800"
                    title="Hapus FAQ"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase tracking-tight">
              {editingItem ? "Edit Pertanyaan FAQ" : "Tambah FAQ Baru"}
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              Isi pertanyaan dan jawaban panduan untuk ditampilkan di halaman Help Center.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleFormSubmit} className="space-y-4 pt-2">
            {formError && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Category Dropdown */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider">
                Kategori FAQ <span className="text-red-500">*</span>
              </Label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-xs focus:outline-none focus:ring-2 focus:ring-neutral-900 font-medium"
              >
                {FAQ_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="CUSTOM">+ Kategori Kustom Lainnya...</option>
              </select>
            </div>

            {/* Custom Category Input if selected */}
            {category === "CUSTOM" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider">
                  Nama Kategori Baru <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="text"
                  placeholder="Contoh: Gift Card & Promo Khusus"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="text-xs"
                  required
                />
              </div>
            )}

            {/* Question */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider">
                Pertanyaan (Question) <span className="text-red-500">*</span>
              </Label>
              <Input
                type="text"
                placeholder="Contoh: Apakah bahan tas Dumpling Series tahan air hujan?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="text-xs font-medium"
                required
              />
            </div>

            {/* Answer */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider">
                Jawaban Lengkap (Answer) <span className="text-red-500">*</span>
              </Label>
              <Textarea
                rows={5}
                placeholder="Tuliskan penjelasan detail dan jelas untuk customer..."
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                className="text-xs leading-relaxed"
                required
              />
            </div>

            {/* Sort Order & Active Switch */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider">
                  Nomor Urutan (Sort Order)
                </Label>
                <Input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Number(e.target.value))}
                  className="text-xs font-mono"
                  min={0}
                />
                <p className="text-[11px] text-neutral-400">
                  Angka lebih kecil akan tampil lebih atas.
                </p>
              </div>

              <div className="space-y-1.5 flex flex-col justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider">
                  Status Tampil
                </Label>
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
                  <span className="text-xs font-medium">
                    {isActive ? "Aktif (Tampil)" : "Non-aktif (Draft)"}
                  </span>
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6 gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
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
                className="text-xs gap-1.5 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
              >
                {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>{editingItem ? "Simpan Perubahan" : "Tambahkan FAQ"}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Hapus FAQ Ini?"
        description={`Apakah Anda yakin ingin menghapus pertanyaan "${deleteTarget?.question}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Ya, Hapus FAQ"
        cancelLabel="Batal"
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
