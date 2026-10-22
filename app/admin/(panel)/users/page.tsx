"use client";

import * as React from "react";
import {
  Users,
  UserPlus,
  Search,
  ShieldCheck,
  User,
  Phone,
  Edit,
  Trash2,
  CheckCircle2,
  Database,
  RefreshCw,
  KeyRound,
  AlertTriangle,
  ShoppingBag,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type AdminUserListItem } from "@/app/api/admin/users/route";

const PRIMARY_ADMIN_EMAIL = "jorgifatwaambia@gmail.com";

export default function AdminUsersPage() {
  const [users, setUsers] = React.useState<AdminUserListItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<"ALL" | "ADMIN" | "CUSTOMER">("ALL");

  // Database Connection Status State
  const [dbStatus, setDbStatus] = React.useState<{
    checking: boolean;
    connected: boolean | null;
    message: string;
    userCount?: number;
    adminCount?: number;
  }>({
    checking: false,
    connected: null,
    message: "Memeriksa status database...",
  });

  // Modal State
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  // Selected Target
  const [editingUser, setEditingUser] = React.useState<AdminUserListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<AdminUserListItem | null>(null);

  // Form Fields
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [role, setRole] = React.useState<"ADMIN" | "CUSTOMER">("CUSTOMER");
  const [isActive, setIsActive] = React.useState(true);

  // Toast State
  const [toast, setToast] = React.useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const showToast = (type: "success" | "error" | "info", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  // Check Database Status
  const checkDatabaseConnection = React.useCallback(async () => {
    setDbStatus((prev) => ({ ...prev, checking: true }));
    try {
      const res = await fetch("/api/health/db");
      const json = await res.json();
      if (res.ok && json.connected) {
        setDbStatus({
          checking: false,
          connected: true,
          message: "PostgreSQL Terhubung",
          userCount: json.userCount,
          adminCount: json.adminCount,
        });
      } else {
        setDbStatus({
          checking: false,
          connected: false,
          message: json.hint || "Database Terputus (Mode Fallback)",
        });
      }
    } catch {
      setDbStatus({
        checking: false,
        connected: false,
        message: "Tidak dapat menghubungi server database",
      });
    }
  }, []);

  // Load Users List
  const loadUsers = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const json = await res.json();
        if (json.users && Array.isArray(json.users)) {
          setUsers(json.users);
          return;
        }
      }
      showToast("error", "Gagal memuat daftar pengguna dari server.");
    } catch (err) {
      console.warn("Failed to load users:", err);
      showToast("error", "Koneksi ke server bermasalah.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadUsers();
    checkDatabaseConnection();
  }, [loadUsers, checkDatabaseConnection]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setName("");
    setEmail("");
    setPhone("");
    setPassword("");
    setRole("CUSTOMER");
    setIsActive(true);
    setFormError(null);
    setCreateModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (user: AdminUserListItem) => {
    setEditingUser(user);
    setName(user.name);
    setEmail(user.email);
    setPhone(user.phone !== "-" ? user.phone : "");
    setPassword(""); // Kosongkan jika tidak ubah password
    setRole(user.role);
    setIsActive(user.isActive);
    setFormError(null);
    setEditModalOpen(true);
  };

  // Submit Create
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError("Nama lengkap wajib diisi.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setFormError("Format email tidak valid.");
      return;
    }
    if (!password || password.trim().length < 6) {
      setFormError("Password minimal 6 karakter.");
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);

      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || null,
          password: password.trim(),
          role,
          isActive,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setFormError(json.error || "Gagal membuat pengguna baru.");
        return;
      }

      if (json.user) {
        setUsers((prev) => [json.user, ...prev]);
      }
      showToast("success", `User ${name.trim()} berhasil ditambahkan!`);
      setCreateModalOpen(false);
    } catch {
      setFormError("Terjadi kesalahan jaringan saat membuat user.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Edit
  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (!name.trim()) {
      setFormError("Nama lengkap wajib diisi.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setFormError("Format email tidak valid.");
      return;
    }
    if (password && password.trim().length < 6) {
      setFormError("Password baru minimal 6 karakter.");
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);

      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || null,
          ...(password.trim() ? { password: password.trim() } : {}),
          role,
          isActive,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setFormError(json.error || "Gagal memperbarui data pengguna.");
        return;
      }

      const updated = json.user || {
        ...editingUser,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || "-",
        role,
        isActive,
      };

      setUsers((prev) =>
        prev.map((u) => (u.id === editingUser.id ? updated : u))
      );
      showToast("success", `Data user ${name.trim()} berhasil diperbarui!`);
      setEditModalOpen(false);
    } catch {
      setFormError("Terjadi kesalahan jaringan saat memperbarui user.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Active
  const handleToggleActive = async (user: AdminUserListItem) => {
    const nextStatus = !user.isActive;
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, isActive: nextStatus } : u))
    );

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextStatus }),
      });

      if (!res.ok) throw new Error("Gagal update status");
      showToast(
        "info",
        `User ${user.name} ${nextStatus ? "diaktifkan" : "dinonaktifkan"}.`
      );
    } catch {
      // Revert on error
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, isActive: user.isActive } : u))
      );
      showToast("error", "Gagal memperbarui status di server.");
    }
  };

  // Delete Confirm
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/admin/users/${deleteTarget.id}`, {
        method: "DELETE",
      });

      const json = await res.json();

      if (!res.ok) {
        showToast("error", json.error || "Gagal menghapus user.");
        return;
      }

      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      showToast("success", `User ${deleteTarget.name} berhasil dihapus.`);
      setDeleteModalOpen(false);
    } catch {
      showToast("error", "Terjadi kesalahan jaringan saat menghapus user.");
    } finally {
      setIsSubmitting(false);
      setDeleteTarget(null);
    }
  };

  // Filtered Users
  const filteredUsers = React.useMemo(() => {
    return users.filter((u) => {
      if (roleFilter === "ADMIN" && u.role !== "ADMIN") return false;
      if (roleFilter === "CUSTOMER" && u.role !== "CUSTOMER") return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.phone.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [users, roleFilter, searchQuery]);

  // Statistics
  const adminCount = users.filter((u) => u.role === "ADMIN").length;
  const customerCount = users.filter((u) => u.role === "CUSTOMER").length;
  const activeCount = users.filter((u) => u.isActive).length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 ${
            toast.type === "success"
              ? "bg-[#396254] text-white border-[#2a493e]"
              : toast.type === "error"
              ? "bg-red-600 text-white border-red-700"
              : "bg-neutral-900 text-white border-neutral-700"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-neutral-900 dark:text-neutral-100 font-heading">
            Kelola User &amp; Staff
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Manajemen akun administrator, staf, dan pelanggan toko online it&apos;smatapanda.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              loadUsers();
              checkDatabaseConnection();
            }}
            disabled={loading || dbStatus.checking}
            className="rounded-xl border-neutral-300 dark:border-neutral-700 text-xs gap-1.5"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${
                loading || dbStatus.checking ? "animate-spin" : ""
              }`}
            />
            <span>Refresh</span>
          </Button>

          <Button
            type="button"
            onClick={handleOpenCreate}
            className="rounded-xl bg-[#396254] hover:bg-[#2e5044] text-white text-xs font-semibold gap-1.5 shadow-sm"
          >
            <UserPlus className="h-4 w-4" />
            <span>Tambah User Baru</span>
          </Button>
        </div>
      </div>

      {/* Database Connection Banner */}
      <div
        className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
          dbStatus.connected
            ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
            : dbStatus.connected === false
            ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200"
            : "bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <Database className="h-4 w-4 shrink-0" />
          <div>
            <span className="font-bold">Status Koneksi Database: </span>
            <span>{dbStatus.message}</span>
            {dbStatus.connected && (
              <span className="ml-2 font-mono opacity-80">
                (Total di PostgreSQL: {dbStatus.userCount ?? users.length} user)
              </span>
            )}
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={checkDatabaseConnection}
          disabled={dbStatus.checking}
          className="text-xs h-7 self-start sm:self-auto hover:bg-black/5 dark:hover:bg-white/5"
        >
          {dbStatus.checking ? "Memeriksa..." : "Uji Ulang Koneksi"}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs mb-2">
            <span>Total Pengguna</span>
            <Users className="h-4 w-4 text-[#396254]" />
          </div>
          <div className="text-2xl font-black tracking-tight text-neutral-900 dark:text-neutral-100">
            {users.length}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">
            {activeCount} akun berstatus aktif
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs mb-2">
            <span>Administrator</span>
            <ShieldCheck className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black tracking-tight text-neutral-900 dark:text-neutral-100">
            {adminCount}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">Akses penuh panel admin</div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs mb-2">
            <span>Pelanggan</span>
            <User className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black tracking-tight text-neutral-900 dark:text-neutral-100">
            {customerCount}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">Customer storefront</div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs mb-2">
            <span>Akun Admin Utama</span>
            <KeyRound className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-xs font-mono font-bold text-neutral-900 dark:text-neutral-100 truncate">
            {PRIMARY_ADMIN_EMAIL}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            <span>Fast-Path Aktif</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Role Tabs */}
        <div className="flex items-center bg-neutral-100 dark:bg-neutral-800/60 p-1 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setRoleFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              roleFilter === "ALL"
                ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs"
                : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            }`}
          >
            Semua ({users.length})
          </button>
          <button
            type="button"
            onClick={() => setRoleFilter("ADMIN")}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              roleFilter === "ADMIN"
                ? "bg-white dark:bg-neutral-900 text-purple-700 dark:text-purple-300 shadow-xs"
                : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Admin ({adminCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setRoleFilter("CUSTOMER")}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              roleFilter === "CUSTOMER"
                ? "bg-white dark:bg-neutral-900 text-blue-700 dark:text-blue-300 shadow-xs"
                : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            }`}
          >
            <User className="h-3.5 w-3.5" />
            <span>Customer ({customerCount})</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
          <Input
            type="text"
            placeholder="Cari nama, email, no HP..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs rounded-xl h-9"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-neutral-50 dark:bg-neutral-800/50">
              <TableRow>
                <TableHead className="w-12 text-center text-xs">No</TableHead>
                <TableHead className="text-xs">Pengguna</TableHead>
                <TableHead className="text-xs">Kontak</TableHead>
                <TableHead className="text-xs">Role</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Pesanan</TableHead>
                <TableHead className="text-xs">Terdaftar</TableHead>
                <TableHead className="text-xs text-right pr-6">Aksi</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-xs text-neutral-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-[#396254]" />
                    Memuat daftar pengguna...
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-xs text-neutral-400">
                    <Users className="h-8 w-8 mx-auto mb-2 text-neutral-300 dark:text-neutral-700" />
                    Tidak ada pengguna yang cocok dengan kriteria pencarian.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((item, idx) => {
                  const isPrimaryAdmin =
                    item.email.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase();

                  return (
                    <TableRow key={item.id} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40">
                      <TableCell className="text-center text-xs font-mono text-neutral-400">
                        {idx + 1}
                      </TableCell>

                      {/* Name & Avatar */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                              item.role === "ADMIN"
                                ? "bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                                : "bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200"
                            }`}
                          >
                            {item.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-xs text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                              <span>{item.name}</span>
                              {isPrimaryAdmin && (
                                <span className="bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[10px] px-1.5 py-0.2 rounded font-bold">
                                  Primary
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-neutral-500 font-mono mt-0.5">
                              {item.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Contact */}
                      <TableCell>
                        <div className="text-xs text-neutral-600 dark:text-neutral-400 flex items-center gap-1.5">
                          <Phone className="h-3 w-3 opacity-60" />
                          <span className="font-mono">{item.phone}</span>
                        </div>
                      </TableCell>

                      {/* Role */}
                      <TableCell>
                        {item.role === "ADMIN" ? (
                          <Badge className="bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800 text-[10px] font-bold gap-1">
                            <ShieldCheck className="h-3 w-3" />
                            <span>ADMINISTRATOR</span>
                          </Badge>
                        ) : (
                          <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800 text-[10px] font-semibold gap-1">
                            <User className="h-3 w-3" />
                            <span>CUSTOMER</span>
                          </Badge>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(item)}
                          title="Klik untuk mengubah status aktif"
                          className="flex items-center gap-1.5 group cursor-pointer"
                        >
                          {item.isActive ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Aktif
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
                              Non-aktif
                            </span>
                          )}
                        </button>
                      </TableCell>

                      {/* Total Orders */}
                      <TableCell>
                        <div className="text-xs text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
                          <ShoppingBag className="h-3 w-3 opacity-60" />
                          <span className="font-semibold">{item.totalOrders}</span>
                        </div>
                      </TableCell>

                      {/* Joined At */}
                      <TableCell className="text-xs font-mono text-neutral-500">
                        {item.createdAt.slice(0, 10)}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(item)}
                            className="h-8 w-8 p-0 rounded-lg text-neutral-600 hover:text-black dark:text-neutral-400 dark:hover:text-white"
                            title="Edit User & Password"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>

                          {!isPrimaryAdmin && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setDeleteTarget(item);
                                setDeleteModalOpen(true);
                              }}
                              className="h-8 w-8 p-0 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                              title="Hapus Pengguna"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* CREATE USER MODAL */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-[#396254]" />
              <span>Tambah User Baru</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Buat akun pengguna baru untuk staf admin atau pelanggan toko.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateUser} className="space-y-4 pt-2">
            {formError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-300 text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Nama Lengkap *
              </label>
              <Input
                type="text"
                placeholder="Contoh: Sarah Jenkins"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-xs rounded-xl"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Alamat Email *
              </label>
              <Input
                type="email"
                placeholder="sarah@itsmatapanda.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="text-xs rounded-xl"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Nomor Telepon / WhatsApp
              </label>
              <Input
                type="text"
                placeholder="081234567890"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="text-xs rounded-xl font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Password * (minimal 6 karakter)
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Masukkan password..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="text-xs rounded-xl pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors focus:outline-none"
                  aria-label={showPassword ? "Sembunyikan password" : "Lihat password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Role Akses *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole("CUSTOMER")}
                  className={`p-3 rounded-xl border text-xs font-semibold text-left transition-all ${
                    role === "CUSTOMER"
                      ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300"
                      : "border-neutral-200 dark:border-neutral-800 text-neutral-600 hover:bg-neutral-50"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <User className="h-4 w-4" />
                    <span>CUSTOMER</span>
                  </div>
                  <div className="text-[10px] font-normal opacity-70">
                    Akses belanja &amp; order storefront
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setRole("ADMIN")}
                  className={`p-3 rounded-xl border text-xs font-semibold text-left transition-all ${
                    role === "ADMIN"
                      ? "border-purple-500 bg-purple-50/50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300"
                      : "border-neutral-200 dark:border-neutral-800 text-neutral-600 hover:bg-neutral-50"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <ShieldCheck className="h-4 w-4" />
                    <span>ADMINISTRATOR</span>
                  </div>
                  <div className="text-[10px] font-normal opacity-70">
                    Akses penuh dashboard admin
                  </div>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="create-active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded accent-[#396254]"
              />
              <label htmlFor="create-active" className="text-xs text-neutral-700 dark:text-neutral-300">
                Akun langsung berstatus aktif
              </label>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateModalOpen(false)}
                className="text-xs rounded-xl"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="text-xs rounded-xl bg-[#396254] hover:bg-[#2e5044] text-white font-semibold"
              >
                {isSubmitting ? "Menyimpan..." : "Simpan User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT USER MODAL */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Edit className="h-5 w-5 text-[#396254]" />
              <span>Edit Data User &amp; Password</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Perbarui profil pengguna, ubah role akses, atau reset password.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditUser} className="space-y-4 pt-2">
            {formError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-300 text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Nama Lengkap *
              </label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-xs rounded-xl"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Alamat Email *
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="text-xs rounded-xl"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Nomor Telepon / WhatsApp
              </label>
              <Input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="text-xs rounded-xl font-mono"
              />
            </div>

            <div className="space-y-1.5 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
                <KeyRound className="h-3.5 w-3.5 text-amber-600" />
                <span>Ganti / Reset Password (Opsional)</span>
              </div>
              <p className="text-[11px] text-neutral-400 mb-2">
                Kosongkan field ini jika tidak ingin mengubah password akun.
              </p>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Masukkan password baru jika ingin mereset..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="text-xs rounded-xl bg-white dark:bg-neutral-900 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors focus:outline-none"
                  aria-label={showPassword ? "Sembunyikan password" : "Lihat password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Role Akses *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole("CUSTOMER")}
                  className={`p-3 rounded-xl border text-xs font-semibold text-left transition-all ${
                    role === "CUSTOMER"
                      ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300"
                      : "border-neutral-200 dark:border-neutral-800 text-neutral-600 hover:bg-neutral-50"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <User className="h-4 w-4" />
                    <span>CUSTOMER</span>
                  </div>
                  <div className="text-[10px] font-normal opacity-70">
                    Akses belanja storefront
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setRole("ADMIN")}
                  className={`p-3 rounded-xl border text-xs font-semibold text-left transition-all ${
                    role === "ADMIN"
                      ? "border-purple-500 bg-purple-50/50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300"
                      : "border-neutral-200 dark:border-neutral-800 text-neutral-600 hover:bg-neutral-50"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <ShieldCheck className="h-4 w-4" />
                    <span>ADMINISTRATOR</span>
                  </div>
                  <div className="text-[10px] font-normal opacity-70">
                    Akses penuh dashboard admin
                  </div>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="edit-active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded accent-[#396254]"
              />
              <label htmlFor="edit-active" className="text-xs text-neutral-700 dark:text-neutral-300">
                Akun berstatus aktif
              </label>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditModalOpen(false)}
                className="text-xs rounded-xl"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="text-xs rounded-xl bg-[#396254] hover:bg-[#2e5044] text-white font-semibold"
              >
                {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              <span>Hapus Akun Pengguna?</span>
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              Apakah Anda yakin ingin menghapus akun{" "}
              <strong>{deleteTarget?.name}</strong> ({deleteTarget?.email})?
              Tindakan ini akan menonaktifkan akun tersebut dari sistem.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteModalOpen(false)}
              className="text-xs rounded-xl"
            >
              Batal
            </Button>
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={handleDeleteConfirm}
              className="text-xs rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold"
            >
              {isSubmitting ? "Menghapus..." : "Ya, Hapus Akun"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
