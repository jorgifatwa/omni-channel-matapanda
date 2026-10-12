import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { INITIAL_ORDERS, INITIAL_PRODUCTS, INITIAL_CUSTOMERS } from "@/lib/admin-data";

export const dynamic = "force-dynamic";

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

// Helper to format Date to YYYY-MM-DD
function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Generate realistic deterministic mock orders across multi-years (2024, 2025, 2026) for resilient fallback
function getMultiYearFallbackOrders() {
  const orders: Array<{
    id: string;
    orderNumber: string;
    customerId: string;
    customerName: string;
    customerEmail: string;
    subtotal: number;
    shippingCost: number;
    totalAmount: number;
    orderStatus: "PENDING" | "PAID" | "SHIPPED" | "COMPLETED" | "CANCELLED";
    paymentStatus: "PENDING" | "SETTLEMENT" | "CANCEL" | "EXPIRE";
    courier: string;
    createdAt: Date;
    items: Array<{
      productId: string;
      productName: string;
      sku: string;
      unitPrice: number;
      quantity: number;
      subtotal: number;
    }>;
  }> = [];

  const customerPool = INITIAL_CUSTOMERS;
  const productPool = INITIAL_PRODUCTS;

  let orderIndex = 1;

  // Generate 2024 orders (approx 60 orders, lower revenue)
  for (let m = 0; m < 12; m++) {
    const ordersInMonth = 4 + (m % 3);
    for (let o = 0; o < ordersInMonth; o++) {
      const day = Math.min(28, 2 + o * 4 + (m % 4));
      const date = new Date(2024, m, day, 10 + (o % 8), (o * 17) % 60);
      const cust = customerPool[orderIndex % customerPool.length];
      const prod1 = productPool[(orderIndex + 0) % productPool.length];
      const prod2 = productPool[(orderIndex + 1) % productPool.length];
      const qty1 = 1 + (orderIndex % 2);
      const qty2 = orderIndex % 3 === 0 ? 1 : 0;
      const subtotal = prod1.price * qty1 + (qty2 ? prod2.price * qty2 : 0);
      const shipping = (orderIndex % 2 === 0 ? 15000 : 25000) + (orderIndex % 5 === 0 ? 300000 : 0);
      const status: "COMPLETED" | "SHIPPED" | "PAID" | "PENDING" | "CANCELLED" =
        orderIndex % 15 === 0 ? "CANCELLED" : "COMPLETED";

      const items = [
        {
          productId: prod1.id,
          productName: prod1.name,
          sku: prod1.sku,
          unitPrice: prod1.price,
          quantity: qty1,
          subtotal: prod1.price * qty1,
        },
      ];
      if (qty2) {
        items.push({
          productId: prod2.id,
          productName: prod2.name,
          sku: prod2.sku,
          unitPrice: prod2.price,
          quantity: qty2,
          subtotal: prod2.price * qty2,
        });
      }

      orders.push({
        id: `mock-2024-${orderIndex}`,
        orderNumber: `ZDC-2024${String(m + 1).padStart(2, "0")}${String(day).padStart(2, "0")}-${String(orderIndex).padStart(3, "0")}`,
        customerId: cust.id,
        customerName: cust.name,
        customerEmail: cust.email,
        subtotal,
        shippingCost: shipping,
        totalAmount: subtotal + shipping,
        orderStatus: status,
        paymentStatus: status === "CANCELLED" ? "CANCEL" : "SETTLEMENT",
        courier: shipping > 50000 ? "DHL" : "JNE",
        createdAt: date,
        items,
      });
      orderIndex++;
    }
  }

  // Generate 2025 orders (approx 80 orders, growing revenue)
  for (let m = 0; m < 12; m++) {
    const ordersInMonth = 6 + (m % 4) + (m >= 8 ? 2 : 0);
    for (let o = 0; o < ordersInMonth; o++) {
      const day = Math.min(28, 1 + o * 3 + (m % 3));
      const date = new Date(2025, m, day, 9 + (o % 10), (o * 19) % 60);
      const cust = customerPool[orderIndex % customerPool.length];
      const prod1 = productPool[(orderIndex + 2) % productPool.length];
      const prod2 = productPool[(orderIndex + 4) % productPool.length];
      const qty1 = 1 + (orderIndex % 3);
      const qty2 = orderIndex % 2 === 0 ? 1 : 0;
      const subtotal = prod1.price * qty1 + (qty2 ? prod2.price * qty2 : 0);
      const shipping = (orderIndex % 2 === 0 ? 15000 : 25000) + (orderIndex % 4 === 0 ? 350000 : 0);
      const status: "COMPLETED" | "SHIPPED" | "PAID" | "PENDING" | "CANCELLED" =
        orderIndex % 18 === 0 ? "CANCELLED" : "COMPLETED";

      const items = [
        {
          productId: prod1.id,
          productName: prod1.name,
          sku: prod1.sku,
          unitPrice: prod1.price,
          quantity: qty1,
          subtotal: prod1.price * qty1,
        },
      ];
      if (qty2) {
        items.push({
          productId: prod2.id,
          productName: prod2.name,
          sku: prod2.sku,
          unitPrice: prod2.price,
          quantity: qty2,
          subtotal: prod2.price * qty2,
        });
      }

      orders.push({
        id: `mock-2025-${orderIndex}`,
        orderNumber: `ZDC-2025${String(m + 1).padStart(2, "0")}${String(day).padStart(2, "0")}-${String(orderIndex).padStart(3, "0")}`,
        customerId: cust.id,
        customerName: cust.name,
        customerEmail: cust.email,
        subtotal,
        shippingCost: shipping,
        totalAmount: subtotal + shipping,
        orderStatus: status,
        paymentStatus: status === "CANCELLED" ? "CANCEL" : "SETTLEMENT",
        courier: shipping > 50000 ? "DHL" : "JNE",
        createdAt: date,
        items,
      });
      orderIndex++;
    }
  }

  // Generate 2026 orders (Jan - Sep 2026, highest peak in Sep)
  for (let m = 0; m < 9; m++) {
    const ordersInMonth = m === 8 ? 32 : 8 + (m % 3);
    for (let o = 0; o < ordersInMonth; o++) {
      const day = m === 8 ? (o % 30) + 1 : Math.min(28, 1 + o * 3);
      const date = new Date(2026, m, day, 8 + (o % 12), (o * 13) % 60);
      const cust = customerPool[orderIndex % customerPool.length];
      const prod1 = productPool[(orderIndex + 1) % productPool.length];
      const prod2 = productPool[(orderIndex + 3) % productPool.length];
      const qty1 = 1 + (orderIndex % 2);
      const qty2 = orderIndex % 2 === 0 ? 1 : 0;
      const subtotal = prod1.price * qty1 + (qty2 ? prod2.price * qty2 : 0);
      const shipping = (orderIndex % 2 === 0 ? 15000 : 22000) + (orderIndex % 4 === 0 ? 380000 : 0);
      
      let status: "COMPLETED" | "SHIPPED" | "PAID" | "PENDING" | "CANCELLED" = "COMPLETED";
      if (m === 8 && day >= 28) {
        status = o % 4 === 0 ? "PENDING" : o % 3 === 0 ? "PAID" : "SHIPPED";
      } else if (orderIndex % 20 === 0) {
        status = "CANCELLED";
      }

      const items = [
        {
          productId: prod1.id,
          productName: prod1.name,
          sku: prod1.sku,
          unitPrice: prod1.price,
          quantity: qty1,
          subtotal: prod1.price * qty1,
        },
      ];
      if (qty2) {
        items.push({
          productId: prod2.id,
          productName: prod2.name,
          sku: prod2.sku,
          unitPrice: prod2.price,
          quantity: qty2,
          subtotal: prod2.price * qty2,
        });
      }

      orders.push({
        id: `mock-2026-${orderIndex}`,
        orderNumber: `ZDC-2026${String(m + 1).padStart(2, "0")}${String(day).padStart(2, "0")}-${String(orderIndex).padStart(3, "0")}`,
        customerId: cust.id,
        customerName: cust.name,
        customerEmail: cust.email,
        subtotal,
        shippingCost: shipping,
        totalAmount: subtotal + shipping,
        orderStatus: status,
        paymentStatus: status === "CANCELLED" ? "CANCEL" : status === "PENDING" ? "PENDING" : "SETTLEMENT",
        courier: shipping > 50000 ? "DHL" : "JNE",
        createdAt: date,
        items,
      });
      orderIndex++;
    }
  }

  // Include INITIAL_ORDERS from memory
  INITIAL_ORDERS.forEach((io) => {
    orders.push({
      id: io.id,
      orderNumber: io.orderNumber,
      customerId: io.customerId,
      customerName: io.customerName,
      customerEmail: io.customerEmail,
      subtotal: io.subtotal,
      shippingCost: io.shippingCost,
      totalAmount: io.totalAmount,
      orderStatus: io.orderStatus,
      paymentStatus: io.paymentStatus,
      courier: io.courier,
      createdAt: new Date(io.createdAt),
      items: io.items.map((it) => ({
        productId: it.productId,
        productName: it.productName,
        sku: it.sku,
        unitPrice: it.unitPrice,
        quantity: it.quantity,
        subtotal: it.subtotal,
      })),
    });
  });

  return orders;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = (searchParams.get("mode") || "daily") as "daily" | "monthly" | "yearly";
    const preset = searchParams.get("preset") || "30d";
    const yearParam = searchParams.get("year");
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    const selectedYear = yearParam ? parseInt(yearParam, 10) : 2026;

    let startDate: Date;
    let endDate: Date;
    let prevStartDate: Date;
    let prevEndDate: Date;
    let periodLabel = "";

    // Determine target and previous date ranges based on mode
    if (mode === "yearly") {
      // All years from 2024 to current
      startDate = new Date(2024, 0, 1, 0, 0, 0, 0);
      endDate = new Date(2026, 11, 31, 23, 59, 59, 999);
      periodLabel = "Multi-Tahun (2024 - 2026)";

      // Comparison: 2026 vs 2025
      prevStartDate = new Date(2025, 0, 1, 0, 0, 0, 0);
      prevEndDate = new Date(2025, 11, 31, 23, 59, 59, 999);
    } else if (mode === "monthly") {
      // 1 Full year (Jan 1 to Dec 31)
      startDate = new Date(selectedYear, 0, 1, 0, 0, 0, 0);
      endDate = new Date(selectedYear, 11, 31, 23, 59, 59, 999);
      periodLabel = `Tahun ${selectedYear}`;

      // Comparison: Previous Year (selectedYear - 1)
      prevStartDate = new Date(selectedYear - 1, 0, 1, 0, 0, 0, 0);
      prevEndDate = new Date(selectedYear - 1, 11, 31, 23, 59, 59, 999);
    } else {
      // Daily Mode
      if (preset === "today") {
        startDate = new Date(2026, 8, 30, 0, 0, 0, 0);
        endDate = new Date(2026, 8, 30, 23, 59, 59, 999);
        prevStartDate = new Date(2026, 8, 29, 0, 0, 0, 0);
        prevEndDate = new Date(2026, 8, 29, 23, 59, 59, 999);
        periodLabel = "Hari Ini (30 Sep 2026)";
      } else if (preset === "7d") {
        startDate = new Date(2026, 8, 24, 0, 0, 0, 0);
        endDate = new Date(2026, 8, 30, 23, 59, 59, 999);
        prevStartDate = new Date(2026, 8, 17, 0, 0, 0, 0);
        prevEndDate = new Date(2026, 8, 23, 23, 59, 59, 999);
        periodLabel = "7 Hari Terakhir (24 - 30 Sep 2026)";
      } else if (preset === "custom" && startDateParam && endDateParam) {
        const [sY, sM, sD] = startDateParam.split("-").map(Number);
        const [eY, eM, eD] = endDateParam.split("-").map(Number);
        startDate = new Date(sY, sM - 1, sD, 0, 0, 0, 0);
        endDate = new Date(eY, eM - 1, eD, 23, 59, 59, 999);

        const durationDays = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
        prevEndDate = new Date(startDate.getTime() - 1);
        prevStartDate = new Date(prevEndDate.getTime() - durationDays * 24 * 60 * 60 * 1000);
        periodLabel = `${formatDate(startDate)} s/d ${formatDate(endDate)}`;
      } else {
        // 30 Days (Default: 1 Sep 2026 - 30 Sep 2026)
        startDate = new Date(2026, 8, 1, 0, 0, 0, 0);
        endDate = new Date(2026, 8, 30, 23, 59, 59, 999);
        prevStartDate = new Date(2026, 7, 2, 0, 0, 0, 0);
        prevEndDate = new Date(2026, 7, 31, 23, 59, 59, 999);
        periodLabel = "30 Hari Terakhir (01 - 30 Sep 2026)";
      }
    }

    let rawOrders: Array<{
      id: string;
      orderNumber: string;
      totalAmount: number;
      orderStatus: string;
      createdAt: Date;
      customerName: string;
      customerEmail?: string;
      courier: string;
      items: Array<{
        productId: string;
        productName: string;
        sku: string;
        quantity: number;
        subtotal: number;
      }>;
    }> = [];

    let prevRawOrders: Array<{
      totalAmount: number;
      orderStatus: string;
    }> = [];

    let customerCount = 5;
    let isFromDatabase = false;

    try {
      // Attempt Prisma query with timeout
      const dbOrders = await prisma.order.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          user: true,
          items: true,
          shipment: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      const prevDbOrders = await prisma.order.findMany({
        where: {
          createdAt: {
            gte: prevStartDate,
            lte: prevEndDate,
          },
        },
        select: {
          totalAmount: true,
          status: true,
        },
      });

      customerCount = await prisma.user.count({
        where: { role: "CUSTOMER" },
      });

      rawOrders = dbOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        totalAmount: Number(o.totalAmount),
        orderStatus: o.status,
        createdAt: o.createdAt,
        customerName: o.user?.name || "Customer",
        customerEmail: o.user?.email,
        courier: o.shipment?.courier || "JNE",
        items: o.items.map((i) => ({
          productId: i.productId,
          productName: i.productName,
          sku: i.sku,
          quantity: i.quantity,
          subtotal: Number(i.subtotal),
        })),
      }));

      prevRawOrders = prevDbOrders.map((o) => ({
        totalAmount: Number(o.totalAmount),
        orderStatus: o.status,
      }));

      isFromDatabase = true;
    } catch {
      // Fallback if local DB is unreachable
      const allFallbackOrders = getMultiYearFallbackOrders();

      rawOrders = allFallbackOrders
        .filter((o) => o.createdAt >= startDate && o.createdAt <= endDate)
        .map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          totalAmount: o.totalAmount,
          orderStatus: o.orderStatus,
          createdAt: o.createdAt,
          customerName: o.customerName,
          customerEmail: o.customerEmail,
          courier: o.courier,
          items: o.items,
        }));

      prevRawOrders = allFallbackOrders
        .filter((o) => o.createdAt >= prevStartDate && o.createdAt <= prevEndDate)
        .map((o) => ({
          totalAmount: o.totalAmount,
          orderStatus: o.orderStatus,
        }));

      customerCount = INITIAL_CUSTOMERS.length;
    }

    // KPI Aggregations
    const validOrders = rawOrders.filter((o) => o.orderStatus !== "CANCELLED");
    const totalRevenue = validOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalOrders = rawOrders.length;

    const statusCounts = {
      PENDING: rawOrders.filter((o) => o.orderStatus === "PENDING").length,
      PAID: rawOrders.filter((o) => o.orderStatus === "PAID").length,
      SHIPPED: rawOrders.filter((o) => o.orderStatus === "SHIPPED").length,
      COMPLETED: rawOrders.filter((o) => o.orderStatus === "COMPLETED").length,
      CANCELLED: rawOrders.filter((o) => o.orderStatus === "CANCELLED").length,
    };

    // Previous period stats for growth rate comparison
    const prevValidOrders = prevRawOrders.filter((o) => o.orderStatus !== "CANCELLED");
    const prevRevenue = prevValidOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const prevOrdersCount = prevRawOrders.length;

    const growthRevenue =
      prevRevenue > 0
        ? ((totalRevenue - prevRevenue) / prevRevenue) * 100
        : totalRevenue > 0
        ? 100
        : 0;

    const growthOrders =
      prevOrdersCount > 0
        ? ((totalOrders - prevOrdersCount) / prevOrdersCount) * 100
        : totalOrders > 0
        ? 100
        : 0;

    // Top 5 Best-Selling Products in this period
    const productStatsMap = new Map<
      string,
      { id: string; name: string; sku: string; sold: number; revenue: number }
    >();

    rawOrders.forEach((o) => {
      if (o.orderStatus !== "CANCELLED") {
        o.items.forEach((it) => {
          const key = it.sku || it.productName;
          const current = productStatsMap.get(key) || {
            id: it.productId,
            name: it.productName,
            sku: it.sku,
            sold: 0,
            revenue: 0,
          };
          current.sold += it.quantity;
          current.revenue += it.subtotal;
          productStatsMap.set(key, current);
        });
      }
    });

    const topProducts = Array.from(productStatsMap.values())
      .sort((a, b) => b.sold - a.sold || b.revenue - a.revenue)
      .slice(0, 5);

    // Latest 5 Orders
    const latestOrders = rawOrders
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5)
      .map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        customerEmail: o.customerEmail,
        createdAt: formatDate(o.createdAt),
        courier: o.courier,
        orderStatus: o.orderStatus,
        totalAmount: o.totalAmount,
      }));

    // Chart Series Data
    let chartData: Array<{
      date: string;
      fullDate?: string;
      revenue: number;
      orders: number;
    }> = [];

    if (mode === "yearly") {
      // 2024, 2025, 2026
      const years = [2024, 2025, 2026];
      chartData = years.map((y) => {
        const yearOrders = rawOrders.filter(
          (o) => o.createdAt.getFullYear() === y && o.orderStatus !== "CANCELLED"
        );
        const rev = yearOrders.reduce((sum, o) => sum + o.totalAmount, 0);
        return {
          date: String(y),
          revenue: rev,
          orders: yearOrders.length,
        };
      });
    } else if (mode === "monthly") {
      // 12 Months
      chartData = MONTH_NAMES.map((mName, mIdx) => {
        const monthOrders = rawOrders.filter(
          (o) =>
            o.createdAt.getFullYear() === selectedYear &&
            o.createdAt.getMonth() === mIdx &&
            o.orderStatus !== "CANCELLED"
        );
        const rev = monthOrders.reduce((sum, o) => sum + o.totalAmount, 0);
        return {
          date: mName,
          revenue: rev,
          orders: monthOrders.length,
        };
      });
    } else {
      // Daily mode: group by day
      const dayMap = new Map<string, { revenue: number; orders: number }>();
      const current = new Date(startDate);

      while (current <= endDate) {
        const key = formatDate(current);
        dayMap.set(key, { revenue: 0, orders: 0 });
        current.setDate(current.getDate() + 1);
      }

      rawOrders.forEach((o) => {
        const key = formatDate(o.createdAt);
        if (dayMap.has(key) && o.orderStatus !== "CANCELLED") {
          const entry = dayMap.get(key)!;
          entry.revenue += o.totalAmount;
          entry.orders += 1;
        }
      });

      chartData = Array.from(dayMap.entries()).map(([dateStr, val]) => {
        const [, m, d] = dateStr.split("-").map(Number);
        const label = `${d} ${MONTH_NAMES[m - 1]}`;
        return {
          date: label,
          fullDate: dateStr,
          revenue: val.revenue,
          orders: val.orders,
        };
      });
    }

    return NextResponse.json({
      success: true,
      mode,
      preset,
      selectedYear,
      periodLabel,
      isFromDatabase,
      availableYears: [2024, 2025, 2026],
      kpis: {
        totalRevenue,
        totalOrders,
        completedOrders: statusCounts.COMPLETED,
        paidOrders: statusCounts.PAID,
        shippedOrders: statusCounts.SHIPPED,
        pendingOrders: statusCounts.PENDING,
        cancelledOrders: statusCounts.CANCELLED,
        growthRevenue: Number(growthRevenue.toFixed(1)),
        growthOrders: Number(growthOrders.toFixed(1)),
        activeCustomers: customerCount,
      },
      statusBreakdown: statusCounts,
      chartData,
      topProducts,
      latestOrders,
    });
  } catch (error) {
    console.error("Analytics API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
