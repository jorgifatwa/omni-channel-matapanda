import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

function formatLabelDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = (searchParams.get("mode") || "daily") as "daily" | "monthly" | "yearly";
    const preset = searchParams.get("preset") || "30d";
    const yearParam = searchParams.get("year");
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    const now = new Date();
    const currentYear = now.getFullYear();
    const parsedYear = yearParam ? parseInt(yearParam, 10) : NaN;
    const selectedYear = Number.isFinite(parsedYear) ? parsedYear : currentYear;

    // Years that actually contain orders in the database (earliest order year .. current year)
    let firstOrderYear = currentYear;
    try {
      const firstOrder = await prisma.order.findFirst({
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      });
      if (firstOrder) firstOrderYear = Math.min(currentYear, firstOrder.createdAt.getFullYear());
    } catch (dbErr) {
      console.error("[AdminAnalyticsAPI] Database query failed:", dbErr);
      return NextResponse.json(
        { success: false, error: "Gagal memuat data analitik dari database" },
        { status: 503 }
      );
    }
    const availableYears: number[] = [];
    for (let y = firstOrderYear; y <= currentYear; y++) availableYears.push(y);

    let startDate: Date;
    let endDate: Date;
    let prevStartDate: Date;
    let prevEndDate: Date;
    let periodLabel = "";

    // Determine target and previous date ranges based on mode
    if (mode === "yearly") {
      // All years that contain orders, up to the current year
      startDate = new Date(firstOrderYear, 0, 1, 0, 0, 0, 0);
      endDate = new Date(currentYear, 11, 31, 23, 59, 59, 999);
      periodLabel =
        firstOrderYear === currentYear
          ? `Tahun ${currentYear}`
          : `Multi-Tahun (${firstOrderYear} - ${currentYear})`;

      // Comparison: previous year
      prevStartDate = new Date(currentYear - 1, 0, 1, 0, 0, 0, 0);
      prevEndDate = new Date(currentYear - 1, 11, 31, 23, 59, 59, 999);
    } else if (mode === "monthly") {
      // 1 Full year (Jan 1 to Dec 31)
      startDate = new Date(selectedYear, 0, 1, 0, 0, 0, 0);
      endDate = new Date(selectedYear, 11, 31, 23, 59, 59, 999);
      periodLabel = `Tahun ${selectedYear}`;

      // Comparison: Previous Year (selectedYear - 1)
      prevStartDate = new Date(selectedYear - 1, 0, 1, 0, 0, 0, 0);
      prevEndDate = new Date(selectedYear - 1, 11, 31, 23, 59, 59, 999);
    } else {
      // Daily Mode (relative to today)
      const today = startOfDay(now);
      if (preset === "today") {
        startDate = today;
        endDate = endOfDay(now);
        prevStartDate = addDays(today, -1);
        prevEndDate = endOfDay(prevStartDate);
        periodLabel = `Hari Ini (${formatLabelDate(today)})`;
      } else if (preset === "7d") {
        startDate = addDays(today, -6);
        endDate = endOfDay(now);
        prevStartDate = addDays(today, -13);
        prevEndDate = endOfDay(addDays(today, -7));
        periodLabel = `7 Hari Terakhir (${formatLabelDate(startDate)} - ${formatLabelDate(today)})`;
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
        // Default: last 30 days including today
        startDate = addDays(today, -29);
        endDate = endOfDay(now);
        prevStartDate = addDays(today, -59);
        prevEndDate = endOfDay(addDays(today, -30));
        periodLabel = `30 Hari Terakhir (${formatLabelDate(startDate)} - ${formatLabelDate(today)})`;
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

    let customerCount = 0;

    try {
      const dbOrders = await prisma.order.findMany({
        where: {
          deletedAt: null,
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
          deletedAt: null,
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
        where: { role: "CUSTOMER", deletedAt: null },
      });

      rawOrders = dbOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        totalAmount: Number(o.totalAmount),
        orderStatus: o.status,
        createdAt: o.createdAt,
        customerName: o.user?.name || "Customer",
        customerEmail: o.user?.email,
        courier: o.shipment?.courier || "-",
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
    } catch (dbErr) {
      console.error("[AdminAnalyticsAPI] Database query failed:", dbErr);
      return NextResponse.json(
        { success: false, error: "Gagal memuat data analitik dari database" },
        { status: 503 }
      );
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
      chartData = availableYears.map((y) => {
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
      isFromDatabase: true,
      availableYears,
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
        error: "Gagal memuat data analitik",
      },
      { status: 500 }
    );
  }
}
