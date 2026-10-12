"use client";

import * as React from "react";
import { type ColumnDef } from "@tanstack/react-table";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  UploadCloud,
  ArrowUp,
  ArrowDown,
  X,
} from "lucide-react";
import { DataTable } from "@/components/admin/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
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
import {
  type AdminProduct,
  type AdminProductVariant,
  slugify,
} from "@/lib/admin-data";
import { formatIDR } from "@/lib/products";

export default function AdminProductsPage() {
  const { products, brands, categories, series, saveProduct, deleteProduct } =
    useAdminStore();

  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingProduct, setEditingProduct] =
    React.useState<AdminProduct | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<AdminProduct | null>(
    null
  );

  // Form states
  const [name, setName] = React.useState("");
  const [sku, setSku] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [brandId, setBrandId] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");
  const [productSeriesId, setProductSeriesId] = React.useState("");
  const [dimensions, setDimensions] = React.useState("");
  const [weightGrams, setWeightGrams] = React.useState("250");
  const [capacityNote, setCapacityNote] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [discountPrice, setDiscountPrice] = React.useState("");
  const [stock, setStock] = React.useState("0");
  const [lowStockThreshold, setLowStockThreshold] = React.useState("5");
  const [isNewArrival, setIsNewArrival] = React.useState(false);
  const [isActive, setIsActive] = React.useState(true);
  const [images, setImages] = React.useState<string[]>([]);
  const [imageUrlInput, setImageUrlInput] = React.useState("");
  const [isUploading, setIsUploading] = React.useState(false);
  const [variants, setVariants] = React.useState<AdminProductVariant[]>([]);
  const [formError, setFormError] = React.useState<string | null>(null);

  const openCreateModal = () => {
    setEditingProduct(null);
    setName("");
    setSku(`IMP-${Math.floor(100 + Math.random() * 900)}`);
    setDescription("");
    setBrandId(brands[0]?.id ?? "b1a8f701-1111-4111-8111-000000000001");
    setCategoryId(categories[0]?.id ?? "");
    setProductSeriesId("");
    setDimensions("");
    setWeightGrams("250");
    setCapacityNote("");
    setPrice("489000");
    setDiscountPrice("");
    setStock("20");
    setLowStockThreshold("5");
    setIsNewArrival(false);
    setIsActive(true);
    setImages([
      "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?auto=format&fit=crop&w=800&q=80",
    ]);
    setVariants([
      {
        id: `v-${Date.now()}-1`,
        size: "One Size",
        color: "Black",
        colorGroup: "Classic",
        colorHex: "#000000",
        image: "",
        stock: 10,
        sku: "IMP-VAR-BLK",
      },
    ]);
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (product: AdminProduct) => {
    setEditingProduct(product);
    setName(product.name);
    setSku(product.sku);
    setDescription(product.description);
    setBrandId(product.brandId);
    setCategoryId(product.categoryId);
    setProductSeriesId(product.productSeriesId ?? "");
    setDimensions(product.dimensions ?? "");
    setWeightGrams(product.weightGrams ? String(product.weightGrams) : "250");
    setCapacityNote(product.capacityNote ?? "");
    setPrice(String(product.price));
    setDiscountPrice(product.discountPrice ? String(product.discountPrice) : "");
    setStock(String(product.stock));
    setLowStockThreshold(String(product.lowStockThreshold ?? 5));
    setIsNewArrival(product.isNewArrival ?? false);
    setIsActive(product.isActive);
    setImages(product.images);
    setVariants(
      (product.variants || []).map((v) => ({
        ...v,
        colorGroup: v.colorGroup ?? "",
        colorHex: v.colorHex ?? "",
        image: v.image ?? "",
      }))
    );
    setFormError(null);
    setModalOpen(true);
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        if (res.ok) {
          const data = await res.json();
          if (data.url) uploadedUrls.push(data.url);
        }
      }
      setImages((prev) => [...prev, ...uploadedUrls]);
    } finally {
      setIsUploading(false);
    }
  };

  const moveImage = (index: number, direction: -1 | 1) => {
    setImages((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      const temp = next[index];
      next[index] = next[target];
      next[target] = temp;
      return next;
    });
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  const addVariantRow = () => {
    setVariants((prev) => [
      ...prev,
      {
        id: `v-${Date.now()}-${prev.length + 1}`,
        size: "XL",
        color: "Black",
        colorGroup: "",
        colorHex: "#000000",
        image: "",
        stock: 5,
        sku: `${sku || "SKU"}-${prev.length + 1}`,
      },
    ]);
  };

  const updateVariantRow = (
    id: string,
    field: keyof AdminProductVariant,
    value: string | number
  ) => {
    setVariants((prev) =>
      prev.map((v) => (v.id === id ? { ...v, [field]: value } : v))
    );
  };

  const removeVariantRow = (id: string) => {
    setVariants((prev) => prev.filter((v) => v.id !== id));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !sku.trim() || !price) {
      setFormError("Nama produk, SKU, dan Harga wajib diisi.");
      return;
    }

    if (images.length < 3) {
      setFormError(
        "Produk wajib memiliki minimal 3 foto (Foto 1: Utama/Default, Foto 2: Tampak Kiri/Model, Foto 3: Tampak Kanan/Detail)."
      );
      return;
    }

    const selectedBrand = brands.find((b) => b.id === brandId);
    const selectedCategory = categories.find((c) => c.id === categoryId);
    const selectedSeries = series.find((s) => s.id === productSeriesId);

    const totalVariantStock =
      variants.length > 0
        ? variants.reduce((sum, v) => sum + Number(v.stock || 0), 0)
        : Number(stock || 0);

    const sanitizedVariants: AdminProductVariant[] = variants.map((v) => ({
      ...v,
      colorGroup: v.colorGroup && v.colorGroup.trim() ? v.colorGroup.trim() : null,
      colorHex: v.colorHex && v.colorHex.trim() ? v.colorHex.trim() : null,
      image: v.image && v.image.trim() ? v.image.trim() : null,
      stock: Number(v.stock || 0),
    }));

    const payload: AdminProduct = {
      id: editingProduct?.id ?? `prod-${Date.now()}`,
      name: name.trim(),
      slug: slugify(name),
      sku: sku.trim().toUpperCase(),
      description: description.trim(),
      brandId: brandId || brands[0]?.id || "b1a8f701-1111-4111-8111-000000000001",
      brandName: selectedBrand?.name ?? "it'smatapanda",
      categoryId,
      categoryName: selectedCategory?.name ?? "Sling & Crossbody",
      productSeriesId: productSeriesId ? productSeriesId : null,
      productSeriesName: selectedSeries ? selectedSeries.name : undefined,
      dimensions: dimensions.trim() ? dimensions.trim() : null,
      weightGrams: weightGrams ? Number(weightGrams) : 250,
      capacityNote: capacityNote.trim() ? capacityNote.trim() : null,
      price: Number(price),
      discountPrice: discountPrice ? Number(discountPrice) : null,
      stock: totalVariantStock,
      lowStockThreshold: Number(lowStockThreshold || 5),
      isNewArrival,
      isActive,
      images:
        images.length > 0
          ? images
          : [
              "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=800&q=80",
            ],
      variants: sanitizedVariants,
      createdAt:
        editingProduct?.createdAt ?? new Date().toISOString().slice(0, 10),
    };

    saveProduct(payload);
    setModalOpen(false);
  };

  const columns: ColumnDef<AdminProduct>[] = [
    {
      id: "thumbnail",
      header: "Foto",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="h-11 w-11 rounded-md overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={row.original.images[0]}
            alt={row.original.name}
            className="h-full w-full object-cover"
          />
        </div>
      ),
    },
    {
      accessorKey: "name",
      header: "Nama Produk",
      cell: ({ row }) => (
        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-medium text-xs sm:text-sm">{row.original.name}</p>
            {row.original.isNewArrival && (
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100">
                New Arrival
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-neutral-500">
            {row.original.variants.length} varian
          </p>
        </div>
      ),
    },
    {
      accessorKey: "sku",
      header: "SKU",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.sku}</span>
      ),
    },
    {
      accessorKey: "productSeriesName",
      header: "Series",
      cell: ({ row }) => (
        <span className="text-xs text-neutral-600 dark:text-neutral-400 font-medium">
          {row.original.productSeriesName || "-"}
        </span>
      ),
    },
    {
      accessorKey: "categoryName",
      header: "Category",
    },
    {
      accessorKey: "price",
      header: "Harga",
      cell: ({ row }) => (
        <div>
          <p className="font-semibold text-xs">
            {formatIDR(row.original.discountPrice ?? row.original.price)}
          </p>
          {row.original.discountPrice && (
            <p className="text-[10px] text-neutral-400 line-through">
              {formatIDR(row.original.price)}
            </p>
          )}
        </div>
      ),
    },
    {
      accessorKey: "stock",
      header: "Stok",
      cell: ({ row }) => {
        const stock = row.original.stock;
        const threshold = row.original.lowStockThreshold ?? 5;
        const isOutOfStock = stock === 0;
        const isLowStock = stock > 0 && stock <= threshold;

        return (
          <div className="flex items-center gap-1.5">
            <span
              className={`font-semibold text-xs ${
                isOutOfStock
                  ? "text-red-600"
                  : isLowStock
                  ? "text-amber-600"
                  : "text-neutral-900 dark:text-neutral-100"
              }`}
            >
              {stock} pcs
            </span>
            {isOutOfStock && <Badge variant="destructive" className="text-[10px] py-0 px-1">Habis</Badge>}
            {isLowStock && <Badge variant="warning" className="text-[10px] py-0 px-1">Menipis</Badge>}
          </div>
        );
      },
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
          <DropdownMenuContent align="end" className="w-40 bg-white dark:bg-neutral-950">
            <DropdownMenuItem
              onClick={() => openEditModal(row.original)}
              className="text-xs cursor-pointer flex items-center gap-2"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>View / Detail</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => openEditModal(row.original)}
              className="text-xs cursor-pointer flex items-center gap-2"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span>Edit Produk</span>
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
          <h1 className="text-2xl font-bold tracking-tight">Master Product</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Kelola katalog produk, varian ukuran/warna, stok, dan foto Cloudinary.
          </p>
        </div>

        <Button onClick={openCreateModal} className="gap-2">
          <Plus className="h-4 w-4" />
          Tambah Produk
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={products}
        searchPlaceholder="Cari nama produk, SKU, brand..."
        filterOptions={[
          {
            columnId: "brandName",
            label: "Brand",
            options: brands.map((b) => ({ label: b.name, value: b.name })),
          },
          {
            columnId: "categoryName",
            label: "Category",
            options: categories.map((c) => ({ label: c.name, value: c.name })),
          },
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

      {/* Large Modal (max-w-4xl) for Add / Edit Product */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "Edit Produk" : "Tambah Produk Baru"}
            </DialogTitle>
            <DialogDescription>
              Lengkapi informasi produk, foto Cloudinary, serta daftar varian
              ukuran dan warna di bawah ini.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-6 mt-2">
            {formError && (
              <div className="rounded-md bg-red-50 border border-red-200 px-3.5 py-2.5 text-xs text-red-700">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prod-name">Nama Produk *</Label>
                <Input
                  id="prod-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Dawn Gong Sunburn 01 T-shirt"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prod-sku">SKU *</Label>
                <Input
                  id="prod-sku"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="IMP-DUMP-MIC"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prod-category">Category / Subcategory *</Label>
                <select
                  id="prod-category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-3 text-sm"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.parentName ? `${c.parentName} → ${c.name}` : c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="prod-price">Harga Normal (IDR) *</Label>
                <NumberInput
                  id="prod-price"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="500000"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prod-discount">Harga Diskon (Opsional)</Label>
                <NumberInput
                  id="prod-discount"
                  value={discountPrice}
                  onChange={(e) => setDiscountPrice(e.target.value)}
                  placeholder="Kosongkan jika tidak diskon"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prod-threshold">Ambang Batas Stok Menipis (Threshold)</Label>
                <NumberInput
                  id="prod-threshold"
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(e.target.value)}
                  placeholder="5"
                />
                <p className="text-[11px] text-neutral-500">
                  Notifikasi stok menipis muncul jika stok &le; angka ini.
                </p>
              </div>
            </div>

            {/* Rich Text / Textarea Description */}
            <div className="space-y-2">
              <Label htmlFor="prod-desc">Deskripsi Produk</Label>
              <textarea
                id="prod-desc"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Rib round neck, graphic on the front. 100% cotton heavyweight jersey..."
                className="w-full rounded-md border border-neutral-200 dark:border-neutral-800 bg-transparent p-3 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-950"
              />
            </div>

            {/* Spesifikasi Teknis & Series (Compare Series) */}
            <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 p-4 space-y-4">
              <div>
                <Label className="text-sm font-semibold">Spesifikasi &amp; Series (Opsional)</Label>
                <p className="text-xs text-neutral-500">
                  Digunakan untuk fitur Compare Series pada halaman detail produk (PDP) seperti lini Crunch / Vast Series.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prod-series">Product Series (Lini Seri Produk)</Label>
                  <select
                    id="prod-series"
                    value={productSeriesId}
                    onChange={(e) => setProductSeriesId(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-3 text-sm"
                  >
                    <option value="">-- Tanpa Series (Tidak ditampilkan di compare) --</option>
                    {series.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prod-dimensions">Dimensi / Ukuran Fisik</Label>
                  <Input
                    id="prod-dimensions"
                    value={dimensions}
                    onChange={(e) => setDimensions(e.target.value)}
                    placeholder='Contoh: H9" x W12¼" x D4" atau H40cm x W30cm'
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prod-weight">Berat Produk (gram)</Label>
                  <Input
                    id="prod-weight"
                    type="number"
                    value={weightGrams}
                    onChange={(e) => setWeightGrams(e.target.value)}
                    placeholder="250"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prod-capacity">Catatan Kapasitas / Fit Note</Label>
                  <Input
                    id="prod-capacity"
                    value={capacityNote}
                    onChange={(e) => setCapacityNote(e.target.value)}
                    placeholder="Contoh: Fits an iPad, 500ml water bottle, daily essentials"
                  />
                </div>
              </div>
            </div>

            {/* Multiple Image Upload (Cloudinary Drag & Drop + Reorder + Delete) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  Foto Produk (Wajib Minimal 3 Gambar) <span className="text-red-500 font-bold">*</span>
                </Label>
                <span
                  className={`text-xs px-2 py-0.5 rounded font-medium ${
                    images.length >= 3
                      ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                  }`}
                >
                  {images.length}/3 Foto Terpenuhi
                </span>
              </div>
              <p className="text-[11px] text-neutral-500">
                Gambar 1 = Foto Utama (Default) • Gambar 2 = Hover Sisi Kiri (Lifestyle/Model) • Gambar 3 = Hover Sisi Kanan (Detail/Angle)
              </p>

              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleFileUpload(e.dataTransfer.files);
                }}
                className="rounded-xl border-2 border-dashed border-neutral-300 dark:border-neutral-800 p-5 text-center hover:border-neutral-500 transition-colors"
              >
                <UploadCloud className="mx-auto h-7 w-7 text-neutral-400 mb-2" />
                <p className="text-xs font-medium">
                  Drag &amp; drop foto produk di sini, atau pilih file untuk
                  diunggah ke Cloudinary
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                  <label className="cursor-pointer inline-flex items-center rounded-md bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 px-3 py-1.5 text-xs font-medium">
                    <span>
                      {isUploading ? "Mengunggah..." : "Pilih File Gambar"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleFileUpload(e.target.files)}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="mt-3 flex items-center gap-2 max-w-md mx-auto">
                  <Input
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    placeholder="Atau tempel URL gambar (https://...)"
                    className="h-8 text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs shrink-0"
                    onClick={() => {
                      if (imageUrlInput.trim()) {
                        setImages((prev) => [...prev, imageUrlInput.trim()]);
                        setImageUrlInput("");
                      }
                    }}
                  >
                    Tambah URL
                  </Button>
                </div>
              </div>

              {images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  {images.map((url, idx) => (
                    <div
                      key={`${url}-${idx}`}
                      className="relative group rounded-lg border border-neutral-200 dark:border-neutral-800 p-2 bg-neutral-50 dark:bg-neutral-900"
                    >
                      <div className="aspect-square w-full overflow-hidden rounded bg-white dark:bg-neutral-800 mb-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={`Preview ${idx + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-medium text-neutral-700 dark:text-neutral-300">
                          {idx === 0
                            ? "1. Utama"
                            : idx === 1
                            ? "2. Hover Kiri"
                            : idx === 2
                            ? "3. Hover Kanan"
                            : `#${idx + 1}`}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveImage(idx, -1)}
                            disabled={idx === 0}
                            className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded disabled:opacity-30"
                            title="Geser kiri"
                          >
                            <ArrowUp className="h-3 w-3 -rotate-90" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveImage(idx, 1)}
                            disabled={idx === images.length - 1}
                            className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded disabled:opacity-30"
                            title="Geser kanan"
                          >
                            <ArrowDown className="h-3 w-3 -rotate-90" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeImage(idx)}
                            className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded"
                            title="Hapus foto"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Product Variants (Size, Color, Stock per Variant) */}
            <div className="space-y-3 border-t border-neutral-200 dark:border-neutral-800 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Varian Produk (Size, Warna &amp; Stok)</Label>
                  <p className="text-xs text-neutral-500">
                    Total stok otomatis dihitung dari jumlah stok seluruh varian.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addVariantRow}
                  className="h-8 text-xs gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Tambah Baris Varian
                </Button>
              </div>

              <div className="space-y-3">
                {variants.map((variant) => (
                  <div
                    key={variant.id}
                    className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/60 space-y-2.5"
                  >
                    {/* Baris Utama: Size, Warna, Stok, SKU, Hapus */}
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-3">
                        <Label className="text-[10px] text-neutral-500 mb-1 block">Size</Label>
                        <Input
                          value={variant.size}
                          onChange={(e) =>
                            updateVariantRow(variant.id, "size", e.target.value)
                          }
                          placeholder="Size (S/M/L/XL)"
                          className="h-8 text-xs bg-white dark:bg-neutral-950"
                        />
                      </div>
                      <div className="col-span-4">
                        <Label className="text-[10px] text-neutral-500 mb-1 block">Nama Warna</Label>
                        <Input
                          value={variant.color}
                          onChange={(e) =>
                            updateVariantRow(variant.id, "color", e.target.value)
                          }
                          placeholder="Warna (White/Cerulean)"
                          className="h-8 text-xs bg-white dark:bg-neutral-950"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-[10px] text-neutral-500 mb-1 block">Stok *</Label>
                        <NumberInput
                          value={variant.stock}
                          onChange={(e) =>
                            updateVariantRow(
                              variant.id,
                              "stock",
                              Number(e.target.value)
                            )
                          }
                          placeholder="Stok"
                          className="h-8 text-xs bg-white dark:bg-neutral-950"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-[10px] text-neutral-500 mb-1 block">SKU Varian *</Label>
                        <Input
                          value={variant.sku}
                          onChange={(e) =>
                            updateVariantRow(variant.id, "sku", e.target.value)
                          }
                          placeholder="SKU Varian"
                          className="h-8 text-xs font-mono bg-white dark:bg-neutral-950"
                        />
                      </div>
                      <div className="col-span-1 flex justify-end items-end pt-4">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeVariantRow(variant.id)}
                          className="h-8 w-8 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/50"
                          title="Hapus baris varian"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Baris Tambahan 1: Grup Warna & Kode Hex (Opsional - BTV style) */}
                    <div className="grid grid-cols-12 gap-3 items-center pt-2 border-t border-neutral-200/70 dark:border-neutral-800/70">
                      <div className="col-span-12 sm:col-span-6 flex items-center gap-2">
                        <Label className="text-[10px] text-neutral-500 shrink-0">
                          Grup Warna (Opsional):
                        </Label>
                        <Input
                          value={variant.colorGroup || ""}
                          onChange={(e) =>
                            updateVariantRow(variant.id, "colorGroup", e.target.value)
                          }
                          placeholder="Contoh: Classic / Seasonal"
                          className="h-7 text-xs bg-white dark:bg-neutral-950 flex-1"
                        />
                      </div>

                      <div className="col-span-12 sm:col-span-6 flex items-center justify-between sm:justify-end gap-2">
                        <Label className="text-[10px] text-neutral-500 shrink-0">
                          Swatch Hex:
                        </Label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={variant.colorHex?.startsWith("#") && variant.colorHex.length === 7 ? variant.colorHex : "#000000"}
                            onChange={(e) =>
                              updateVariantRow(variant.id, "colorHex", e.target.value)
                            }
                            className="h-7 w-7 rounded cursor-pointer border border-neutral-300 dark:border-neutral-700 p-0.5 bg-white dark:bg-neutral-900 shrink-0"
                            title="Pilih swatch warna"
                          />
                          <Input
                            value={variant.colorHex || ""}
                            onChange={(e) =>
                              updateVariantRow(variant.id, "colorHex", e.target.value)
                            }
                            placeholder="#FFFFFF"
                            className="h-7 w-24 text-xs font-mono uppercase bg-white dark:bg-neutral-950"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Baris Tambahan 2: Integrasi Foto untuk Varian Warna Ini */}
                    <div className="grid grid-cols-12 gap-2.5 items-center pt-2 border-t border-neutral-200/70 dark:border-neutral-800/70">
                      <div className="col-span-12 flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        <Label className="text-[10px] text-neutral-500 shrink-0">
                          Foto Warna:
                        </Label>

                        {/* Thumbnail Preview */}
                        {variant.image ? (
                          <div className="relative h-7 w-7 rounded overflow-hidden border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 shrink-0 shadow-sm">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={variant.image}
                              alt={variant.color || "Variant"}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="h-7 w-7 rounded border border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-[9px] text-neutral-400 dark:text-neutral-500 shrink-0 font-medium">
                            Auto
                          </div>
                        )}

                        {/* Dropdown pilihan dari foto produk yang sudah diunggah */}
                        {images.length > 0 && (
                          <select
                            value={(images.includes(variant.image || "") ? variant.image : (variant.image ? "custom" : "")) || ""}
                            onChange={(e) => {
                              if (e.target.value !== "custom") {
                                updateVariantRow(variant.id, "image", e.target.value);
                              }
                            }}
                            className="h-7 rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-2 text-xs text-neutral-700 dark:text-neutral-200 shrink-0 max-w-[160px]"
                          >
                            <option value="">-- Gunakan Foto Otomatis --</option>
                            {images.map((imgUrl, imgIdx) => (
                              <option key={`${imgUrl}-${imgIdx}`} value={imgUrl}>
                                {imgIdx === 0 ? "Foto #1 (Utama)" : `Foto #${imgIdx + 1}`}
                              </option>
                            ))}
                            {variant.image && !images.includes(variant.image) && (
                              <option value="custom">URL Kustom</option>
                            )}
                          </select>
                        )}

                        {/* Input custom URL foto jika ingin memasukkan URL spesifik */}
                        <Input
                          value={variant.image || ""}
                          onChange={(e) =>
                            updateVariantRow(variant.id, "image", e.target.value)
                          }
                          placeholder="Atau tempel URL foto warna ini (https://...)"
                          className="h-7 text-xs bg-white dark:bg-neutral-950 flex-1 font-mono"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* New Arrival & Active Switches */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center justify-between rounded-lg border border-neutral-200 dark:border-neutral-800 p-3.5">
                <div>
                  <Label htmlFor="prod-new-arrival">Tandai New Arrival</Label>
                  <p className="text-xs text-neutral-500">
                    Tampilkan produk di halaman New Arrivals.
                  </p>
                </div>
                <Switch
                  id="prod-new-arrival"
                  checked={isNewArrival}
                  onCheckedChange={setIsNewArrival}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-neutral-200 dark:border-neutral-800 p-3.5">
                <div>
                  <Label htmlFor="prod-active">Status Produk Aktif</Label>
                  <p className="text-xs text-neutral-500">
                    Tampilkan produk di katalog customer.
                  </p>
                </div>
                <Switch
                  id="prod-active"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit">Simpan Produk</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete AlertDialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Hapus Produk?"
        description={`Apakah Anda yakin ingin menghapus produk "${deleteTarget?.name}" (${deleteTarget?.sku})? Tindakan ini tidak dapat dibatalkan.`}
        onConfirm={() => {
          if (deleteTarget) deleteProduct(deleteTarget.id);
        }}
      />
    </div>
  );
}
