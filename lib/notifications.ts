/**
 * notifications.ts
 *
 * Types, defaults, and helper functions for Admin Notifications in it'smatapanda.
 */

export type NotificationType = "NEW_CUSTOMER" | "NEW_ORDER" | "LOW_STOCK" | "GENERAL";

export interface AdminNotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  metadata?: {
    customerId?: string;
    email?: string;
    name?: string;
    phone?: string;
    [key: string]: unknown;
  } | null;
  createdAt: string;
  updatedAt?: string;
}

export const ADMIN_NOTIFICATION_CHANNEL = "itspanda_admin_notifications_channel";
export const ADMIN_NOTIFICATION_STORAGE_KEY = "itspanda_admin_notifications_v1";
export const ADMIN_LATEST_NOTIF_KEY = "itspanda_latest_notification_event";

export const INITIAL_NOTIFICATIONS: AdminNotificationItem[] = [
  {
    id: "notif-cust-1",
    type: "NEW_CUSTOMER",
    title: "Customer Baru Terdaftar",
    message: "Raya Putra (raya.putra@gmail.com) baru saja mendaftar akun customer it'smatapanda.",
    link: "/admin/customers",
    isRead: false,
    metadata: {
      customerId: "u4d1a004-4444-4444-8444-000000000001",
      name: "Raya Putra",
      email: "raya.putra@gmail.com",
      phone: "081234567890",
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(), // 18 mins ago
  },
  {
    id: "notif-cust-2",
    type: "NEW_CUSTOMER",
    title: "Customer Baru Terdaftar",
    message: "Amira Salsabila (amira.salsa@yahoo.com) baru saja mendaftar akun customer it'smatapanda.",
    link: "/admin/customers",
    isRead: false,
    metadata: {
      customerId: "u4d1a004-4444-4444-8444-000000000002",
      name: "Amira Salsabila",
      email: "amira.salsa@yahoo.com",
      phone: "081398765432",
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 125).toISOString(), // ~2 hours ago
  },
  {
    id: "notif-cust-3",
    type: "NEW_CUSTOMER",
    title: "Customer Baru Terdaftar",
    message: "Dimas Anggara (dimas.anggara@gmail.com) baru saja mendaftar akun customer it'smatapanda.",
    link: "/admin/customers",
    isRead: true,
    metadata: {
      customerId: "u4d1a004-4444-4444-8444-000000000003",
      name: "Dimas Anggara",
      email: "dimas.anggara@gmail.com",
      phone: "082155543210",
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
  },
];

/**
 * Format timestamp into friendly relative Indonesian time
 */
export function formatNotificationTime(dateString: string): string {
  try {
    const d = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Baru saja";
    if (diffMins < 60) return `${diffMins} mnt lalu`;
    if (diffHours < 24) return `${diffHours} jam lalu`;
    if (diffDays === 1) return "Kemarin";
    if (diffDays < 7) return `${diffDays} hari lalu`;

    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
}
