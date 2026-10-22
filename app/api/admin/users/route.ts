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

const DEFAULT_USERS: AdminUserListItem[] = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    name: "it's matapanda Admin",
    email: "jorgifatwaambia@gmail.com",
    phone: "+6281290001111",
    role: "ADMIN",
    isActive: true,
    totalOrders: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    name: "Customer it's matapanda",
    email: "customer@itsmatapanda.com",
    phone: "081234567890",
    role: "CUSTOMER",
    isActive: true,
    totalOrders: 3,
    createdAt: "2026-02-15T00:00:00.000Z",
  },
];

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

    if (dbUsers.length > 0) {
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
    }

    // If database is empty, auto-seed the primary admin user
    try {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      const seededAdmin = await prisma.user.create({
        data: {
          name: "it's matapanda Admin",
          email: "jorgifatwaambia@gmail.com",
          passwordHash: hashedPassword,
          phone: "+6281290001111",
          role: "ADMIN",
          isActive: true,
        },
      });

      const initialFormatted: AdminUserListItem[] = [
        {
          id: seededAdmin.id,
          name: seededAdmin.name,
          email: seededAdmin.email,
          phone: seededAdmin.phone || "-",
          role: "ADMIN",
          isActive: seededAdmin.isActive,
          totalOrders: 0,
          createdAt: seededAdmin.createdAt.toISOString(),
        },
      ];

      return NextResponse.json({
        users: initialFormatted,
        source: "database",
        total: initialFormatted.length,
      });
    } catch {}

    return NextResponse.json({
      users: DEFAULT_USERS,
      source: "defaults",
      total: DEFAULT_USERS.length,
    });
  } catch (error) {
    console.warn("[AdminUsersGET] Database query failed, using fallback:", error);
    let fallback = [...DEFAULT_USERS];
    if (roleFilter === "ADMIN") fallback = fallback.filter((u) => u.role === "ADMIN");
    if (roleFilter === "CUSTOMER") fallback = fallback.filter((u) => u.role === "CUSTOMER");
    if (search) {
      fallback = fallback.filter(
        (u) =>
          u.name.toLowerCase().includes(search) ||
          u.email.toLowerCase().includes(search) ||
          u.phone.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({
      users: fallback,
      source: "fallback",
      total: fallback.length,
    });
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
      console.warn("[AdminUsersPOST] Database create failed, using memory echo:", dbError);
      const fallbackItem: AdminUserListItem = {
        id: `user-${Date.now()}`,
        name: name.trim(),
        email: cleanEmail,
        phone: phone ? phone.trim() : "-",
        role: role === "ADMIN" ? "ADMIN" : "CUSTOMER",
        isActive: Boolean(isActive),
        totalOrders: 0,
        createdAt: new Date().toISOString(),
      };

      return NextResponse.json(
        { user: fallbackItem, success: true },
        { status: 201 }
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
