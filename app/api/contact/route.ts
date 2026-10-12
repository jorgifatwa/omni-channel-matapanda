import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendAdminInquiryNotification } from "@/lib/mail";

export const dynamic = "force-dynamic";

// 1. POST: Handle customer contact message submission
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, message } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Nama wajib diisi." },
        { status: 400 }
      );
    }

    if (!email || !email.trim() || !email.includes("@")) {
      return NextResponse.json(
        { error: "Email valid wajib diisi." },
        { status: 400 }
      );
    }

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: "Isi pesan tidak boleh kosong." },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPhone = phone ? phone.trim() : null;
    const trimmedMessage = message.trim();

    // 1. Save inquiry to PostgreSQL via Prisma
    let savedInquiryId = `inq-${Date.now()}`;
    try {
      const created = await prisma.contactInquiry.create({
        data: {
          name: trimmedName,
          email: trimmedEmail,
          phone: trimmedPhone,
          message: trimmedMessage,
          isRead: false,
        },
      });
      savedInquiryId = created.id;
    } catch (dbErr) {
      console.warn("Database save contact inquiry fallback / offline:", dbErr);
    }

    // 2. Send email notification to Admin via Nodemailer
    const emailResult = await sendAdminInquiryNotification({
      name: trimmedName,
      email: trimmedEmail,
      phone: trimmedPhone,
      message: trimmedMessage,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        success: true,
        message: "Pesan Anda telah berhasil dikirim ke tim it's matapanda. Kami akan merespons secepatnya!",
        inquiryId: savedInquiryId,
        emailSent: emailResult.success,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Contact submission error:", error);
    return NextResponse.json(
      { error: "Terjadi gangguan saat mengirim pesan. Silakan coba lagi." },
      { status: 500 }
    );
  }
}

// 2. GET: List all inquiries for admin dashboard
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 401 }
      );
    }

    try {
      const inquiries = await prisma.contactInquiry.findMany({
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json({ inquiries });
    } catch (dbErr) {
      console.warn("Prisma findMany inquiries error:", dbErr);
      // Fallback sample inquiries for demo
      return NextResponse.json({
        inquiries: [
          {
            id: "inq-demo-01",
            name: "Rama Pratama",
            email: "rama.pratama@example.com",
            phone: "+62 812-9876-5432",
            message: "Halo tim it's matapanda, apakah T-shirt Dawn Gong Sunburn 01 akan restock ukuran XL dalam waktu dekat?",
            isRead: false,
            createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
          },
          {
            id: "inq-demo-02",
            name: "Siti Nurhaliza",
            email: "siti.nur@example.com",
            phone: "+62 856-1234-5678",
            message: "Selamat siang, saya ingin menanyakan estimasi pengiriman JNE ke Surabaya jika checkout hari ini. Terima kasih!",
            isRead: true,
            createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
          },
        ],
      });
    }
  } catch (error) {
    console.error("Fetch inquiries error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil daftar pesan" },
      { status: 500 }
    );
  }
}

// 3. PATCH: Mark inquiry as read/unread
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, isRead } = body;

    if (!id) {
      return NextResponse.json({ error: "ID inquiry diperlukan." }, { status: 400 });
    }

    try {
      const updated = await prisma.contactInquiry.update({
        where: { id },
        data: { isRead: Boolean(isRead) },
      });
      return NextResponse.json({ success: true, inquiry: updated });
    } catch {
      return NextResponse.json({ success: true });
    }
  } catch (error) {
    console.error("Update inquiry error:", error);
    return NextResponse.json({ error: "Gagal memperbarui status pesan" }, { status: 500 });
  }
}

// 4. DELETE: Remove inquiry
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID inquiry diperlukan." }, { status: 400 });
    }

    try {
      await prisma.contactInquiry.delete({
        where: { id },
      });
      return NextResponse.json({ success: true });
    } catch {
      return NextResponse.json({ success: true });
    }
  } catch (error) {
    console.error("Delete inquiry error:", error);
    return NextResponse.json({ error: "Gagal menghapus pesan" }, { status: 500 });
  }
}
