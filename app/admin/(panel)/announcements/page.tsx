"use client";

import * as React from "react";
import {
  Megaphone,
  Plus,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  CheckCircle2,
  Loader2,
  RotateCcw,
  SlidersHorizontal,
  Link as LinkIcon,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { AlertDialog } from "@/components/ui/alert-dialog";
import {
  type AdminAnnouncementItem,
  INITIAL_ANNOUNCEMENTS,
  ANNOUNCEMENT_BADGE_PRESETS,
} from "@/lib/announcements";

const LOCAL_STORAGE_KEY = "itspanda_admin_announcements_v1";

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = React.useState<AdminAnnouncementItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filterStatus, setFilterStatus] = React.useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [searchQuery, setSearchQuery] = React.useState("");

  // Modal State
  const [modalOpen, setModalOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<AdminAnnouncementItem | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<AdminAnnouncementItem | null>(null);

  // Form Fields
  const [text, setText] = React.useState("");
  const [link, setLink] = React.useState("");
  const [badge, setBadge] = React.useState("");
  const [sortOrder, setSortOrder] = React.useState<number>(0);
  const [isActive, setIsActive] = React.useState(true);
  const [formError, setFormError] = React.useState<string | null>(null);

  // Categories for Quick Selector
  const [categoriesList, setCategoriesList] = React.useState<{ name: string; slug: string }[]>([]);

  // Toast
  const [toast, setToast] = React.useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const showToast = (type: "success" | "error" | "info", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch categories for Quick Selector
  React.useEffect(() => {
    fetch("/api/menu")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.categories && Array.isArray(data.categories)) {
          setCategoriesList(data.categories);
        }
      })
      .catch(() => {});
  }, []);

  // Load announcements
  const loadAnnouncements = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/announcements");
      if (res.ok) {
        const json = await res.json();
        if (json.announcements && Array.isArray(json.announcements)) {
          setAnnouncements(json.announcements);
          try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(json.announcements));
          } catch {}
          return;
        }
      }

      // Check localStorage fallback
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setAnnouncements(parsed);
            return;
          }
        } catch {}
      }

      setAnnouncements(INITIAL_ANNOUNCEMENTS);
    } catch (err) {
      console.warn("Using fallback local storage for announcements:", err);
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        try {
          setAnnouncements(JSON.parse(cached));
          return;
        } catch {}
      }
      setAnnouncements(INITIAL_ANNOUNCEMENTS);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  // Sync back to localStorage
  const saveToLocalAndState = (updatedList: AdminAnnouncementItem[]) => {
    setAnnouncements(updatedList);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedList));
    } catch {}
  };

  // Reset to default
  const handleResetDefaults = () => {
    saveToLocalAndState(INITIAL_ANNOUNCEMENTS);
    showToast("info", "Announcement berhasil direset ke data awal default.");
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingItem(null);
    setText("");
    setLink("/new-arrivals");
    setBadge("");
    setSortOrder(announcements.length);
    setIsActive(true);
    setFormError(null);
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item: AdminAnnouncementItem) => {
    setEditingItem(item);
    setText(item.text);
    setLink(item.link || "");
    setBadge(item.badge || "");
    setSortOrder(item.sortOrder);
    setIsActive(item.isActive);
    setFormError(null);
    setModalOpen(true);
  };

  // Quick Target Selector Handler
  const handleQuickTargetChange = (targetValue: string) => {
    if (!targetValue) return;

    if (targetValue.startsWith("cat:")) {
      const catSlug = targetValue.replace("cat:", "");
      const cat = categoriesList.find((c) => c.slug === catSlug);
      if (!text) {
        setText(`JELAJAHI KOLEKSI TAS ${cat?.name.toUpperCase() || ""} TERBARU`);
      }
    } else if (targetValue === "page:new-arrivals") {
      if (!text) setText("NEW ARRIVALS: TEMUKAN KOLEKSI TAS TERBARU MINGGU INI");
    } else if (targetValue === "page:register") {
      setBadge("CLUB EXCLUSIVE");
      if (!text) setText("RP100K OFF YOUR FIRST ORDER WHEN YOU JOIN THE IT'SMATAPANDA CLUB*");
    } else if (targetValue === "page:contact") {
      setBadge("INFO");
      if (!text) setText("BUTUH BANTUAN? HUBUNGI CUSTOMER SERVICE RESMI KAMI");
    } else if (targetValue === "page:home") {
      // No link set
    }
  };

  // Save (Create / Update)
  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      setFormError("Teks announcement wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const payload = {
      text: text.trim().toUpperCase(),
      link: link.trim() || null,
      badge: badge.trim().toUpperCase() || null,
      sortOrder: Number(sortOrder) || 0,
      isActive,
    };

    try {
      if (editingItem) {
        // PUT update
        const res = await fetch(`/api/admin/announcements/${editingItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const json = await res.json();
          const updatedItem = json.announcement || { ...editingItem, ...payload };
          const updatedList = announcements.map((a) =>
            a.id === editingItem.id ? updatedItem : a
          );
          saveToLocalAndState(updatedList);
          showToast("success", "Announcement berhasil diperbarui.");
        } else {
          // Local fallback update
          const updatedItem: AdminAnnouncementItem = {
            ...editingItem,
            ...payload,
            updatedAt: new Date().toISOString(),
          };
          const updatedList = announcements.map((a) =>
            a.id === editingItem.id ? updatedItem : a
          );
          saveToLocalAndState(updatedList);
          showToast("success", "Announcement berhasil diperbarui (mode lokal).");
        }
      } else {
        // POST create
        const res = await fetch("/api/admin/announcements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const json = await res.json();
          const newItem = json.announcement || {
            id: `ann-${Date.now()}`,
            ...payload,
            createdAt: new Date().toISOString(),
          };
          saveToLocalAndState([...announcements, newItem]);
          showToast("success", "Announcement baru berhasil ditambahkan.");
        } else {
          // Local fallback create
          const newItem: AdminAnnouncementItem = {
            id: `ann-${Date.now()}`,
            ...payload,
            createdAt: new Date().toISOString(),
          };
          saveToLocalAndState([...announcements, newItem]);
          showToast("success", "Announcement baru berhasil dibuat (mode lokal).");
        }
      }

      setModalOpen(false);
    } catch {
      // Local fallback on network error
      if (editingItem) {
        const updatedItem: AdminAnnouncementItem = {
          ...editingItem,
          ...payload,
          updatedAt: new Date().toISOString(),
        };
        saveToLocalAndState(
          announcements.map((a) => (a.id === editingItem.id ? updatedItem : a))
        );
      } else {
        const newItem: AdminAnnouncementItem = {
          id: `ann-${Date.now()}`,
          ...payload,
          createdAt: new Date().toISOString(),
        };
        saveToLocalAndState([...announcements, newItem]);
      }
      showToast("success", "Data tersimpan di penyimpanan lokal.");
      setModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Active Status
  const handleToggleActive = async (item: AdminAnnouncementItem) => {
    const nextActive = !item.isActive;
    const updatedList = announcements.map((a) =>
      a.id === item.id ? { ...a, isActive: nextActive } : a
    );
    saveToLocalAndState(updatedList);

    try {
      await fetch(`/api/admin/announcements/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextActive }),
      });
      showToast(
        "info",
        `Announcement ${nextActive ? "diaktifkan" : "dinonaktifkan"}.`
      );
    } catch {
      showToast("info", `Announcement ${nextActive ? "diaktifkan" : "dinonaktifkan"} (lokal).`);
    }
  };

  // Move Order Up / Down
  const handleMoveOrder = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= announcements.length) return;

    const newList = [...announcements];
    const [moved] = newList.splice(index, 1);
    newList.splice(targetIndex, 0, moved);

    // Reassign sortOrder sequentially
    const reorderedList = newList.map((item, idx) => ({
      ...item,
      sortOrder: idx,
    }));

    saveToLocalAndState(reorderedList);

    // Sync to server silently
    reorderedList.forEach((item) => {
      fetch(`/api/admin/announcements/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: item.sortOrder }),
      }).catch(() => {});
    });

    showToast("info", "Urutan announcement diperbarui.");
  };

  // Delete Announcement
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    const updatedList = announcements.filter((a) => a.id !== deleteTarget.id);
    saveToLocalAndState(updatedList);

    try {
      await fetch(`/api/admin/announcements/${deleteTarget.id}`, {
        method: "DELETE",
      });
      showToast("success", "Announcement berhasil dihapus.");
    } catch {
      showToast("success", "Announcement berhasil dihapus dari daftar lokal.");
    } finally {
      setDeleteTarget(null);
    }
  };

  // Filtered List
  const filteredAnnouncements = React.useMemo(() => {
    return announcements
      .filter((item) => {
        if (filterStatus === "ACTIVE") return item.isActive;
        if (filterStatus === "INACTIVE") return !item.isActive;
        return true;
      })
      .filter((item) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          item.text.toLowerCase().includes(q) ||
          (item.badge && item.badge.toLowerCase().includes(q)) ||
          (item.link && item.link.toLowerCase().includes(q))
        );
      });
  }, [announcements, filterStatus, searchQuery]);

  // Active items for live preview ticker
  const activeTickerItems = announcements.filter((a) => a.isActive);

  return (
    <div className="space-y-8 pb-16">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl text-sm font-medium transition-all transform animate-in fade-in slide-in-from-bottom-5 ${
            toast.type === "success"
              ? "bg-emerald-600 text-white"
              : toast.type === "error"
              ? "bg-red-600 text-white"
              : "bg-neutral-900 text-white border border-neutral-700"
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100">
              <Megaphone className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
              Pengaturan Announcement Bar
            </h1>
          </div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Kelola teks informasi berjalan (running ticker) di bagian paling atas toko online it&apos;smatapanda.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetDefaults}
            className="text-xs text-neutral-600 dark:text-neutral-300"
            title="Reset ke pengumuman default"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Reset Default
          </Button>
          <Button
            onClick={handleOpenCreate}
            className="bg-black hover:bg-neutral-800 text-white dark:bg-white dark:text-black dark:hover:bg-neutral-200 text-xs font-semibold px-4 py-2"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Tambah Announcement
          </Button>
        </div>
      </div>

      {/* Live Storefront Preview Section */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
              Live Storefront Ticker Preview
            </h2>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono uppercase">
            {activeTickerItems.length} Pengumuman Aktif
          </Badge>
        </div>

        {/* Marquee Simulation */}
        <div className="w-full bg-black text-white rounded-lg overflow-hidden py-2.5 px-4 select-none shadow-inner border border-neutral-900">
          {activeTickerItems.length > 0 ? (
            <div className="flex items-center overflow-x-auto no-scrollbar gap-8 animate-ticker">
              {[...activeTickerItems, ...activeTickerItems].map((item, idx) => (
                <div key={`preview-${item.id}-${idx}`} className="flex items-center shrink-0">
                  <span className="inline-flex items-center gap-2 text-xs font-medium tracking-wider uppercase text-white">
                    {item.badge && (
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded tracking-widest ${
                          item.badge === "PROMO" || item.badge === "VOUCHER"
                            ? "bg-red-600 text-white"
                            : "bg-white text-black font-semibold"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                    <span>{item.text}</span>
                  </span>
                  <span className="text-neutral-600 text-xs px-3 select-none" aria-hidden="true">
                    &bull;
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-2 text-xs text-neutral-400 italic">
              Semua announcement sedang dinonaktifkan. Pengumuman tidak akan tampil di toko.
            </div>
          )}
        </div>
        <p className="text-[11px] text-neutral-500">
          Catatan: Tampilan di atas mencerminkan teks berjalan yang dilihat pengunjung toko secara langsung.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg w-fit">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilterStatus("ALL")}
            className={`text-xs h-8 px-3 rounded-md transition-all ${
              filterStatus === "ALL"
                ? "bg-white dark:bg-neutral-900 text-black dark:text-white shadow-sm font-semibold"
                : "text-neutral-500 hover:text-black dark:hover:text-white"
            }`}
          >
            Semua ({announcements.length})
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilterStatus("ACTIVE")}
            className={`text-xs h-8 px-3 rounded-md transition-all ${
              filterStatus === "ACTIVE"
                ? "bg-white dark:bg-neutral-900 text-black dark:text-white shadow-sm font-semibold"
                : "text-neutral-500 hover:text-black dark:hover:text-white"
            }`}
          >
            Aktif ({announcements.filter((a) => a.isActive).length})
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilterStatus("INACTIVE")}
            className={`text-xs h-8 px-3 rounded-md transition-all ${
              filterStatus === "INACTIVE"
                ? "bg-white dark:bg-neutral-900 text-black dark:text-white shadow-sm font-semibold"
                : "text-neutral-500 hover:text-black dark:hover:text-white"
            }`}
          >
            Non-Aktif ({announcements.filter((a) => !a.isActive).length})
          </Button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <Input
            placeholder="Cari announcement..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs h-9"
          />
        </div>
      </div>

      {/* Announcements List / Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
          <Loader2 className="w-8 h-8 animate-spin mb-3" />
          <p className="text-sm font-medium">Memuat data announcement...</p>
        </div>
      ) : filteredAnnouncements.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 dark:border-neutral-800 p-12 text-center">
          <Megaphone className="w-10 h-10 text-neutral-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-neutral-800 dark:text-neutral-200">
            Tidak Ada Announcement Ditemukan
          </h3>
          <p className="text-sm text-neutral-500 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `Tidak ada pengumuman yang cocok dengan "${searchQuery}".`
              : "Tambahkan pengumuman baru untuk mempromosikan penawaran khusus atau informasi penting."}
          </p>
          {!searchQuery && (
            <Button
              onClick={handleOpenCreate}
              className="mt-4 bg-black text-white dark:bg-white dark:text-black text-xs"
            >
              <Plus className="w-4 h-4 mr-1" />
              Tambah Announcement Baru
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden shadow-sm">
          <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {filteredAnnouncements.map((item, index) => (
              <div
                key={item.id}
                className={`p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                  !item.isActive ? "bg-neutral-50/50 dark:bg-neutral-950/40 opacity-75" : ""
                }`}
              >
                {/* Left: Sequence + Content */}
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  {/* Reorder Buttons */}
                  <div className="flex flex-col items-center shrink-0 pt-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-neutral-400 hover:text-black dark:hover:text-white"
                      disabled={index === 0}
                      onClick={() => handleMoveOrder(index, "up")}
                      title="Geser ke atas"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </Button>
                    <span className="text-[10px] font-mono font-bold text-neutral-400">
                      #{index + 1}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-neutral-400 hover:text-black dark:hover:text-white"
                      disabled={index === filteredAnnouncements.length - 1}
                      onClick={() => handleMoveOrder(index, "down")}
                      title="Geser ke bawah"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  {/* Text details */}
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {item.badge ? (
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded tracking-widest ${
                            item.badge === "PROMO" || item.badge === "VOUCHER"
                              ? "bg-red-600 text-white"
                              : "bg-black text-white dark:bg-white dark:text-black font-semibold"
                          }`}
                        >
                          {item.badge}
                        </span>
                      ) : (
                        <Badge variant="outline" className="text-[9px] text-neutral-400 font-normal">
                          Polos
                        </Badge>
                      )}

                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          item.isActive
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400"
                        }`}
                      >
                        {item.isActive ? "Aktif" : "Non-Aktif"}
                      </span>
                    </div>

                    <p className="text-sm font-semibold tracking-wide text-neutral-900 dark:text-neutral-100 leading-snug">
                      {item.text}
                    </p>

                    {item.link ? (
                      <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                        <LinkIcon className="w-3 h-3 text-neutral-400" />
                        <span className="font-mono text-[11px] truncate max-w-xs">{item.link}</span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-neutral-400 italic">Tanpa link tujuan</span>
                    )}
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 md:self-center pl-10 md:pl-0 shrink-0">
                  {/* Quick Toggle Switch */}
                  <div className="flex items-center gap-2 mr-2">
                    <Switch
                      checked={item.isActive}
                      onCheckedChange={() => handleToggleActive(item)}
                      aria-label="Toggle announcement status"
                    />
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEdit(item)}
                    className="h-8 text-xs font-medium"
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1.5" />
                    Edit
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteTarget(item)}
                    className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 border-neutral-200 dark:border-neutral-800"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add / Edit Modal Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
              {editingItem ? "Edit Announcement" : "Tambah Announcement Baru"}
            </DialogTitle>
            <DialogDescription>
              Atur teks promosi, badge label, dan link tujuan untuk announcement bar toko.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveAnnouncement} className="space-y-5 pt-2">
            {formError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                {formError}
              </div>
            )}

            {/* Teks Announcement */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="ann-text" className="text-xs font-semibold">
                  Teks Announcement <span className="text-red-500">*</span>
                </Label>
                <button
                  type="button"
                  onClick={() => setText((prev) => prev.toUpperCase())}
                  className="text-[10px] text-neutral-500 hover:text-black dark:hover:text-white underline font-mono"
                >
                  UPPERCASE OTOMATIS
                </button>
              </div>
              <Input
                id="ann-text"
                placeholder="CONTOH: DISKON RP100K UNTUK PEMBELIAN PERTAMA*"
                value={text}
                onChange={(e) => setText(e.target.value)}
                required
                className="text-xs tracking-wider uppercase font-medium"
              />
            </div>

            {/* Quick Target Dropdown Selector */}
            <div className="p-3.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/60 space-y-2">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400" />
                <Label htmlFor="ann-quick-target" className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                  Pilih Halaman / Kategori Cepat (Auto-Fill)
                </Label>
              </div>
              <select
                id="ann-quick-target"
                className="w-full text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
                onChange={(e) => handleQuickTargetChange(e.target.value)}
                defaultValue=""
              >
                <option value="" disabled>
                  -- Pilih Kategori atau Halaman Toko --
                </option>
                <optgroup label="Halaman Toko Utama">
                  <option value="page:new-arrivals">New Arrivals (/new-arrivals)</option>
                  <option value="page:register">Registrasi / Club Member (/account/register)</option>
                  <option value="page:contact">Hubungi Kami / CS (/contact)</option>
                  <option value="page:home">Beranda Toko (/)</option>
                </optgroup>
                {categoriesList.length > 0 && (
                  <optgroup label="Kategori Tas D2C">
                    {categoriesList.map((cat) => (
                      <option key={cat.slug} value={`cat:${cat.slug}`}>
                        Tas: {cat.name} (/categories/{cat.slug})
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              <p className="text-[11px] text-neutral-500">
                Memilih target akan otomatis mengisi saran teks dan label badge.
              </p>
            </div>

            {/* Link URL Manual (Disabled) */}
            <div className="space-y-1.5 opacity-70">
              <div className="flex items-center justify-between">
                <Label htmlFor="ann-link" className="text-xs font-semibold text-neutral-500">
                  Link URL Tujuan
                </Label>
                <span className="text-[10px] font-medium text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full border border-neutral-200 dark:border-neutral-700">
                  Dinonaktifkan
                </span>
              </div>
              <Input
                id="ann-link"
                disabled
                placeholder="Link URL dinonaktifkan"
                value={link}
                className="text-xs font-mono bg-neutral-100 dark:bg-neutral-900 text-neutral-400 dark:text-neutral-500 cursor-not-allowed border-dashed select-none"
              />
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
                Kolom link URL tujuan saat ini dinonaktifkan.
              </p>
            </div>

            {/* Badge / Label Text & Presets */}
            <div className="space-y-2">
              <Label htmlFor="ann-badge" className="text-xs font-semibold">
                Badge / Tag Label (Opsional)
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {ANNOUNCEMENT_BADGE_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setBadge(p.value)}
                    className={`text-[10px] font-bold px-2 py-1 rounded border transition-all ${
                      badge === p.value
                        ? "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white"
                        : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:border-neutral-400"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <Input
                id="ann-badge"
                placeholder="Atau ketik badge kustom..."
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                className="text-xs uppercase tracking-wider font-semibold"
              />
            </div>

            {/* Live Single Item Preview */}
            <div className="p-3 bg-black text-white rounded-lg border border-neutral-900 space-y-1.5">
              <span className="text-[10px] font-mono uppercase text-neutral-400">
                Preview Announcement:
              </span>
              <div className="flex items-center gap-2">
                {badge && (
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded tracking-widest ${
                      badge === "PROMO" || badge === "VOUCHER"
                        ? "bg-red-600 text-white"
                        : "bg-white text-black font-semibold"
                    }`}
                  >
                    {badge.toUpperCase()}
                  </span>
                )}
                <span className="text-xs font-medium uppercase tracking-wider truncate">
                  {text || "TEKS ANNOUNCEMENT AKAN TAMPIL DI SINI"}
                </span>
              </div>
            </div>

            {/* Sort Order & Active Switch */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-neutral-200 dark:border-neutral-800">
              <div className="space-y-1.5">
                <Label htmlFor="ann-order" className="text-xs font-semibold">
                  Nomor Urutan
                </Label>
                <Input
                  id="ann-order"
                  type="number"
                  min={0}
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Number(e.target.value))}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5 flex flex-col justify-end">
                <div className="flex items-center justify-between p-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
                  <Label htmlFor="ann-active" className="text-xs font-semibold cursor-pointer">
                    Status Aktif
                  </Label>
                  <Switch
                    id="ann-active"
                    checked={isActive}
                    onCheckedChange={setIsActive}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2">
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
                className="bg-black hover:bg-neutral-800 text-white dark:bg-white dark:text-black dark:hover:bg-neutral-200 text-xs font-semibold"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  "Simpan Announcement"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Hapus Announcement?"
        description={`Apakah Anda yakin ingin menghapus announcement "${deleteTarget?.text}"? Tindakan ini tidak dapat dibatalkan.`}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
