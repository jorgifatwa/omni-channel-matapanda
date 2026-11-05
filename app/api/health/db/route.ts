import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Public database health check.
 * Read-only: it never creates or changes data, and it does not expose
 * connection details or raw error messages.
 */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1 as result`;
  } catch (error) {
    console.error("[HealthDB] Database connection error:", error);
    return NextResponse.json(
      {
        status: "disconnected",
        connected: false,
        tablesReady: false,
        hint: "Database tidak dapat dijangkau. Periksa DATABASE_URL di environment variables.",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }

  try {
    const [userCount, adminCount, productCount] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { role: "ADMIN", deletedAt: null } }),
      prisma.product.count({ where: { deletedAt: null } }),
    ]);

    return NextResponse.json({
      status: "connected",
      database: "PostgreSQL",
      connected: true,
      tablesReady: true,
      userCount,
      adminCount,
      productCount,
      message: "Database PostgreSQL terhubung dengan normal.",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const missingTables =
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021";
    console.error("[HealthDB] Database query error:", error);

    return NextResponse.json(
      {
        status: missingTables ? "schema_missing" : "error",
        connected: true,
        tablesReady: !missingTables,
        hint: missingTables
          ? "Database terhubung, tetapi tabel belum dibuat. Jalankan `npx prisma db push` ke database ini."
          : "Database terhubung, tetapi query gagal. Periksa log server.",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
