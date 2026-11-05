import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createPasswordToken } from "@/lib/password-reset";
import { sendPasswordLinkEmail } from "@/lib/mail";
import { TOO_MANY_MESSAGE, clientIp, rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    if (!(await rateLimit("register-ip", clientIp(request), 10, 3600))) {
      return NextResponse.json({ error: TOO_MANY_MESSAGE }, { status: 429 });
    }
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
    const normalizedEmail = isEmailFormat ? trimmedEmail : `${trimmedEmail}@customer.itsmatapanda.com`;

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
        // A guest buyer (order placed without an account) has no password yet.
        // Prove ownership of the email before letting anyone set one, so a
        // stranger can't take over that buyer's order history.
        if (!existingUser.passwordHash && !existingUser.email.endsWith("@customer.itsmatapanda.com")) {
          const appUrl = (process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
          const link = `${appUrl}/account/reset-password?token=${encodeURIComponent(createPasswordToken(existingUser.id, null))}`;
          if (await rateLimit("claim-email", existingUser.email, 3, 3600)) {
            await sendPasswordLinkEmail({ to: existingUser.email, name: existingUser.name, link, purpose: "claim" });
          }
          return NextResponse.json(
            {
              error:
                "Email ini sudah pernah dipakai untuk belanja. Kami sudah mengirim link ke email tersebut untuk membuat password. Cek inbox atau folder spam.",
              claimLinkSent: true,
            },
            { status: 409 }
          );
        }
        return NextResponse.json(
          { error: "Email atau No. Handphone ini sudah terdaftar. Silakan login atau gunakan Lupa Password." },
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
      // Never report success when the account was not saved
      const code = (dbErr as { code?: string })?.code;
      if (code === "P2002") {
        return NextResponse.json(
          { error: "Email atau nomor HP sudah terdaftar. Silakan login." },
          { status: 409 }
        );
      }
      console.error("[Register] Gagal menyimpan user:", dbErr);
      return NextResponse.json(
        { error: "Pendaftaran gagal disimpan. Silakan coba lagi beberapa saat lagi." },
        { status: 503 }
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
