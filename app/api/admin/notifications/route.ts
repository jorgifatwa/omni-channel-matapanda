import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  INITIAL_NOTIFICATIONS,
  type AdminNotificationItem,
  type NotificationType,
} from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const dbNotifs = await prisma.adminNotification.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    if (dbNotifs && dbNotifs.length > 0) {
      const formatted: AdminNotificationItem[] = dbNotifs.map((n) => ({
        id: n.id,
        type: n.type as NotificationType,
        title: n.title,
        message: n.message,
        link: n.link,
        isRead: n.isRead,
        metadata: n.metadata as Record<string, unknown> | null,
        createdAt: n.createdAt.toISOString(),
        updatedAt: n.updatedAt.toISOString(),
      }));

      const unreadCount = formatted.filter((n) => !n.isRead).length;

      return NextResponse.json({
        notifications: formatted,
        unreadCount,
        source: "database",
      });
    }

    const unreadCount = INITIAL_NOTIFICATIONS.filter((n) => !n.isRead).length;
    return NextResponse.json({
      notifications: INITIAL_NOTIFICATIONS,
      unreadCount,
      source: "defaults",
    });
  } catch (error) {
    console.warn("Database unavailable for notifications, using fallback:", error);
    const unreadCount = INITIAL_NOTIFICATIONS.filter((n) => !n.isRead).length;
    return NextResponse.json({
      notifications: INITIAL_NOTIFICATIONS,
      unreadCount,
      source: "fallback",
    });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      type = "NEW_CUSTOMER",
      title,
      message,
      link = "/admin/customers",
      metadata,
    } = body;

    if (!title || !message) {
      return NextResponse.json(
        { error: "Judul dan Pesan notifikasi wajib diisi." },
        { status: 400 }
      );
    }

    try {
      const created = await prisma.adminNotification.create({
        data: {
          type,
          title: title.trim(),
          message: message.trim(),
          link: link || "/admin/customers",
          isRead: false,
          metadata: metadata || null,
        },
      });

      const formatted: AdminNotificationItem = {
        id: created.id,
        type: created.type as NotificationType,
        title: created.title,
        message: created.message,
        link: created.link,
        isRead: created.isRead,
        metadata: created.metadata as Record<string, unknown> | null,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      };

      return NextResponse.json({ notification: formatted, success: true }, { status: 201 });
    } catch (dbError) {
      console.warn("Database create failed for notification, using in-memory response:", dbError);
      const fallbackItem: AdminNotificationItem = {
        id: `notif-${Date.now()}`,
        type: type as NotificationType,
        title: title.trim(),
        message: message.trim(),
        link: link || "/admin/customers",
        isRead: false,
        metadata: metadata || null,
        createdAt: new Date().toISOString(),
      };
      return NextResponse.json({ notification: fallbackItem, success: true }, { status: 201 });
    }
  } catch (error) {
    console.error("POST /api/admin/notifications error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server saat membuat notifikasi." },
      { status: 500 }
    );
  }
}
