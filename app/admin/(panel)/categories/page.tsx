"use client";

import * as React from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Plus, MoreHorizontal, Pencil, Trash2, FolderTree } from "lucide-react";
import { DataTable } from "@/components/admin/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { type AdminCategory, slugify } from "@/lib/admin-data";

export default function AdminCategoriesPage() {
  const { categories, saveCategory, deleteCategory } = useAdminStore();

  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingCategory, setEditingCategory] =
    React.useState<AdminCategory | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<AdminCategory | null>(
    null
  );

  // Form states
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [parentId, setParentId] = React.useState<string>("");
  const [isActive, setIsActive] = React.useState(true);
  const [formError, setFormError] = React.useState<string | null>(null);

  const openCreateModal = () => {
    setEditingCategory(null);
    setName("");
    setSlug("");
    setParentId("");
    setIsActive(true);
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (cat: AdminCategory) => {
    setEditingCategory(cat);
    setName(cat.name);
    setSlug(cat.slug);
    setParentId(cat.parentId ?? "");
    setIsActive(cat.isActive);
    setFormError(null);
    setModalOpen(true);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingCategory) {
      setSlug(slugify(val));
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) {
      setFormError("Nama kategori dan slug wajib diisi.");
      return;
    }

    const parentCat = categories.find((c) => c.id === parentId);

    const payload: AdminCategory = {
      id: editingCategory?.id ?? `cat-${Date.now()}`,
      name: name.trim(),
      slug: slugify(slug),
      parentId: parentId || null,
      parentName: parentCat?.name ?? null,
      productCount: editingCategory?.productCount ?? 0,
      isActive,
      createdAt:
        editingCategory?.createdAt ?? new Date().toISOString().slice(0, 10),
    };

    saveCategory(payload);
    setModalOpen(false);
  };

  const columns: ColumnDef<AdminCategory>[] = [
    {
      accessorKey: "name",
      header: "Nama Kategori",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <FolderTree className="h-4 w-4 text-neutral-400 shrink-0" />
          <span className="font-semibold text-xs sm:text-sm">
            {row.original.name}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "slug",
      header: "Slug",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-neutral-500">
          {row.original.slug}
        </span>
      ),
    },
    {
      accessorKey: "parentName",
      header: "Parent Category",
      cell: ({ row }) =>
        row.original.parentName ? (
          <Badge variant="outline" className="text-xs">
            {row.original.parentName}
          </Badge>
        ) : (
          <span className="text-xs text-neutral-400">— (Kategori Utama)</span>
        ),
    },
    {
      accessorKey: "productCount",
      header: "Jumlah Produk",
      cell: ({ row }) => (
        <span className="font-medium text-xs">
          {row.original.productCount} produk
        </span>
      ),
    },
    {
      id: "status",
      accessorFn: (row) => (row.isActive ? "active" : "inactive"),
      header: "Status",
      cell: ({ row }) =>
        row.original.isActive ? (
          <Badge variant="success">Aktif</Badge>
        ) : (
          <Badge variant="secondary">Nonaktif</Badge>
        ),
    },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36 bg-white dark:bg-neutral-950">
            <DropdownMenuItem
              onClick={() => openEditModal(row.original)}
              className="text-xs cursor-pointer flex items-center gap-2"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span>Edit</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setDeleteTarget(row.original)}
              className="text-xs text-red-600 cursor-pointer flex items-center gap-2"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Master Category</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Kelola struktur kategori dan sub-kategori produk ZODIAC.
          </p>
        </div>

        <Button onClick={openCreateModal} className="gap-2">
          <Plus className="h-4 w-4" />
          Tambah Kategori
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={categories}
        searchPlaceholder="Cari kategori, slug, parent..."
        filterOptions={[
          {
            columnId: "status",
            label: "Status",
            options: [
              { label: "Aktif", value: "active" },
              { label: "Nonaktif", value: "inactive" },
            ],
          },
        ]}
      />

      {/* Small Modal (max-w-md) for Add / Edit Category */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Edit Kategori" : "Tambah Kategori Baru"}
            </DialogTitle>
            <DialogDescription>
              Tentukan nama kategori, slug, dan parent category (jika merupakan
              sub-kategori).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 mt-2">
            {formError && (
              <div className="rounded-md bg-red-50 border border-red-200 px-3.5 py-2 text-xs text-red-700">
                {formError}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="cat-name">Nama Kategori *</Label>
              <Input
                id="cat-name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Outerwear"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cat-slug">Slug (Auto-generated) *</Label>
              <Input
                id="cat-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="outerwear"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cat-parent">
                Parent Category (Opsional untuk Sub-Kategori)
              </Label>
              <select
                id="cat-parent"
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-3 text-sm"
              >
                <option value="">— Tidak Ada (Kategori Utama) —</option>
                {categories
                  .filter((c) => c.id !== editingCategory?.id && !c.parentId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-neutral-200 dark:border-neutral-800 p-3">
              <div>
                <Label htmlFor="cat-active">Status Kategori Aktif</Label>
                <p className="text-xs text-neutral-500">
                  Kategori aktif akan tampil di menu dan filter.
                </p>
              </div>
              <Switch
                id="cat-active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit">Simpan Kategori</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete AlertDialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Hapus Kategori?"
        description={`Apakah Anda yakin ingin menghapus kategori "${deleteTarget?.name}"? Tindakan ini tidak dapat dibatalkan.`}
        onConfirm={() => {
          if (deleteTarget) deleteCategory(deleteTarget.id);
        }}
      />
    </div>
  );
}
