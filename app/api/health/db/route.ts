import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Test basic connection
    await prisma.$queryRaw`SELECT 1 as result`;

    // 2. Count users
    const userCount = await prisma.user.count({ where: { deletedAt: null } });
    const adminCount = await prisma.user.count({
      where: { role: "ADMIN", deletedAt: null },
    });

    // 3. Auto-seed admin user if not already in database
    const primaryAdminEmail = "jorgifatwaambia@gmail.com";
    let adminRecord = await prisma.user.findFirst({
      where: { email: { equals: primaryAdminEmail, mode: "insensitive" } },
    });

    if (!adminRecord) {
      try {
        const hashedPassword = await bcrypt.hash("admin123", 10);
        adminRecord = await prisma.user.create({
          data: {
            name: "it's matapanda Admin",
            email: primaryAdminEmail,
            passwordHash: hashedPassword,
            phone: "+6281290001111",
            role: "ADMIN",
            isActive: true,
          },
        });
      } catch (createErr) {
        console.warn("[HealthDB] Could not auto-create admin in DB:", createErr);
      }
    }

    return NextResponse.json({
      status: "connected",
      database: "PostgreSQL",
      connected: true,
      userCount,
      adminCount: Math.max(adminCount, adminRecord ? 1 : 0),
      adminEmail: primaryAdminEmail,
      message: "Database PostgreSQL terhubung dengan normal.",
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[HealthDB] Database connection error:", errorMessage);

    return NextResponse.json(
      {
        status: "disconnected",
        connected: false,
        error: errorMessage,
        hint:
          "Database belum dapat dijangkau dari server ini. Pastikan variabel DATABASE_URL di Vercel Dashboard sudah diisi dengan koneksi PostgreSQL cloud aktif (seperti Neon / Supabase / Vercel Postgres) dan bukan localhost.",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
