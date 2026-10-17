import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { INITIAL_CUSTOMERS, type AdminCustomer } from "@/lib/admin-data";

export async function GET() {
  try {
    const dbCustomers = await prisma.user.findMany({
      where: {
        role: "CUSTOMER",
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
      include: {
        addresses: {
          orderBy: { isDefault: "desc" },
          take: 1,
        },
        orders: {
          where: { deletedAt: null },
          include: { payment: true },
        },
      },
    });

    if (dbCustomers && dbCustomers.length > 0) {
      const formatted: AdminCustomer[] = dbCustomers.map((u) => {
        const primaryAddress = u.addresses[0];
        const totalOrders = u.orders.length;
        const totalSpent = u.orders.reduce((sum, ord) => sum + Number(ord.totalAmount), 0);

        return {
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone || primaryAddress?.phone || "-",
          city: primaryAddress?.city || "Jakarta",
          country: primaryAddress?.country || "Indonesia",
          totalOrders,
          totalSpent,
          registeredAt: u.createdAt.toISOString().slice(0, 10),
        };
      });

      return NextResponse.json({ customers: formatted, source: "database" });
    }
  } catch (err) {
    console.warn("[AdminCustomersAPI] Failed to fetch customers from database:", err);
  }

  return NextResponse.json({ customers: INITIAL_CUSTOMERS, source: "defaults" });
}
