"use client";

import * as React from "react";
import Image from "next/image";
import {
  Camera,
  Plus,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  CheckCircle2,
  Loader2,
  RotateCcw,
  ExternalLink,
  Search,
  Upload,
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
  type CommunityPost,
  INITIAL_COMMUNITY_POSTS,
} from "@/lib/community-store";

const LOCAL_STORAGE_KEY = "itspanda_admin_community_v1";

export default function AdminCommunityPage() {
  const [posts, setPosts] = React.useState<CommunityPost[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filterStatus, setFilterStatus] = React.useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [searchQuery, setSearchQuery] = React.useState("");

  // Modal State
  const [modalOpen, setModalOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [editingPost, setEditingPost] = React.useState<CommunityPost | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<CommunityPost | null>(null);

  // Form Fields
  const [image, setImage] = React.useState("");
  const [accountHandle, setAccountHandle] = React.useState("itsmatapanda");
  const [caption, setCaption] = React.useState("");
  const [postDate, setPostDate] = React.useState("");
  const [instagramUrl, setInstagramUrl] = React.useState("");
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

  // Load posts
  const loadPosts = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/community");
      if (res.ok) {
        const json = await res.json();
        if (json.posts && Array.isArray(json.posts)) {
          setPosts(json.posts);
          try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(json.posts));
          } catch {}
          return;
        }
      }

      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setPosts(parsed);
            return;
          }
        } catch {}
      }

      setPosts(INITIAL_COMMUNITY_POSTS);
    } catch (err) {
      console.warn("Using fallback local storage for community posts:", err);
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        try {
          setPosts(JSON.parse(cached));
          return;
        } catch {}
      }
      setPosts(INITIAL_COMMUNITY_POSTS);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  // Sync to state & local storage
  const saveToLocalAndState = (updatedList: CommunityPost[]) => {
    setPosts(updatedList);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedList));
    } catch {}
  };

  // Reset to default
  const handleResetDefaults = () => {
    saveToLocalAndState(INITIAL_COMMUNITY_POSTS);
    showToast("info", "Postingan Community berhasil direset ke data default.");
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingPost(null);
    setImage("");
    setAccountHandle("itsmatapanda");
    setCaption("Caught in between errands. @customer spotted with Dumpling Bag in Olive Green #itsmatapandaOnYou");
    setPostDate("Today");
    setInstagramUrl("https://www.instagram.com/itsmatapanda");
    setSortOrder(posts.length);
    setIsActive(true);
    setFormError(null);
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (post: CommunityPost) => {
    setEditingPost(post);
    setImage(post.image);
    setAccountHandle(post.accountHandle);
    setCaption(post.caption);
    setPostDate(post.postDate || "");
    setInstagramUrl(post.instagramUrl || "");
    setSortOrder(post.sortOrder);
    setIsActive(post.isActive);
    setFormError(null);
    setModalOpen(true);
  };

  // Handle Image Upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const json = await res.json();
        if (json.url) {
          setImage(json.url);
          showToast("success", "Gambar berhasil diunggah.");
        }
      } else {
        // Mock preview fallback with object URL
        const previewUrl = URL.createObjectURL(file);
        setImage(previewUrl);
        showToast("info", "Gambar dimuat untuk preview lokal.");
      }
    } catch {
      const previewUrl = URL.createObjectURL(file);
      setImage(previewUrl);
      showToast("info", "Gambar dimuat untuk preview lokal.");
    } finally {
      setIsUploading(false);
    }
  };

  // Save (Create / Update)
  const handleSavePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!image.trim()) {
      setFormError("URL atau file foto wajib diisi.");
      return;
    }
    if (!caption.trim()) {
      setFormError("Caption postingan wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const payload = {
      image: image.trim(),
      accountHandle: (accountHandle || "itsmatapanda").replace(/^@/, "").trim(),
      caption: caption.trim(),
      postDate: postDate.trim() || null,
      instagramUrl: instagramUrl.trim() || null,
      sortOrder: Number(sortOrder) || 0,
      isActive,
    };

    try {
      if (editingPost) {
        // PUT update
        const res = await fetch(`/api/admin/community/${editingPost.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const json = await res.json();
          const updatedItem = json.post || { ...editingPost, ...payload };
          const updatedList = posts.map((p) =>
            p.id === editingPost.id ? updatedItem : p
          );
          saveToLocalAndState(updatedList);
          showToast("success", "Postingan berhasil diperbarui.");
        } else {
          const updatedItem: CommunityPost = {
            ...editingPost,
            ...payload,
            updatedAt: new Date().toISOString(),
          };
          saveToLocalAndState(
            posts.map((p) => (p.id === editingPost.id ? updatedItem : p))
          );
          showToast("success", "Postingan berhasil diperbarui (mode lokal).");
        }
      } else {
        // POST create
        const res = await fetch("/api/admin/community", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const json = await res.json();
          const newItem = json.post || {
            id: `cp-${Date.now()}`,
            ...payload,
            createdAt: new Date().toISOString(),
          };
          saveToLocalAndState([...posts, newItem]);
          showToast("success", "Postingan baru berhasil ditambahkan.");
        } else {
          const newItem: CommunityPost = {
            id: `cp-${Date.now()}`,
            ...payload,
            createdAt: new Date().toISOString(),
          };
          saveToLocalAndState([...posts, newItem]);
          showToast("success", "Postingan baru berhasil dibuat (mode lokal).");
        }
      }

      setModalOpen(false);
    } catch {
      if (editingPost) {
        const updatedItem: CommunityPost = {
          ...editingPost,
          ...payload,
          updatedAt: new Date().toISOString(),
        };
        saveToLocalAndState(
          posts.map((p) => (p.id === editingPost.id ? updatedItem : p))
        );
      } else {
        const newItem: CommunityPost = {
          id: `cp-${Date.now()}`,
          ...payload,
          createdAt: new Date().toISOString(),
        };
        saveToLocalAndState([...posts, newItem]);
      }
      showToast("success", "Data tersimpan di penyimpanan lokal.");
      setModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Active Status
  const handleToggleActive = async (post: CommunityPost) => {
    const nextActive = !post.isActive;
    const updatedList = posts.map((p) =>
      p.id === post.id ? { ...p, isActive: nextActive } : p
    );
    saveToLocalAndState(updatedList);

    try {
      await fetch(`/api/admin/community/${post.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextActive }),
      });
      showToast(
        "info",
        `Postingan ${nextActive ? "diaktifkan" : "dinonaktifkan"}.`
      );
    } catch {
      showToast("info", `Postingan ${nextActive ? "diaktifkan" : "dinonaktifkan"} (lokal).`);
    }
  };

  // Re-order Up / Down
  const handleMoveOrder = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= posts.length) return;

    const newList = [...posts];
    const [moved] = newList.splice(index, 1);
    newList.splice(targetIndex, 0, moved);

    const reorderedList = newList.map((item, idx) => ({
      ...item,
      sortOrder: idx,
    }));

    saveToLocalAndState(reorderedList);

    reorderedList.forEach((item) => {
      fetch(`/api/admin/community/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: item.sortOrder }),
      }).catch(() => {});
    });

    showToast("info", "Urutan postingan diperbarui.");
  };

  // Delete Confirmation
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    const updatedList = posts.filter((p) => p.id !== deleteTarget.id);
    saveToLocalAndState(updatedList);

    try {
      await fetch(`/api/admin/community/${deleteTarget.id}`, {
        method: "DELETE",
      });
      showToast("success", "Postingan berhasil dihapus.");
    } catch {
      showToast("success", "Postingan dihapus dari daftar lokal.");
    } finally {
      setDeleteTarget(null);
    }
  };

  // Filtered Posts
  const filteredPosts = React.useMemo(() => {
    return posts
      .filter((post) => {
        if (filterStatus === "ACTIVE") return post.isActive;
        if (filterStatus === "INACTIVE") return !post.isActive;
        return true;
      })
      .filter((post) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          post.caption.toLowerCase().includes(q) ||
          post.accountHandle.toLowerCase().includes(q) ||
          (post.postDate && post.postDate.toLowerCase().includes(q))
        );
      });
  }, [posts, filterStatus, searchQuery]);

  const activePosts = posts.filter((p) => p.isActive);

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
              <Camera className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
              Pengaturan Community (it&apos;smatapanda ON YOU)
            </h1>
          </div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Kelola foto OOTD customer & kurasi postingan Instagram resmi untuk feed beranda toko.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetDefaults}
            className="text-xs text-neutral-600 dark:text-neutral-300"
            title="Reset ke data default"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Reset Default
          </Button>
          <Button
            onClick={handleOpenCreate}
            className="bg-black hover:bg-neutral-800 text-white dark:bg-white dark:text-black dark:hover:bg-neutral-200 text-xs font-semibold px-4 py-2"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Tambah Postingan Baru
          </Button>
        </div>
      </div>

      {/* Live Storefront Carousel Preview */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
              Live Feed Preview (Storefront View)
            </h2>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono uppercase">
            {activePosts.length} Postingan Aktif
          </Badge>
        </div>

        {/* Carousel Row Preview */}
        <div className="w-full bg-neutral-50 dark:bg-neutral-950 rounded-lg p-3 overflow-x-auto no-scrollbar flex gap-3 border border-neutral-200 dark:border-neutral-800">
          {activePosts.length > 0 ? (
            activePosts.map((item, idx) => (
              <div
                key={`preview-${item.id}-${idx}`}
                className="relative aspect-square w-[110px] sm:w-[130px] rounded-lg overflow-hidden shrink-0 border border-neutral-300 dark:border-neutral-700 bg-neutral-200 group cursor-pointer"
              >
                <Image
                  src={item.image}
                  alt={item.caption}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2 text-white text-[9px]">
                  <span className="font-bold truncate">@{item.accountHandle}</span>
                  <span className="text-neutral-300 truncate">{item.postDate}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 w-full text-xs text-neutral-400 italic">
              Tidak ada postingan aktif. Slider ON YOU tidak akan tampil di toko.
            </div>
          )}
        </div>
        <p className="text-[11px] text-neutral-500">
          Catatan: Pengunjung toko yang mengklik salah satu foto di atas akan melihat jendela popup (modal) ala Beyond The Vines lengkap dengan caption & link Instagram asli.
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
            Semua ({posts.length})
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
            Aktif ({posts.filter((p) => p.isActive).length})
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
            Non-Aktif ({posts.filter((p) => !p.isActive).length})
          </Button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <Input
            placeholder="Cari caption / akun..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs h-9"
          />
        </div>
      </div>

      {/* Posts List / Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
          <Loader2 className="w-8 h-8 animate-spin mb-3" />
          <p className="text-sm font-medium">Memuat data community...</p>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 dark:border-neutral-800 p-12 text-center">
          <Camera className="w-10 h-10 text-neutral-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-neutral-800 dark:text-neutral-200">
            Tidak Ada Postingan Ditemukan
          </h3>
          <p className="text-sm text-neutral-500 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `Tidak ada postingan yang cocok dengan "${searchQuery}".`
              : "Tambahkan foto OOTD customer pertama Anda untuk ditampilkan di bagian ON YOU."}
          </p>
          {!searchQuery && (
            <Button
              onClick={handleOpenCreate}
              className="mt-4 bg-black text-white dark:bg-white dark:text-black text-xs"
            >
              <Plus className="w-4 h-4 mr-1" />
              Tambah Post Baru
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden shadow-sm">
          <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {filteredPosts.map((post, index) => (
              <div
                key={post.id}
                className={`p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                  !post.isActive ? "bg-neutral-50/50 dark:bg-neutral-950/40 opacity-75" : ""
                }`}
              >
                {/* Left: Reorder + Image Thumbnail + Details */}
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  {/* Reorder Buttons */}
                  <div className="flex flex-col items-center shrink-0 pt-1">
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
                      disabled={index === filteredPosts.length - 1}
                      onClick={() => handleMoveOrder(index, "down")}
                      title="Geser ke bawah"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  {/* Thumbnail */}
                  <div className="relative aspect-square w-20 sm:w-24 rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shrink-0">
                    <Image
                      src={post.image}
                      alt={post.caption}
                      fill
                      className="object-cover"
                    />
                  </div>

                  {/* Details */}
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                        @{post.accountHandle}
                      </span>

                      {post.postDate && (
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {post.postDate}
                        </Badge>
                      )}

                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          post.isActive
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400"
                        }`}
                      >
                        {post.isActive ? "Aktif" : "Non-Aktif"}
                      </span>
                    </div>

                    <p className="text-xs text-neutral-700 dark:text-neutral-300 line-clamp-2 leading-relaxed">
                      {post.caption}
                    </p>

                    {post.instagramUrl && (
                      <div className="flex items-center gap-1 text-[11px] text-neutral-500 font-mono truncate">
                        <ExternalLink className="w-3 h-3 text-neutral-400 shrink-0" />
                        <span className="truncate max-w-sm">{post.instagramUrl}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 md:self-center pl-10 md:pl-0 shrink-0">
                  <div className="flex items-center gap-2 mr-2">
                    <Switch
                      checked={post.isActive}
                      onCheckedChange={() => handleToggleActive(post)}
                      aria-label="Toggle post status"
                    />
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEdit(post)}
                    className="h-8 text-xs font-medium"
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1.5" />
                    Edit
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteTarget(post)}
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
              <Camera className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
              {editingPost ? "Edit Postingan Community" : "Tambah Postingan Community Baru"}
            </DialogTitle>
            <DialogDescription>
              Atur foto OOTD, caption Instagram, tanggal, dan link postingan resmi untuk modal popup.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePost} className="space-y-5 pt-2">
            {formError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                {formError}
              </div>
            )}

            {/* Foto Post */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">
                Foto Postingan (URL atau Upload File) <span className="text-red-500">*</span>
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="https://images.unsplash.com/... atau URL foto"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  required
                  className="text-xs"
                />
                <label className="cursor-pointer inline-flex items-center justify-center px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-xs font-medium shrink-0">
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  {isUploading ? "Mengunggah..." : "Upload"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                </label>
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Rekomendasi rasio 1:1 (Persegi 1080x1080px) atau 4:5 (Potret OOTD 1080x1350px). Format JPG, PNG, atau WEBP kualitas tinggi untuk tampilan feed komunitas.
              </p>

              {/* Photo Preview */}
              {image && (
                <div className="relative aspect-square w-32 rounded-lg overflow-hidden border border-neutral-300 dark:border-neutral-700 mt-2 bg-neutral-100">
                  <Image src={image} alt="Preview" fill className="object-cover" />
                </div>
              )}
            </div>

            {/* Akun Instagram & Tanggal */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="post-handle" className="text-xs font-semibold">
                  Akun Brand / Handle Instagram
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-xs font-semibold">
                    @
                  </span>
                  <Input
                    id="post-handle"
                    placeholder="itsmatapanda"
                    value={accountHandle}
                    onChange={(e) => setAccountHandle(e.target.value)}
                    className="pl-7 text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="post-date" className="text-xs font-semibold">
                  Tanggal Postingan (Format Bebas)
                </Label>
                <Input
                  id="post-date"
                  placeholder="Contoh: May 15 atau Oct 02"
                  value={postDate}
                  onChange={(e) => setPostDate(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>
            </div>

            {/* Caption Teks */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="post-caption" className="text-xs font-semibold">
                  Caption Postingan <span className="text-red-500">*</span>
                </Label>
                <span className="text-[10px] text-neutral-400">
                  Mendukung mention @user dan #hashtag
                </span>
              </div>
              <textarea
                id="post-caption"
                rows={4}
                placeholder="Caught in between errands. @customer spotted in Micro Dumpling Bag #itsmatapandaOnYou"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                required
                className="w-full text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-3 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white leading-relaxed"
              />
            </div>

            {/* Link Instagram Post Asli */}
            <div className="space-y-1.5">
              <Label htmlFor="post-ig-url" className="text-xs font-semibold">
                Link URL Postingan Instagram Asli (View on Instagram)
              </Label>
              <Input
                id="post-ig-url"
                placeholder="https://www.instagram.com/p/..."
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                className="text-xs font-mono"
              />
              <p className="text-[11px] text-neutral-500">
                Link ini akan dibuka ketika pengunjung mengklik &quot;• View on Instagram&quot; di popup modal.
              </p>
            </div>

            {/* Urutan & Status */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-neutral-200 dark:border-neutral-800">
              <div className="space-y-1.5">
                <Label htmlFor="post-order" className="text-xs font-semibold">
                  Nomor Urutan
                </Label>
                <Input
                  id="post-order"
                  type="number"
                  min={0}
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Number(e.target.value))}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5 flex flex-col justify-end">
                <div className="flex items-center justify-between p-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
                  <Label htmlFor="post-active" className="text-xs font-semibold cursor-pointer">
                    Status Aktif
                  </Label>
                  <Switch
                    id="post-active"
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
                  "Simpan Postingan"
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
        title="Hapus Postingan Community?"
        description={`Apakah Anda yakin ingin menghapus postingan @${deleteTarget?.accountHandle}? Tindakan ini tidak dapat dibatalkan.`}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
