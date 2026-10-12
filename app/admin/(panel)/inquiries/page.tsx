"use client";

import * as React from "react";
import {
  Mail,
  MailOpen,
  Phone,
  Trash2,
  CheckCircle2,
  RefreshCw,
  Search,
  ExternalLink,
  MessageSquare,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ContactInquiryItem {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export default function AdminInquiriesPage() {
  const [inquiries, setInquiries] = React.useState<ContactInquiryItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [selectedInquiry, setSelectedInquiry] =
    React.useState<ContactInquiryItem | null>(null);

  const fetchInquiries = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/contact");
      if (res.ok) {
        const data = await res.json();
        setInquiries(data.inquiries || []);
      }
    } catch (err) {
      console.error("Failed to fetch contact inquiries:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchInquiries();
  }, [fetchInquiries]);

  const toggleReadStatus = async (id: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    setInquiries((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isRead: nextStatus } : item))
    );
    if (selectedInquiry?.id === id) {
      setSelectedInquiry((prev) => (prev ? { ...prev, isRead: nextStatus } : null));
    }

    try {
      await fetch("/api/contact", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isRead: nextStatus }),
      });
    } catch (err) {
      console.error("Failed to update read status:", err);
    }
  };

  const deleteInquiry = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus pesan ini?")) return;

    setInquiries((prev) => prev.filter((item) => item.id !== id));
    if (selectedInquiry?.id === id) {
      setSelectedInquiry(null);
    }

    try {
      await fetch(`/api/contact?id=${id}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.error("Failed to delete inquiry:", err);
    }
  };

  const handleOpenDetail = (inquiry: ContactInquiryItem) => {
    setSelectedInquiry(inquiry);
    if (!inquiry.isRead) {
      toggleReadStatus(inquiry.id, false);
    }
  };

  const filteredInquiries = inquiries.filter((item) => {
    const q = search.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      item.email.toLowerCase().includes(q) ||
      (item.phone && item.phone.includes(q)) ||
      item.message.toLowerCase().includes(q)
    );
  });

  const totalCount = inquiries.length;
  const unreadCount = inquiries.filter((i) => !i.isRead).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            Pesan Masuk (Contact Inquiries)
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Kelola pertanyaan dan pesan dari formulir kontak pelanggan storefront.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchInquiries}
            disabled={loading}
            className="text-xs gap-2 bg-white dark:bg-neutral-900"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Total Pesan
            </span>
            <MessageSquare className="h-4 w-4 text-neutral-400" />
          </div>
          <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-50 mt-2">
            {totalCount}
          </p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-5 dark:border-amber-900/50 dark:bg-amber-950/20 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Belum Dibaca
            </span>
            <Mail className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-900 dark:text-amber-300 mt-2">
            {unreadCount}
          </p>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5 dark:border-emerald-900/50 dark:bg-emerald-950/20 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Sudah Dibaca
            </span>
            <MailOpen className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-300 mt-2">
            {totalCount - unreadCount}
          </p>
        </div>
      </div>

      {/* Search Filter Box */}
      <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Cari pengirim, email, no. hp, atau isi pesan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 bg-white py-2 pl-9 pr-4 text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
          />
        </div>
      </div>

      {/* Inquiries Table */}
      <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden dark:border-neutral-800 dark:bg-neutral-900 shadow-sm">
        {filteredInquiries.length === 0 ? (
          <div className="py-16 text-center text-xs text-neutral-500">
            <Mail className="h-8 w-8 mx-auto mb-2 text-neutral-400" />
            <p className="font-semibold text-neutral-700 dark:text-neutral-300">
              Belum ada pesan masuk
            </p>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Pesan dari formulir halaman contact storefront akan muncul di sini.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50/80 text-neutral-500 uppercase tracking-wider font-semibold dark:border-neutral-800 dark:bg-neutral-800/50">
                  <th className="py-3 px-4">Pengirim</th>
                  <th className="py-3 px-4">Kontak</th>
                  <th className="py-3 px-4">Ringkasan Pesan</th>
                  <th className="py-3 px-4">Waktu</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {filteredInquiries.map((item) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40 transition-colors ${
                      !item.isRead ? "font-semibold bg-blue-50/20" : ""
                    }`}
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-neutral-900 dark:text-neutral-100">
                        {item.name}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 space-y-0.5">
                      <div className="text-neutral-800 dark:text-neutral-200">
                        {item.email}
                      </div>
                      {item.phone && (
                        <div className="text-[11px] text-neutral-500 flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          <span>{item.phone}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs sm:max-w-md truncate text-neutral-600 dark:text-neutral-300">
                      {item.message}
                    </td>
                    <td className="py-3.5 px-4 text-neutral-500 whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {item.isRead ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 text-[11px] font-medium dark:bg-neutral-800 dark:text-neutral-400">
                          <CheckCircle2 className="h-3 w-3 text-neutral-400" />
                          Sudah Dibaca
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold dark:bg-amber-950 dark:text-amber-300">
                          <Mail className="h-3 w-3 text-amber-600" />
                          Baru
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1 whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDetail(item)}
                        className="h-7 w-7 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                        title="Lihat Detail Pesan"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        asChild
                        className="h-7 w-7 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                        title="Balas via Email"
                      >
                        <a
                          href={`mailto:${item.email}?subject=Re:%20Inquiry%20it's%20matapanda%20Jakarta`}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteInquiry(item.id)}
                        className="h-7 w-7 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                        title="Hapus Pesan"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Message Dialog */}
      <Dialog
        open={Boolean(selectedInquiry)}
        onOpenChange={(open) => !open && setSelectedInquiry(null)}
      >
        <DialogContent className="sm:max-w-lg bg-white dark:bg-neutral-900">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-neutral-900 dark:text-neutral-50">
              Detail Pesan Masuk
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              Diterima pada{" "}
              {selectedInquiry &&
                new Date(selectedInquiry.createdAt).toLocaleString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
            </DialogDescription>
          </DialogHeader>

          {selectedInquiry && (
            <div className="space-y-4 pt-2 text-xs">
              <div className="rounded-lg border border-neutral-200 bg-neutral-50/70 p-3.5 space-y-2 dark:border-neutral-800 dark:bg-neutral-800/40">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Nama Pengirim:</span>
                  <span className="font-bold text-neutral-900 dark:text-neutral-100">
                    {selectedInquiry.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Email:</span>
                  <a
                    href={`mailto:${selectedInquiry.email}`}
                    className="font-semibold text-blue-600 hover:underline"
                  >
                    {selectedInquiry.email}
                  </a>
                </div>
                {selectedInquiry.phone && (
                  <div className="flex justify-between">
                    <span className="text-neutral-500">No. Handphone:</span>
                    <span className="font-mono text-neutral-800 dark:text-neutral-200">
                      {selectedInquiry.phone}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <span className="text-neutral-500 block uppercase font-semibold text-[11px] mb-1.5">
                  Isi Pesan:
                </span>
                <div className="rounded-lg border border-neutral-200 bg-white p-4 text-neutral-800 dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 leading-relaxed whitespace-pre-wrap">
                  {selectedInquiry.message}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    toggleReadStatus(selectedInquiry.id, selectedInquiry.isRead)
                  }
                  className="text-xs"
                >
                  {selectedInquiry.isRead
                    ? "Tandai Belum Dibaca"
                    : "Tandai Sudah Dibaca"}
                </Button>

                <Button
                  asChild
                  size="sm"
                  className="bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 gap-2 text-xs"
                >
                  <a
                    href={`mailto:${selectedInquiry.email}?subject=Re:%20Inquiry%20it's%20matapanda%20Jakarta`}
                  >
                    <span>Balas Email</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
