"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  UserPlus,
  ShoppingBag,
  AlertTriangle,
  Info,
  CheckCheck,
  Trash2,
  ExternalLink,
  Users,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  type AdminNotificationItem,
  INITIAL_NOTIFICATIONS,
  ADMIN_NOTIFICATION_CHANNEL,
  ADMIN_LATEST_NOTIF_KEY,
  formatNotificationTime,
} from "@/lib/notifications";

const LOCAL_STORAGE_NOTIFS_KEY = "itspanda_admin_notifications_store_v1";

export default function AdminNotificationBell() {
  const router = useRouter();
  const [notifications, setNotifications] = React.useState<AdminNotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [filterType, setFilterType] = React.useState<"ALL" | "NEW_CUSTOMER" | "UNREAD">("ALL");
  const [open, setOpen] = React.useState(false);

  // Live incoming toast alert
  const [incomingAlert, setIncomingAlert] = React.useState<{
    title: string;
    message: string;
    link?: string;
  } | null>(null);

  // Load notifications from API / localStorage
  const loadNotifications = React.useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications");
      if (res.ok) {
        const data = await res.json();
        if (data?.notifications && Array.isArray(data.notifications)) {
          setNotifications(data.notifications);
          setUnreadCount(data.unreadCount ?? data.notifications.filter((n: AdminNotificationItem) => !n.isRead).length);
          try {
            localStorage.setItem(LOCAL_STORAGE_NOTIFS_KEY, JSON.stringify(data.notifications));
          } catch {}
          return;
        }
      }

      // Fallback
      const cached = localStorage.getItem(LOCAL_STORAGE_NOTIFS_KEY);
      if (cached) {
        try {
          const parsed: AdminNotificationItem[] = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            setNotifications(parsed);
            setUnreadCount(parsed.filter((n) => !n.isRead).length);
            return;
          }
        } catch {}
      }

      setNotifications(INITIAL_NOTIFICATIONS);
      setUnreadCount(INITIAL_NOTIFICATIONS.filter((n) => !n.isRead).length);
    } catch {
      // Fallback to cache or initial
      const cached = localStorage.getItem(LOCAL_STORAGE_NOTIFS_KEY);
      if (cached) {
        try {
          const parsed: AdminNotificationItem[] = JSON.parse(cached);
          setNotifications(parsed);
          setUnreadCount(parsed.filter((n) => !n.isRead).length);
          return;
        } catch {}
      }
      setNotifications(INITIAL_NOTIFICATIONS);
      setUnreadCount(INITIAL_NOTIFICATIONS.filter((n) => !n.isRead).length);
    }
  }, []);

  React.useEffect(() => {
    loadNotifications();

    // Polling interval every 15 seconds
    const interval = setInterval(loadNotifications, 15000);

    // BroadcastChannel listener for instant real-time wakeup
    let bc: BroadcastChannel | null = null;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      bc = new BroadcastChannel(ADMIN_NOTIFICATION_CHANNEL);
      bc.onmessage = (event) => {
        if (event.data?.type === "NEW_NOTIFICATION" && event.data.notification) {
          const newNotif = event.data.notification as AdminNotificationItem;
          setNotifications((prev) => {
            const updated = [newNotif, ...prev.filter((n) => n.id !== newNotif.id)];
            try {
              localStorage.setItem(LOCAL_STORAGE_NOTIFS_KEY, JSON.stringify(updated));
            } catch {}
            return updated;
          });
          setUnreadCount((prev) => prev + 1);

          // Show floating toast alert
          setIncomingAlert({
            title: newNotif.title,
            message: newNotif.message,
            link: newNotif.link || "/admin/customers",
          });
          setTimeout(() => setIncomingAlert(null), 6000);
        }
      };
    }

    // Storage event listener for cross-tab sync
    const handleStorage = (e: StorageEvent) => {
      if (e.key === ADMIN_LATEST_NOTIF_KEY && e.newValue) {
        try {
          const newNotif = JSON.parse(e.newValue) as AdminNotificationItem;
          setNotifications((prev) => {
            const updated = [newNotif, ...prev.filter((n) => n.id !== newNotif.id)];
            return updated;
          });
          setUnreadCount((prev) => prev + 1);

          setIncomingAlert({
            title: newNotif.title,
            message: newNotif.message,
            link: newNotif.link || "/admin/customers",
          });
          setTimeout(() => setIncomingAlert(null), 6000);
        } catch {}
      }
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      clearInterval(interval);
      if (bc) bc.close();
      window.removeEventListener("storage", handleStorage);
    };
  }, [loadNotifications]);

  // Mark all as read
  const handleMarkAllRead = async () => {
    const updated = notifications.map((n) => ({ ...n, isRead: true }));
    setNotifications(updated);
    setUnreadCount(0);
    try {
      localStorage.setItem(LOCAL_STORAGE_NOTIFS_KEY, JSON.stringify(updated));
      await fetch("/api/admin/notifications/mark-all-read", { method: "PATCH" });
    } catch {}
  };

  // Click single notification
  const handleNotificationClick = async (notif: AdminNotificationItem) => {
    if (!notif.isRead) {
      const updated = notifications.map((n) =>
        n.id === notif.id ? { ...n, isRead: true } : n
      );
      setNotifications(updated);
      setUnreadCount((prev) => Math.max(0, prev - 1));
      try {
        localStorage.setItem(LOCAL_STORAGE_NOTIFS_KEY, JSON.stringify(updated));
        await fetch(`/api/admin/notifications/${notif.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isRead: true }),
        });
      } catch {}
    }

    setOpen(false);
    if (notif.link) {
      router.push(notif.link);
    }
  };

  // Delete notification
  const handleDeleteNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const target = notifications.find((n) => n.id === id);
    const updated = notifications.filter((n) => n.id !== id);
    setNotifications(updated);
    if (target && !target.isRead) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
    try {
      localStorage.setItem(LOCAL_STORAGE_NOTIFS_KEY, JSON.stringify(updated));
      await fetch(`/api/admin/notifications/${id}`, { method: "DELETE" });
    } catch {}
  };

  // Filtered notifications
  const filteredNotifications = React.useMemo(() => {
    return notifications.filter((n) => {
      if (filterType === "NEW_CUSTOMER") return n.type === "NEW_CUSTOMER";
      if (filterType === "UNREAD") return !n.isRead;
      return true;
    });
  }, [notifications, filterType]);

  // Render icon based on type
  const renderNotifIcon = (type: string) => {
    switch (type) {
      case "NEW_CUSTOMER":
        return (
          <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-sm">
            <UserPlus className="h-4 w-4" />
          </div>
        );
      case "NEW_ORDER":
        return (
          <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-sm">
            <ShoppingBag className="h-4 w-4" />
          </div>
        );
      case "LOW_STOCK":
        return (
          <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-sm">
            <AlertTriangle className="h-4 w-4" />
          </div>
        );
      default:
        return (
          <div className="h-8 w-8 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 flex items-center justify-center shrink-0 shadow-sm">
            <Info className="h-4 w-4" />
          </div>
        );
    }
  };

  return (
    <>
      {/* Real-time Incoming Pop Toast */}
      {incomingAlert && (
        <div
          onClick={() => {
            if (incomingAlert.link) router.push(incomingAlert.link);
            setIncomingAlert(null);
          }}
          className="fixed top-20 right-6 z-50 max-w-sm w-full bg-white dark:bg-neutral-900 border border-emerald-500/40 rounded-xl shadow-2xl p-4 cursor-pointer transform animate-in slide-in-from-top-4 fade-in duration-300 hover:scale-[1.02] transition-all flex items-start gap-3.5"
        >
          <div className="h-9 w-9 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                {incomingAlert.title}
              </span>
              <span className="text-[10px] text-neutral-400 font-mono">Baru saja</span>
            </div>
            <p className="text-xs text-neutral-800 dark:text-neutral-200 mt-1 leading-snug line-clamp-2">
              {incomingAlert.message}
            </p>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1.5 flex items-center gap-1">
              <span>Klik untuk melihat di menu Customers</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </p>
          </div>
        </div>
      )}

      {/* Bell Dropdown Trigger */}
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            aria-label="Admin Notifications"
            className="relative h-9 w-9 border-neutral-200 dark:border-neutral-800"
          >
            <Bell className="h-4 w-4 text-neutral-700 dark:text-neutral-300" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-black text-white shadow-sm ring-2 ring-white dark:ring-neutral-950 animate-in zoom-in-50">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          className="w-80 sm:w-96 p-0 bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 shadow-2xl rounded-xl overflow-hidden z-50"
        >
          {/* Popover Header */}
          <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Notifikasi
              </span>
              {unreadCount > 0 && (
                <Badge className="bg-red-500 hover:bg-red-500 text-white text-[10px] px-1.5 py-0 h-4">
                  {unreadCount} baru
                </Badge>
              )}
            </div>

            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllRead}
                className="h-7 text-[11px] text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white px-2"
                title="Tandai semua telah dibaca"
              >
                <CheckCheck className="w-3.5 h-3.5 mr-1" />
                Tandai dibaca
              </Button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="px-3 pt-2.5 pb-1 flex items-center gap-1.5 border-b border-neutral-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={() => setFilterType("ALL")}
              className={`text-[11px] font-medium px-2.5 py-1 rounded-md transition-colors ${
                filterType === "ALL"
                  ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 font-semibold"
                  : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-900"
              }`}
            >
              Semua ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("NEW_CUSTOMER")}
              className={`text-[11px] font-medium px-2.5 py-1 rounded-md transition-colors ${
                filterType === "NEW_CUSTOMER"
                  ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 font-semibold"
                  : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-900"
              }`}
            >
              Customer ({notifications.filter((n) => n.type === "NEW_CUSTOMER").length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("UNREAD")}
              className={`text-[11px] font-medium px-2.5 py-1 rounded-md transition-colors ${
                filterType === "UNREAD"
                  ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 font-semibold"
                  : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-900"
              }`}
            >
              Belum Dibaca ({unreadCount})
            </button>
          </div>

          {/* Notifications Scroll List */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800">
            {filteredNotifications.length === 0 ? (
              <div className="py-12 text-center text-neutral-400 px-4">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs font-medium">Tidak ada notifikasi</p>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  Notifikasi saat ada customer baru akan muncul di sini.
                </p>
              </div>
            ) : (
              filteredNotifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3.5 flex items-start gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-900/60 cursor-pointer transition-colors group relative ${
                    !notif.isRead
                      ? "bg-emerald-50/40 dark:bg-emerald-950/20"
                      : ""
                  }`}
                >
                  {/* Notification Icon */}
                  {renderNotifIcon(notif.type)}

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">
                        {notif.title}
                      </p>
                      <span className="text-[10px] font-mono text-neutral-400 shrink-0">
                        {formatNotificationTime(notif.createdAt)}
                      </span>
                    </div>

                    <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-snug line-clamp-2">
                      {notif.message}
                    </p>

                    {notif.metadata?.email && (
                      <div className="pt-1 flex items-center gap-2">
                        <Badge variant="outline" className="text-[9px] font-mono py-0 h-4">
                          {String(notif.metadata.email)}
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Unread indicator dot */}
                  {!notif.isRead && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1" />
                  )}

                  {/* Delete button on hover */}
                  <button
                    type="button"
                    onClick={(e) => handleDeleteNotification(e, notif.id)}
                    aria-label="Hapus notifikasi"
                    className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-600 p-1 transition-opacity absolute right-2 bottom-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 text-center">
            <Link
              href="/admin/customers"
              onClick={() => setOpen(false)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white transition-colors"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Buka Menu Kelola Customer</span>
            </Link>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
