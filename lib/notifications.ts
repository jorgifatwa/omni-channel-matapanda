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
export const ADMIN_LATEST_NOTIF_KEY = "itspanda_latest_notification_event";

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
