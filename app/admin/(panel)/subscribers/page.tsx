"use client";

import * as React from "react";
import {
  Mail,
  Plus,
  Trash2,
  Download,
  Copy,
  Check,
  Search,
  Users,
  TrendingUp,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { type NewsletterSubscriberEntry } from "@/lib/newsletter-store";

export default function AdminSubscribersPage() {
  const [subscribers, setSubscribers] = React.useState<NewsletterSubscriberEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Modal & Actions state
  const [modalOpen, setModalOpen] = React.useState(false);
  const [newEmail, setNewEmail] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<NewsletterSubscriberEntry | null>(null);

  // Copy feedback
  const [copied, setCopied] = React.useState(false);

  // Toast
  const [toast, setToast] = React.useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const showToast = (type: "success" | "error" | "info", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const loadSubscribers = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/subscribers");
      if (res.ok) {
        const data = await res.json();
        if (data.subscribers && Array.isArray(data.subscribers)) {
          setSubscribers(data.subscribers);
        }
      }
    } catch (err) {
      console.warn("Failed to load subscribers:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadSubscribers();
  }, [loadSubscribers]);

  // Filtered subscribers
  const filteredSubscribers = React.useMemo(() => {
    if (!searchQuery.trim()) return subscribers;
    const q = searchQuery.toLowerCase().trim();
    return subscribers.filter((s) => s.email.toLowerCase().includes(q));
  }, [subscribers, searchQuery]);

  // Copy all emails
  const handleCopyAllEmails = () => {
    if (subscribers.length === 0) return;
    const emailList = subscribers.map((s) => s.email).join(", ");
    navigator.clipboard.writeText(emailList);
    setCopied(true);
    showToast("success", `${subscribers.length} email berhasil disalin ke clipboard!`);
    setTimeout(() => setCopied(false), 2500);
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (subscribers.length === 0) {
      showToast("error", "Tidak ada data subscriber untuk diekspor.");
      return;
    }

    const headers = ["No", "ID", "Email", "Tanggal Berlangganan (ISO)", "Tanggal Format"];
    const rows = subscribers.map((s, idx) => {
      const dateFormatted = new Date(s.createdAt).toLocaleString("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
      });
      return [idx + 1, s.id, `"${s.email}"`, `"${s.createdAt}"`, `"${dateFormatted}"`].join(
        ","
      );
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `itsmatapanda-newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("success", "File CSV subscriber berhasil diunduh.");
  };

  // Add subscriber manually
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const email = newEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      setFormError("Silakan masukkan alamat email yang valid.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/admin/subscribers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        if (data.alreadySubscribed) {
          showToast("info", "Email ini sudah terdaftar sebelumnya.");
        } else {
          showToast("success", "Subscriber baru berhasil ditambahkan!");
          if (data.subscriber) {
            setSubscribers((prev) => [data.subscriber, ...prev]);
          } else {
            loadSubscribers();
          }
        }
        setNewEmail("");
        setModalOpen(false);
      } else {
        setFormError(data.error || "Gagal menambahkan subscriber.");
      }
    } catch {
      setFormError("Terjadi kesalahan jaringan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete subscriber
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      const res = await fetch(`/api/admin/subscribers/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSubscribers((prev) => prev.filter((s) => s.id !== deleteTarget.id));
        showToast("success", "Subscriber berhasil dihapus.");
      } else {
        showToast("error", "Gagal menghapus subscriber.");
      }
    } catch {
      showToast("error", "Terjadi kesalahan jaringan.");
    } finally {
      setDeleteTarget(null);
    }
  };

  const formatDate = (isoStr: string) => {
    try {
      return new Date(isoStr).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoStr;
    }
  };

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
            <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950 text-[#002fa7] dark:text-blue-400 flex items-center justify-center font-bold">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight uppercase">
                Newsletter Subscribers
              </h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Kelola daftar email pelanggan yang mendaftar newsletter untuk kampanye email marketing &amp; promo.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={loadSubscribers}
            className="text-xs gap-1.5 border-neutral-200 dark:border-neutral-800"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyAllEmails}
            disabled={subscribers.length === 0}
            className="text-xs gap-1.5 border-neutral-200 dark:border-neutral-800"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? "Tersalin!" : "Copy All Emails"}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={subscribers.length === 0}
            className="text-xs gap-1.5 border-neutral-200 dark:border-neutral-800"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Ekspor CSV</span>
          </Button>

          <Button
            onClick={() => {
              setNewEmail("");
              setFormError(null);
              setModalOpen(true);
            }}
            size="sm"
            className="text-xs gap-1.5 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Email</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total Subscribers</span>
            <Users className="h-4 w-4 text-[#002fa7]" />
          </div>
          <p className="text-2xl sm:text-3xl font-black">{subscribers.length}</p>
          <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            <span>Audience terdaftar</span>
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-xs font-bold uppercase tracking-wider">Status Aktif</span>
            <Sparkles className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-600">100%</p>
          <p className="text-[11px] text-neutral-400">Siap menerima broadcast newsletter</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-xs font-bold uppercase tracking-wider">Pendaftar Terkini</span>
            <Mail className="h-4 w-4 text-purple-500" />
          </div>
          <p className="text-sm font-bold truncate text-neutral-900 dark:text-neutral-100">
            {subscribers[0]?.email || "Belum ada"}
          </p>
          <p className="text-[11px] text-neutral-400">
            {subscribers[0] ? formatDate(subscribers[0].createdAt) : "-"}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-xs font-bold uppercase tracking-wider">Format Ekspor</span>
            <Download className="h-4 w-4 text-neutral-500" />
          </div>
          <p className="text-lg font-black uppercase tracking-tight">CSV / Excel</p>
          <p className="text-[11px] text-neutral-400">Kompatibel Mailchimp &amp; Broadcast</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-3 bg-white dark:bg-neutral-900 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
          <Input
            type="text"
            placeholder="Cari email subscriber..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs h-9"
          />
        </div>

        <div className="text-xs text-neutral-500 pr-2">
          Menampilkan <span className="font-bold text-neutral-900 dark:text-neutral-100">{filteredSubscribers.length}</span> dari {subscribers.length} subscriber
        </div>
      </div>

      {/* Subscribers Table */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
            <p className="text-xs text-neutral-500">Memuat daftar subscriber...</p>
          </div>
        ) : filteredSubscribers.length === 0 ? (
          <div className="py-16 text-center space-y-3 px-4">
            <Mail className="h-10 w-10 text-neutral-300 dark:text-neutral-700 mx-auto" />
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 uppercase">
              Tidak ada subscriber ditemukan
            </h3>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              {searchQuery
                ? `Tidak ada hasil untuk pencarian "${searchQuery}".`
                : "Belum ada pengunjung yang berlangganan newsletter."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 dark:bg-neutral-950/70 text-neutral-500 uppercase tracking-wider font-semibold border-b border-neutral-200 dark:border-neutral-800 text-[11px]">
                <tr>
                  <th className="py-3.5 px-4 w-12 text-center">No</th>
                  <th className="py-3.5 px-4">Alamat Email</th>
                  <th className="py-3.5 px-4">Tanggal Berlangganan</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {filteredSubscribers.map((item, idx) => (
                  <tr
                    key={item.id}
                    className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-4 text-center font-mono text-neutral-400">
                      {idx + 1}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-neutral-900 dark:text-neutral-100">
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-neutral-400" />
                        <span>{item.email}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-neutral-600 dark:text-neutral-400">
                      {formatDate(item.createdAt)}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px] font-bold border-transparent">
                        Aktif
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleteTarget(item)}
                        className="h-8 w-8 text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                        title="Hapus / Unsubscribe"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Subscriber Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase tracking-tight">
              Tambah Subscriber Manual
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              Daftarkan email pelanggan baru ke dalam database newsletter toko.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddSubmit} className="space-y-4 pt-2">
            {formError && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider">
                Alamat Email Pelanggan <span className="text-red-500">*</span>
              </Label>
              <Input
                type="email"
                placeholder="nama@domain.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="text-xs"
                required
              />
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
                <span>Simpan Subscriber</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Hapus Subscriber?"
        description={`Apakah Anda yakin ingin menghapus email "${deleteTarget?.email}" dari daftar newsletter?`}
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
