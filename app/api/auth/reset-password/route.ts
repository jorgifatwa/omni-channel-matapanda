import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { readPasswordToken, tokenMatchesUser } from "@/lib/password-reset";
import { TOO_MANY_MESSAGE, clientIp, rateLimit } from "@/lib/rate-limit";

/** POST /api/auth/reset-password { token, password } */
export async function POST(request: Request) {
  if (!(await rateLimit("reset-ip", clientIp(request), 20, 3600))) {
    return NextResponse.json({ error: TOO_MANY_MESSAGE }, { status: 429 });
  }
  const { token, password } = (await request.json().catch(() => ({}))) as { token?: string; password?: string };
  if (typeof password !== "string" || password.length < 6 || password.length > 200) {
    return NextResponse.json({ error: "Password minimal 6 karakter." }, { status: 400 });
  }
  const data = typeof token === "string" ? readPasswordToken(token) : null;
  const invalid = NextResponse.json(
    { error: "Link tidak valid, sudah dipakai, atau kedaluwarsa. Minta link baru dari halaman Lupa Password." },
    { status: 400 }
  );
  if (!data) return invalid;

  const user = await prisma.user.findFirst({
    where: { id: data.uid, deletedAt: null, isActive: true },
    select: { id: true, passwordHash: true },
  });
  if (!user || !tokenMatchesUser(data.fp, user.passwordHash)) return invalid;

  // Conditional update: the link can only be used once even if clicked twice
  const res = await prisma.user.updateMany({
    where: { id: user.id, passwordHash: user.passwordHash },
    data: { passwordHash: await bcrypt.hash(password, 10) },
  });
  if (res.count !== 1) return invalid;
  return NextResponse.json({ success: true, message: "Password berhasil disimpan. Silakan login." });
}
