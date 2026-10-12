import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, password } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Nama lengkap wajib diisi" },
        { status: 400 }
      );
    }

    if (!email || !email.trim()) {
      return NextResponse.json(
        { error: "Email atau No. Handphone wajib diisi" },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: "Password minimal 6 karakter" },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();
    const isEmailFormat = trimmedEmail.includes("@");
    const normalizedPhone = phone ? phone.trim() : !isEmailFormat ? trimmedEmail : undefined;
    const normalizedEmail = isEmailFormat ? trimmedEmail : `${trimmedEmail}@customer.zodiacjakarta.com`;

    const passwordHash = await bcrypt.hash(password, 10);

    // Check if user already exists in DB
    try {
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: normalizedEmail },
            ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
          ],
        },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: "Email atau No. Handphone ini sudah terdaftar. Silakan login." },
          { status: 409 }
        );
      }

      const newUser = await prisma.user.create({
        data: {
          name: name.trim(),
          email: normalizedEmail,
          phone: normalizedPhone || null,
          passwordHash,
          role: "CUSTOMER",
          isActive: true,
        },
      });

      // Automatically create an admin notification for the new customer registration
      let createdNotif = null;
      try {
        const notif = await prisma.adminNotification.create({
          data: {
            type: "NEW_CUSTOMER",
            title: "Customer Baru Terdaftar",
            message: `${name.trim()} (${normalizedEmail}) baru saja mendaftar akun customer it'smatapanda.`,
            link: "/admin/customers",
            isRead: false,
            metadata: {
              customerId: newUser.id,
              name: name.trim(),
              email: normalizedEmail,
              phone: normalizedPhone || null,
            },
          },
        });
        createdNotif = {
          id: notif.id,
          type: notif.type,
          title: notif.title,
          message: notif.message,
          link: notif.link,
          isRead: notif.isRead,
          createdAt: notif.createdAt.toISOString(),
        };
      } catch (notifErr) {
        console.warn("Failed to create admin notification in db:", notifErr);
      }

      return NextResponse.json(
        {
          success: true,
          message: "Registrasi berhasil!",
          user: {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            phone: newUser.phone,
            role: newUser.role,
          },
          notification: createdNotif || {
            id: `notif-${Date.now()}`,
            type: "NEW_CUSTOMER",
            title: "Customer Baru Terdaftar",
            message: `${name.trim()} (${normalizedEmail}) baru saja mendaftar akun customer it'smatapanda.`,
            link: "/admin/customers",
            isRead: false,
            createdAt: new Date().toISOString(),
          },
        },
        { status: 201 }
      );
    } catch (dbErr) {
      console.warn("Database create user fallback:", dbErr);
      const fallbackUser = {
        id: `usr-${Date.now()}`,
        name: name.trim(),
        email: normalizedEmail,
        phone: normalizedPhone,
        role: "CUSTOMER",
      };
      const fallbackNotif = {
        id: `notif-${Date.now()}`,
        type: "NEW_CUSTOMER",
        title: "Customer Baru Terdaftar",
        message: `${name.trim()} (${normalizedEmail}) baru saja mendaftar akun customer it'smatapanda.`,
        link: "/admin/customers",
        isRead: false,
        createdAt: new Date().toISOString(),
      };

      return NextResponse.json(
        {
          success: true,
          message: "Akun customer berhasil dibuat (Demo Mode)",
          user: fallbackUser,
          notification: fallbackNotif,
        },
        { status: 201 }
      );
    }
  } catch (error) {
    console.error("Customer register error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat memproses pendaftaran." },
      { status: 500 }
    );
  }
}
