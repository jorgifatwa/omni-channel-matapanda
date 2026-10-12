"use client";

import * as React from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Plus, MoreHorizontal, Pencil, Trash2, Layers3 } from "lucide-react";
import { DataTable } from "@/components/admin/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { useAdminStore } from "@/context/AdminStoreContext";
import { type AdminProductSeries, slugify } from "@/lib/admin-data";

export default function AdminSeriesPage() {
  const { series, saveSeries, deleteSeries, products } = useAdminStore();

  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingSeries, setEditingSeries] =
    React.useState<AdminProductSeries | null>(null);
  const [deleteTarget, setDeleteTarget] =
    React.useState<AdminProductSeries | null>(null);

  // Form states
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const openCreateModal = () => {
    setEditingSeries(null);
    setName("");
    setSlug("");
    setDescription("");
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (sItem: AdminProductSeries) => {
    setEditingSeries(sItem);
    setName(sItem.name);
    setSlug(sItem.slug);
    setDescription(sItem.description ?? "");
    setFormError(null);
    setModalOpen(true);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingSeries) {
      setSlug(slugify(val));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) {
      setFormError("Nama series dan slug wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const cleanName = name.trim();
    const cleanSlug = slugify(slug.trim() || cleanName);

    try {
      // 1. Sync to Prisma DB if API is online
      const res = await fetch("/api/admin/series", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cleanName,
          slug: cleanSlug,
        }),
      });

      let savedId = editingSeries?.id ?? `series-${Date.now()}`;
      if (res.ok) {
        const data = await res.json();
        if (data.series?.id) savedId = data.series.id;
      }

      const payload: AdminProductSeries = {
        id: savedId,
        name: cleanName,
        slug: cleanSlug,
        description: description.trim() || undefined,
        productCount:
          editingSeries?.productCount ??
          products.filter((p) => p.productSeriesId === savedId).length,
        createdAt:
          editingSeries?.createdAt ?? new Date().toISOString().slice(0, 10),
      };

      saveSeries(payload);
      setModalOpen(false);
    } catch {
      // Fallback local save
      const payload: AdminProductSeries = {
        id: editingSeries?.id ?? `series-${Date.now()}`,
        name: cleanName,
        slug: cleanSlug,
        description: description.trim() || undefined,
        productCount: 0,
        createdAt: new Date().toISOString().slice(0, 10),
      };
      saveSeries(payload);
      setModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    try {
      await fetch(`/api/admin/series/${deleteTarget.id}`, {
        method: "DELETE",
      }).catch(() => {});
    } finally {
      deleteSeries(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  const columns: ColumnDef<AdminProductSeries>[] = [
    {
      accessorKey: "name",
      header: "Nama Series",
      cell: ({ row }) => (
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-700 dark:text-neutral-300 shrink-0">
            <Layers3 className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-xs sm:text-sm text-neutral-900 dark:text-neutral-100">
              {row.original.name}
            </p>
            <p className="text-[11px] text-neutral-500">
              Slug: <code className="font-mono">{row.original.slug}</code>
            </p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "productCount",
      header: "Jumlah Produk",
      cell: ({ row }) => {
        const count = products.filter(
          (p) => p.productSeriesId === row.original.id
        ).length;
        return (
          <span className="text-xs font-mono font-medium">
            {count || row.original.productCount || 0} produk
          </span>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "Dibuat",
      cell: ({ row }) => (
        <span className="text-xs text-neutral-500 font-mono">
          {row.original.createdAt || "-"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-neutral-600 hover:text-black dark:text-neutral-400 dark:hover:text-white"
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => openEditModal(item)}
                className="cursor-pointer"
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit Series
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setDeleteTarget(item)}
                className="cursor-pointer text-red-600 focus:text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Hapus Series
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Master Product Series
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500">
            Kelola lini dan grup produk untuk fitur perbandingan spesifikasi (&quot;Compare Series&quot;) di halaman detail produk.
          </p>
        </div>
        <Button
          onClick={openCreateModal}
          className="h-9 gap-1.5 bg-black hover:bg-neutral-800 text-white dark:bg-white dark:text-black"
        >
          <Plus className="h-4 w-4" />
          <span>Tambah Series</span>
        </Button>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={series}
        searchPlaceholder="Cari nama series, slug..."
      />

      {/* Modal Tambah / Edit Series */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>
                {editingSeries ? "Edit Product Series" : "Tambah Series Baru"}
              </DialogTitle>
              <DialogDescription>
                Grup series ini memungkinkan produk-produk sejenis (misal: Crunch Carryall, Dumpling Bag) saling dibandingkan di halaman produk.
              </DialogDescription>
            </DialogHeader>

            {formError && (
              <div className="mt-4 p-3 text-xs bg-red-50 border border-red-200 text-red-700 rounded-md">
                {formError}
              </div>
            )}

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="series-name" className="text-xs font-semibold">
                  Nama Series *
                </Label>
                <Input
                  id="series-name"
                  placeholder="Misal: Vast Carryall Series, Dumpling Bag Series"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="series-slug" className="text-xs font-semibold">
                  Slug URL *
                </Label>
                <Input
                  id="series-slug"
                  placeholder="vast-carryall-series"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="series-desc" className="text-xs font-semibold">
                  Deskripsi Series (Opsional)
                </Label>
                <textarea
                  id="series-desc"
                  rows={2}
                  placeholder="Koleksi tas dan perlengkapan serbaguna..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-md border border-neutral-200 dark:border-neutral-800 bg-transparent p-2 text-xs focus:outline-none focus:ring-1 focus:ring-neutral-950"
                />
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
                disabled={isSubmitting}
                className="h-9 text-xs bg-black text-white hover:bg-neutral-800"
              >
                {isSubmitting ? "Menyimpan..." : "Simpan Series"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Konfirmasi Hapus */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Hapus Series?"
        description={`Apakah Anda yakin ingin menghapus series "${deleteTarget?.name}"? Produk-produk yang terkait tidak akan dihapus, hanya tautan series-nya yang dilepas.`}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
