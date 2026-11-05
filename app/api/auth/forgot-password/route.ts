import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPasswordToken } from "@/lib/password-reset";
import { sendPasswordLinkEmail } from "@/lib/mail";
import { TOO_MANY_MESSAGE, clientIp, rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/auth/forgot-password { email }
 * Emails a single-use link to set a new password. Always answers the same way
 * so it can't be used to find out which emails have an account.
 */
export async function POST(request: Request) {
  const { email } = (await request.json().catch(() => ({}))) as { email?: string };
  const normalized = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!normalized.includes("@") || normalized.length > 200) {
    return NextResponse.json({ error: "Masukkan email yang valid." }, { status: 400 });
  }

  const ip = clientIp(request);
  if (!(await rateLimit("forgot-ip", ip, 10, 3600)) || !(await rateLimit("forgot-email", normalized, 3, 3600))) {
    return NextResponse.json({ error: TOO_MANY_MESSAGE }, { status: 429 });
  }

  const ok = NextResponse.json({
    success: true,
    message: "Jika email terdaftar, link untuk membuat password baru sudah kami kirim. Cek inbox dan folder spam.",
  });

  const user = await prisma.user.findFirst({
    where: { email: { equals: normalized, mode: "insensitive" }, deletedAt: null, isActive: true },
    select: { id: true, name: true, email: true, passwordHash: true },
  });
  if (!user || user.email.endsWith("@customer.itsmatapanda.com")) return ok;

  const appUrl = (process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const link = `${appUrl}/account/reset-password?token=${encodeURIComponent(createPasswordToken(user.id, user.passwordHash))}`;
  await sendPasswordLinkEmail({
    to: user.email,
    name: user.name,
    link,
    purpose: user.passwordHash ? "reset" : "claim",
  });
  return ok;
}
