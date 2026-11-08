import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { type AdminUserListItem } from "../route";

const PRIMARY_ADMIN_EMAIL = "jorgifatwaambia@gmail.com";
const PRIMARY_ADMIN_ID = "00000000-0000-4000-8000-000000000001";

/**
 * The primary admin and the admin making the request must never lose access:
 * no demotion to CUSTOMER, no deactivation, no deletion. Otherwise an admin
 * could lock themselves (or the owner account) out of the dashboard.
 */
async function getProtectionReason(target: { id: string; email: string }) {
  if (
    target.id === PRIMARY_ADMIN_ID ||
    target.email.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase()
  ) {
    return "Akun administrator utama tidak dapat diturunkan, dinonaktifkan, atau dihapus.";
  }
  const session = await getServerSession(authOptions);
  if (session?.user?.id && session.user.id === target.id) {
    return "Anda tidak dapat menurunkan role, menonaktifkan, atau menghapus akun Anda sendiri.";
  }
  return null;
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { orders: { where: { deletedAt: null } } },
        },
      },
    });

    if (!user || user.deletedAt) {
      return NextResponse.json(
        { error: "User tidak ditemukan" },
        { status: 404 }
      );
    }

    const formatted: AdminUserListItem = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || "-",
      role: user.role as "ADMIN" | "CUSTOMER",
      isActive: user.isActive,
      totalOrders: user._count.orders,
      createdAt: user.createdAt.toISOString(),
    };

    return NextResponse.json({ user: formatted });
  } catch (error) {
    console.error("GET /api/admin/users/[id] error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data user." },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const {
      name,
      email,
      phone,
      password,
      role,
      isActive,
    } = body;

    const losesAccess =
      (role !== undefined && role !== "ADMIN") ||
      (isActive !== undefined && !isActive);
    if (losesAccess) {
      const target = await prisma.user.findUnique({
        where: { id: params.id },
        select: { id: true, email: true, role: true },
      });
      if (!target) {
        return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
      }
      // Demoting a customer to CUSTOMER is a no-op, so only guard real access loss.
      const demotes = role !== undefined && role !== "ADMIN" && target.role === "ADMIN";
      if (demotes || (isActive !== undefined && !isActive)) {
        const reason = await getProtectionReason(target);
        if (reason) {
          return NextResponse.json({ error: reason }, { status: 403 });
        }
      }
    }

    const dataToUpdate: Record<string, unknown> = {};

    if (name !== undefined) dataToUpdate.name = name.trim();
    if (email !== undefined) dataToUpdate.email = email.trim().toLowerCase();
    if (phone !== undefined) dataToUpdate.phone = phone ? phone.trim() : null;
    if (role !== undefined) dataToUpdate.role = role === "ADMIN" ? "ADMIN" : "CUSTOMER";
    if (isActive !== undefined) dataToUpdate.isActive = Boolean(isActive);

    if (password && password.trim().length >= 6) {
      dataToUpdate.passwordHash = await bcrypt.hash(password.trim(), 10);
    }

    try {
      const updated = await prisma.user.update({
        where: { id: params.id },
        data: dataToUpdate,
        include: {
          _count: {
            select: { orders: { where: { deletedAt: null } } },
          },
        },
      });

      const formatted: AdminUserListItem = {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        phone: updated.phone || "-",
        role: updated.role as "ADMIN" | "CUSTOMER",
        isActive: updated.isActive,
        totalOrders: updated._count.orders,
        createdAt: updated.createdAt.toISOString(),
      };

      return NextResponse.json({ user: formatted, success: true });
    } catch (dbError) {
      console.error("[AdminUsersPUT] Database user update failed:", dbError);
      const code = (dbError as { code?: string }).code;
      if (code === "P2025") {
        return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
      }
      if (code === "P2002") {
        return NextResponse.json(
          { error: "Email sudah terdaftar. Gunakan email lain." },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: "Gagal menyimpan perubahan user ke database." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("PUT /api/admin/users/[id] error:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui user." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Safety: Prevent deleting primary admin account
    try {
      const targetUser = await prisma.user.findUnique({
        where: { id: params.id },
      });

      if (!targetUser || targetUser.deletedAt) {
        return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
      }

      const reason = await getProtectionReason(targetUser);
      if (reason) {
        return NextResponse.json({ error: reason }, { status: 403 });
      }

      await prisma.user.update({
        where: { id: params.id },
        data: {
          deletedAt: new Date(),
          isActive: false,
        },
      });

      return NextResponse.json({
        success: true,
        message: "User berhasil dihapus.",
      });
    } catch (dbError) {
      console.error("[AdminUsersDELETE] Database delete user failed:", dbError);
      return NextResponse.json(
        { error: "Gagal menghapus user dari database." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("DELETE /api/admin/users/[id] error:", error);
    return NextResponse.json(
      { error: "Gagal menghapus user." },
      { status: 500 }
    );
  }
}
