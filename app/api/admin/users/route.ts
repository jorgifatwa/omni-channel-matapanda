import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export interface AdminUserListItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "ADMIN" | "CUSTOMER";
  isActive: boolean;
  totalOrders: number;
  createdAt: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const roleFilter = searchParams.get("role"); // "ADMIN" | "CUSTOMER" | "ALL" | null
  const search = searchParams.get("search")?.toLowerCase().trim();

  try {
    const whereClause: {
      deletedAt: null;
      role?: "ADMIN" | "CUSTOMER";
      OR?: Array<{
        name?: { contains: string; mode: "insensitive" };
        email?: { contains: string; mode: "insensitive" };
        phone?: { contains: string; mode: "insensitive" };
      }>;
    } = {
      deletedAt: null,
    };

    if (roleFilter === "ADMIN" || roleFilter === "CUSTOMER") {
      whereClause.role = roleFilter;
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    const dbUsers = await prisma.user.findMany({
      where: whereClause,
      orderBy: [{ role: "asc" }, { createdAt: "desc" }],
      include: {
        _count: {
          select: { orders: { where: { deletedAt: null } } },
        },
      },
    });

    const formatted: AdminUserListItem[] = dbUsers.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone || "-",
      role: u.role as "ADMIN" | "CUSTOMER",
      isActive: u.isActive,
      totalOrders: u._count.orders,
      createdAt: u.createdAt.toISOString(),
    }));

    return NextResponse.json({
      users: formatted,
      source: "database",
      total: formatted.length,
    });
  } catch (error) {
    console.error("[AdminUsersGET] Database query failed:", error);
    return NextResponse.json(
      { users: [], total: 0, error: "Gagal memuat data pengguna dari database." },
      { status: 503 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      email,
      phone,
      password,
      role = "CUSTOMER",
      isActive = true,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Nama lengkap pengguna wajib diisi." },
        { status: 400 }
      );
    }

    if (!email || !email.trim()) {
      return NextResponse.json(
        { error: "Alamat email wajib diisi." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    if (!password || password.trim().length < 6) {
      return NextResponse.json(
        { error: "Password minimal 6 karakter." },
        { status: 400 }
      );
    }

    // Check duplicate email
    try {
      const existing = await prisma.user.findFirst({
        where: {
          email: { equals: cleanEmail, mode: "insensitive" },
          deletedAt: null,
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: "Email sudah terdaftar. Gunakan email lain." },
          { status: 409 }
        );
      }

      const passwordHash = await bcrypt.hash(password.trim(), 10);

      const created = await prisma.user.create({
        data: {
          name: name.trim(),
          email: cleanEmail,
          phone: phone ? phone.trim() : null,
          passwordHash,
          role: role === "ADMIN" ? "ADMIN" : "CUSTOMER",
          isActive: Boolean(isActive),
        },
      });

      const formatted: AdminUserListItem = {
        id: created.id,
        name: created.name,
        email: created.email,
        phone: created.phone || "-",
        role: created.role as "ADMIN" | "CUSTOMER",
        isActive: created.isActive,
        totalOrders: 0,
        createdAt: created.createdAt.toISOString(),
      };

      return NextResponse.json(
        { user: formatted, success: true },
        { status: 201 }
      );
    } catch (dbError) {
      console.error("[AdminUsersPOST] Database create failed:", dbError);
      return NextResponse.json(
        { error: "Gagal menyimpan pengguna ke database." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("POST /api/admin/users error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server saat membuat pengguna." },
      { status: 500 }
    );
  }
}
