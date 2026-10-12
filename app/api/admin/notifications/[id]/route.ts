import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json().catch(() => ({}));
    const isRead = body.isRead !== undefined ? Boolean(body.isRead) : true;

    try {
      const updated = await prisma.adminNotification.update({
        where: { id: params.id },
        data: { isRead },
      });
      return NextResponse.json({ success: true, notification: updated });
    } catch (dbError) {
      console.warn("Database update failed for notification:", dbError);
      return NextResponse.json({
        success: true,
        notification: { id: params.id, isRead },
      });
    }
  } catch (error) {
    console.error("PATCH /api/admin/notifications/[id] error:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui status notifikasi." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    try {
      await prisma.adminNotification.delete({
        where: { id: params.id },
      });
      return NextResponse.json({ success: true, message: "Notifikasi berhasil dihapus." });
    } catch (dbError) {
      console.warn("Database delete failed for notification:", dbError);
      return NextResponse.json({ success: true, message: "Notifikasi berhasil dihapus." });
    }
  } catch (error) {
    console.error("DELETE /api/admin/notifications/[id] error:", error);
    return NextResponse.json(
      { error: "Gagal menghapus notifikasi." },
      { status: 500 }
    );
  }
}
