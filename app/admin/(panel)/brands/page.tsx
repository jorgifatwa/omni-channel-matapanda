"use client";

import * as React from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Plus, MoreHorizontal, Pencil, Trash2, UploadCloud } from "lucide-react";
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
import { type AdminBrand, slugify } from "@/lib/admin-data";

export default function AdminBrandsPage() {
  const { brands, saveBrand, deleteBrand } = useAdminStore();

  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingBrand, setEditingBrand] = React.useState<AdminBrand | null>(
    null
  );
  const [deleteTarget, setDeleteTarget] = React.useState<AdminBrand | null>(
    null
  );

  // Form states
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [logoUrl, setLogoUrl] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);
  const [isUploading, setIsUploading] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const openCreateModal = () => {
    setEditingBrand(null);
    setName("");
    setSlug("");
    setLogoUrl(
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=200&q=80"
    );
    setIsActive(true);
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (brand: AdminBrand) => {
    setEditingBrand(brand);
    setName(brand.name);
    setSlug(brand.slug);
    setLogoUrl(brand.logoUrl);
    setIsActive(brand.isActive);
    setFormError(null);
    setModalOpen(true);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingBrand) {
      setSlug(slugify(val));
    }
  };

  const handleLogoUpload = async (file: File | null) => {
    if (!file) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        if (data.url) setLogoUrl(data.url);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) {
      setFormError("Nama brand dan slug wajib diisi.");
      return;
    }

    const payload: AdminBrand = {
      id: editingBrand?.id ?? `brand-${Date.now()}`,
      name: name.trim(),
      slug: slugify(slug),
      logoUrl:
        logoUrl ||
        "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=200&q=80",
      productCount: editingBrand?.productCount ?? 0,
      isActive,
      createdAt:
        editingBrand?.createdAt ?? new Date().toISOString().slice(0, 10),
    };

    saveBrand(payload);
    setModalOpen(false);
  };

  const columns: ColumnDef<AdminBrand>[] = [
    {
      id: "logo",
      header: "Logo",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="h-10 w-10 rounded-md overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-100 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={row.original.logoUrl}
            alt={row.original.name}
            className="h-full w-full object-cover"
          />
        </div>
      ),
    },
    {
      accessorKey: "name",
      header: "Nama Brand",
      cell: ({ row }) => (
        <span className="font-semibold text-xs sm:text-sm">
          {row.original.name}
        </span>
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
          <h1 className="text-2xl font-bold tracking-tight">Master Brand</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Kelola data merek, logo brand, dan status aktif kolaborator ZODIAC.
          </p>
        </div>

        <Button onClick={openCreateModal} className="gap-2">
          <Plus className="h-4 w-4" />
          Tambah Brand
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={brands}
        searchPlaceholder="Cari nama brand, slug..."
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

      {/* Small Modal (max-w-md) for Add / Edit Brand */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingBrand ? "Edit Brand" : "Tambah Brand Baru"}
            </DialogTitle>
            <DialogDescription>
              Masukkan informasi nama brand, logo, dan slug URL.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 mt-2">
            {formError && (
              <div className="rounded-md bg-red-50 border border-red-200 px-3.5 py-2 text-xs text-red-700">
                {formError}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="brand-name">Nama Brand *</Label>
              <Input
                id="brand-name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Dawn Gong"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand-slug">Slug (Auto-generated) *</Label>
              <Input
                id="brand-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="dawn-gong"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Logo Brand</Label>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-md border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800 overflow-hidden shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logoUrl}
                    alt="Brand Logo"
                    className="h-full w-full object-cover"
                  />
                </div>
                <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-md border border-neutral-200 dark:border-neutral-800 px-3 py-2 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800">
                  <UploadCloud className="h-4 w-4 text-neutral-500" />
                  <span>{isUploading ? "Uploading..." : "Ganti Logo"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      handleLogoUpload(e.target.files?.[0] || null)
                    }
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-neutral-200 dark:border-neutral-800 p-3">
              <div>
                <Label htmlFor="brand-active">Status Brand Aktif</Label>
                <p className="text-xs text-neutral-500">
                  Brand aktif dapat dipilih pada produk.
                </p>
              </div>
              <Switch
                id="brand-active"
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
              <Button type="submit">Simpan Brand</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete AlertDialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Hapus Brand?"
        description={`Apakah Anda yakin ingin menghapus brand "${deleteTarget?.name}"? Tindakan ini tidak dapat dibatalkan.`}
        onConfirm={() => {
          if (deleteTarget) deleteBrand(deleteTarget.id);
        }}
      />
    </div>
  );
}
