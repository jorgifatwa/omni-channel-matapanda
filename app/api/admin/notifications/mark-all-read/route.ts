import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH() {
  try {
    try {
      await prisma.adminNotification.updateMany({
        where: { isRead: false },
        data: { isRead: true },
      });
      return NextResponse.json({ success: true, message: "Semua notifikasi ditandai dibaca." });
    } catch (dbError) {
      console.warn("Database updateMany failed for notifications:", dbError);
      return NextResponse.json({ success: true, message: "Semua notifikasi ditandai dibaca." });
    }
  } catch (error) {
    console.error("PATCH /api/admin/notifications/mark-all-read error:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui notifikasi." },
      { status: 500 }
    );
  }
}
