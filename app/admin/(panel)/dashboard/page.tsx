"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DollarSign,
  ShoppingBag,
  Clock,
  CheckCircle2,
  Users,
  Calendar,
  BarChart3,
  LineChart as LineChartIcon,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Download,
  CalendarDays,
  Sparkles,
  RefreshCw,
  XCircle,
  PackageCheck,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAdminStore } from "@/context/AdminStoreContext";
import { formatIDR } from "@/lib/products";
import { generateDashboardPDF, type PDFExportData } from "@/lib/pdf-export";

type ViewMode = "daily" | "monthly" | "yearly";
type DailyPreset = "today" | "7d" | "30d" | "custom";

interface AnalyticsResponse {
  success: boolean;
  mode: ViewMode;
  preset: DailyPreset;
  selectedYear: number;
  periodLabel: string;
  isFromDatabase: boolean;
  availableYears: number[];
  kpis: {
    totalRevenue: number;
    totalOrders: number;
    completedOrders: number;
    paidOrders: number;
    shippedOrders: number;
    pendingOrders: number;
    cancelledOrders: number;
    growthRevenue: number;
    growthOrders: number;
    activeCustomers: number;
  };
  statusBreakdown: {
    PENDING: number;
    PAID: number;
    SHIPPED: number;
    COMPLETED: number;
    CANCELLED: number;
  };
  chartData: Array<{
    date: string;
    fullDate?: string;
    revenue: number;
    orders: number;
  }>;
  topProducts: Array<{
    id: string;
    name: string;
    sku: string;
    sold: number;
    revenue: number;
  }>;
  latestOrders: Array<{
    id: string;
    orderNumber: string;
    customerName: string;
    customerEmail?: string;
    createdAt: string;
    courier: string;
    orderStatus: string;
    totalAmount: number;
  }>;
}

function getOrderStatusBadge(status: string) {
  switch (status) {
    case "COMPLETED":
      return <Badge variant="success">completed</Badge>;
    case "SHIPPED":
      return <Badge variant="info">shipped</Badge>;
    case "PAID":
      return <Badge variant="default">paid</Badge>;
    case "CANCELLED":
      return <Badge variant="destructive">cancelled</Badge>;
    case "PENDING":
    default:
      return <Badge variant="warning">pending</Badge>;
  }
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { products } = useAdminStore();

  // Mode and Filter states
  const initialMode = (searchParams.get("mode") as ViewMode) || "daily";
  const initialPreset = (searchParams.get("preset") as DailyPreset) || "30d";
  const initialYear = Number(searchParams.get("year")) || 2026;
  const initialStartDate = searchParams.get("startDate") || "2026-09-01";
  const initialEndDate = searchParams.get("endDate") || "2026-09-30";

  const [mode, setMode] = React.useState<ViewMode>(initialMode);
  const [dailyPreset, setDailyPreset] = React.useState<DailyPreset>(initialPreset);
  const [selectedYear, setSelectedYear] = React.useState<number>(initialYear);
  const [startDate, setStartDate] = React.useState<string>(initialStartDate);
  const [endDate, setEndDate] = React.useState<string>(initialEndDate);

  const [chartType, setChartType] = React.useState<"bar" | "line">("bar");
  const [isDarkMode, setIsDarkMode] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isExporting, setIsExporting] = React.useState(false);

  const [analyticsData, setAnalyticsData] = React.useState<AnalyticsResponse | null>(null);

  // Sync dark mode state with HTML class
  React.useEffect(() => {
    const updateTheme = () => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    };

    updateTheme();

    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  // Fetch analytics from API with query params
  const fetchAnalytics = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("mode", mode);
      if (mode === "daily") {
        params.set("preset", dailyPreset);
        if (dailyPreset === "custom") {
          params.set("startDate", startDate);
          params.set("endDate", endDate);
        }
      } else if (mode === "monthly") {
        params.set("year", String(selectedYear));
      }

      const res = await fetch(`/api/admin/analytics?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch analytics");
      const data: AnalyticsResponse = await res.json();
      setAnalyticsData(data);
    } catch (err) {
      console.error("Error fetching analytics data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [mode, dailyPreset, selectedYear, startDate, endDate]);

  // Sync state to URL search parameters
  React.useEffect(() => {
    const params = new URLSearchParams();
    params.set("mode", mode);
    if (mode === "daily") {
      params.set("preset", dailyPreset);
      if (dailyPreset === "custom") {
        params.set("startDate", startDate);
        params.set("endDate", endDate);
      }
    } else if (mode === "monthly") {
      params.set("year", String(selectedYear));
    }

    const query = params.toString();
    const currentQuery = searchParams.toString();
    if (query !== currentQuery) {
      router.replace(`/admin/dashboard?${query}`, { scroll: false });
    }

    fetchAnalytics();
  }, [mode, dailyPreset, selectedYear, startDate, endDate, fetchAnalytics, router, searchParams]);

  // Low stock inventory calculation
  const lowStockItems = React.useMemo(() => {
    const items: {
      productId: string;
      productName: string;
      variantId?: string;
      size?: string;
      color?: string;
      stock: number;
      threshold: number;
      sku: string;
    }[] = [];

    products.forEach((p) => {
      const threshold = p.lowStockThreshold ?? 5;
      if (p.variants && p.variants.length > 0) {
        p.variants.forEach((v) => {
          const vThreshold = v.lowStockThreshold ?? threshold;
          if (v.stock <= vThreshold) {
            items.push({
              productId: p.id,
              productName: p.name,
              variantId: v.id,
              size: v.size,
              color: v.color,
              stock: v.stock,
              threshold: vThreshold,
              sku: v.sku || p.sku,
            });
          }
        });
      } else if (p.stock <= threshold) {
        items.push({
          productId: p.id,
          productName: p.name,
          stock: p.stock,
          threshold,
          sku: p.sku,
        });
      }
    });

    return items.sort((a, b) => a.stock - b.stock);
  }, [products]);

  // Handle PDF Export
  const handleExportPDF = () => {
    if (!analyticsData) return;
    setIsExporting(true);
    try {
      const exportPayload: PDFExportData = {
        periodMode: mode,
        periodLabel: analyticsData.periodLabel,
        adminName: "Admin it's matapanda",
        kpis: {
          totalRevenue: analyticsData.kpis.totalRevenue,
          totalOrders: analyticsData.kpis.totalOrders,
          completedOrders: analyticsData.kpis.completedOrders,
          paidOrders: analyticsData.kpis.paidOrders,
          shippedOrders: analyticsData.kpis.shippedOrders,
          pendingOrders: analyticsData.kpis.pendingOrders,
          cancelledOrders: analyticsData.kpis.cancelledOrders,
          growthRevenue: analyticsData.kpis.growthRevenue,
          growthOrders: analyticsData.kpis.growthOrders,
          activeCustomers: analyticsData.kpis.activeCustomers,
        },
        breakdown: analyticsData.chartData.map((d) => ({
          label: d.fullDate ? `${d.date} (${d.fullDate})` : d.date,
          orders: d.orders,
          revenue: d.revenue,
        })),
        topProducts: analyticsData.topProducts.map((p, idx) => ({
          rank: idx + 1,
          name: p.name,
          sku: p.sku,
          sold: p.sold,
          revenue: p.revenue,
        })),
        recentOrders: analyticsData.latestOrders.map((o) => ({
          orderNumber: o.orderNumber,
          customerName: o.customerName,
          date: o.createdAt,
          status: o.orderStatus,
          total: o.totalAmount,
        })),
      };

      generateDashboardPDF(exportPayload);
    } catch (err) {
      console.error("Failed to generate PDF:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const kpis = analyticsData?.kpis || {
    totalRevenue: 0,
    totalOrders: 0,
    completedOrders: 0,
    paidOrders: 0,
    shippedOrders: 0,
    pendingOrders: 0,
    cancelledOrders: 0,
    growthRevenue: 0,
    growthOrders: 0,
    activeCustomers: 0,
  };

  const statusBreakdown = analyticsData?.statusBreakdown || {
    PENDING: 0,
    PAID: 0,
    SHIPPED: 0,
    COMPLETED: 0,
    CANCELLED: 0,
  };

  const chartData = analyticsData?.chartData || [];
  const topProducts = analyticsData?.topProducts || [];
  const latestOrders = analyticsData?.latestOrders || [];

  return (
    <div className="space-y-6">
      {/* Top Header & Export Action */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            {analyticsData?.isFromDatabase && (
              <Badge variant="outline" className="text-[10px] gap-1 font-mono">
                <Sparkles className="h-3 w-3 text-emerald-500" />
                Live DB
              </Badge>
            )}
          </div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Ringkasan performa penjualan, analitik periode, dan laporan transaksi it&apos;s matapanda.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            disabled={isExporting || isLoading}
            className="h-9 text-xs font-semibold gap-2 border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            {isExporting ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            <span>{isExporting ? "Menyiapkan PDF..." : "Export Laporan PDF"}</span>
          </Button>
        </div>
      </div>

      {/* Main Period Mode Tabs & Date Pickers */}
      <Card className="border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40">
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            {/* 3 View Mode Toggle Buttons */}
            <div className="flex items-center">
              <div className="inline-flex rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-1 shadow-sm">
                {(
                  [
                    { key: "daily", label: "Harian" },
                    { key: "monthly", label: "Bulanan" },
                    { key: "yearly", label: "Tahunan" },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setMode(item.key)}
                    className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                      mode === item.key
                        ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm"
                        : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Active Period Label Display */}
            <div className="flex items-center gap-2 text-xs font-medium text-neutral-600 dark:text-neutral-300 bg-white dark:bg-neutral-900 px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 self-start md:self-auto">
              <CalendarDays className="h-3.5 w-3.5 text-neutral-500" />
              <span>
                Periode:{" "}
                <strong className="text-neutral-900 dark:text-white">
                  {analyticsData?.periodLabel || "Memuat..."}
                </strong>
              </span>
            </div>
          </div>

          {/* Sub-Filters per Mode */}
          {mode === "daily" && (
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-neutral-200/60 dark:border-neutral-800/60">
              <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mr-1">
                Filter Harian:
              </span>
              {(
                [
                  { key: "today", label: "Hari Ini" },
                  { key: "7d", label: "7 Hari Terakhir" },
                  { key: "30d", label: "30 Hari Terakhir" },
                  { key: "custom", label: "Kustom Tanggal" },
                ] as const
              ).map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => setDailyPreset(preset.key)}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                    dailyPreset === preset.key
                      ? "bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900 dark:border-white font-semibold"
                      : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300 dark:bg-neutral-900 dark:text-neutral-400 dark:border-neutral-800 dark:hover:text-neutral-200 dark:hover:border-neutral-700"
                  }`}
                >
                  {preset.label}
                </button>
              ))}

              {/* Custom Date Range Picker */}
              {dailyPreset === "custom" && (
                <div className="flex items-center gap-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-1 text-xs shadow-sm ml-auto">
                  <Calendar className="h-3.5 w-3.5 text-neutral-500" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-transparent focus:outline-none text-xs text-neutral-900 dark:text-neutral-100 [color-scheme:light] dark:[color-scheme:dark]"
                  />
                  <span className="text-neutral-400">s/d</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-transparent focus:outline-none text-xs text-neutral-900 dark:text-neutral-100 [color-scheme:light] dark:[color-scheme:dark]"
                  />
                </div>
              )}
            </div>
          )}

          {mode === "monthly" && (
            <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-neutral-200/60 dark:border-neutral-800/60">
              <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                Pilih Tahun Kalender:
              </span>
              <div className="flex items-center gap-1.5">
                {[2024, 2025, 2026].map((year) => (
                  <button
                    key={year}
                    type="button"
                    onClick={() => setSelectedYear(year)}
                    className={`px-3.5 py-1 text-xs rounded-lg border transition-all ${
                      selectedYear === year
                        ? "bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900 dark:border-white font-bold shadow-sm"
                        : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-100 dark:bg-neutral-900 dark:text-neutral-300 dark:border-neutral-800 dark:hover:bg-neutral-800 dark:hover:text-white"
                    }`}
                  >
                    Tahun {year}
                  </button>
                ))}
              </div>
              <span className="text-xs text-neutral-500 dark:text-neutral-400 hidden sm:inline">
                (Menampilkan rincian pendapatan 12 bulan dari Jan s/d Des)
              </span>
            </div>
          )}

          {mode === "yearly" && (
            <div className="flex items-center gap-2 pt-1 border-t border-neutral-200/60 dark:border-neutral-800/60 text-xs text-neutral-600 dark:text-neutral-400">
              <span className="font-semibold text-neutral-900 dark:text-white">
                Analitik Multi-Tahun:
              </span>
              <span>
                Menampilkan perbandingan performa tahunan dari 2024, 2025 hingga 2026.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {/* Total Revenue */}
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
              Total Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-neutral-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-7 w-32 bg-neutral-200 dark:bg-neutral-800 animate-pulse rounded my-1" />
            ) : (
              <div className="text-xl font-bold tracking-tight">
                {formatIDR(kpis.totalRevenue)}
              </div>
            )}
            <div className="flex items-center gap-1.5 mt-1 text-xs">
              {kpis.growthRevenue >= 0 ? (
                <span className="flex items-center text-emerald-600 dark:text-emerald-400 font-semibold">
                  <TrendingUp className="h-3 w-3 mr-0.5" />
                  +{kpis.growthRevenue}%
                </span>
              ) : (
                <span className="flex items-center text-rose-600 dark:text-rose-400 font-semibold">
                  <TrendingDown className="h-3 w-3 mr-0.5" />
                  {kpis.growthRevenue}%
                </span>
              )}
              <span className="text-[11px] text-neutral-500 truncate">
                vs periode sebelumnya
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Total Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
              Total Order Masuk
            </CardTitle>
            <ShoppingBag className="h-4 w-4 text-neutral-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-7 w-20 bg-neutral-200 dark:bg-neutral-800 animate-pulse rounded my-1" />
            ) : (
              <div className="text-2xl font-bold">{kpis.totalOrders}</div>
            )}
            <div className="flex items-center gap-1.5 mt-1 text-xs">
              {kpis.growthOrders >= 0 ? (
                <span className="flex items-center text-emerald-600 dark:text-emerald-400 font-semibold">
                  <TrendingUp className="h-3 w-3 mr-0.5" />
                  +{kpis.growthOrders}%
                </span>
              ) : (
                <span className="flex items-center text-rose-600 dark:text-rose-400 font-semibold">
                  <TrendingDown className="h-3 w-3 mr-0.5" />
                  {kpis.growthOrders}%
                </span>
              )}
              <span className="text-[11px] text-neutral-500 truncate">
                pertumbuhan transaksi
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Pending Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
              Order Pending
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-7 w-16 bg-neutral-200 dark:bg-neutral-800 animate-pulse rounded my-1" />
            ) : (
              <div className="text-2xl font-bold">{kpis.pendingOrders}</div>
            )}
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              Menunggu bayar / konfirmasi
            </p>
          </CardContent>
        </Card>

        {/* Completed & Shipped Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
              Order Selesai &amp; Kirim
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-7 w-16 bg-neutral-200 dark:bg-neutral-800 animate-pulse rounded my-1" />
            ) : (
              <div className="text-2xl font-bold">
                {kpis.completedOrders + kpis.shippedOrders}
              </div>
            )}
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
              {kpis.completedOrders} selesai, {kpis.shippedOrders} transit
            </p>
          </CardContent>
        </Card>

        {/* Registered Customers */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
              Pelanggan Terdaftar
            </CardTitle>
            <Users className="h-4 w-4 text-neutral-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-7 w-16 bg-neutral-200 dark:bg-neutral-800 animate-pulse rounded my-1" />
            ) : (
              <div className="text-2xl font-bold">{kpis.activeCustomers}</div>
            )}
            <p className="text-xs text-neutral-500 mt-1">
              Total akun terdaftar di sistem
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Order Status Breakdown Badges Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="flex items-center justify-between p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500" />
            <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
              Pending
            </span>
          </div>
          <span className="font-bold text-sm">{statusBreakdown.PENDING}</span>
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <div className="flex items-center gap-2">
            <PackageCheck className="h-4 w-4 text-blue-500" />
            <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
              Paid (Lunas)
            </span>
          </div>
          <span className="font-bold text-sm">{statusBreakdown.PAID}</span>
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-indigo-500" />
            <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
              Shipped (Kirim)
            </span>
          </div>
          <span className="font-bold text-sm">{statusBreakdown.SHIPPED}</span>
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
              Completed
            </span>
          </div>
          <span className="font-bold text-sm">{statusBreakdown.COMPLETED}</span>
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 col-span-2 sm:col-span-1">
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-rose-500" />
            <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
              Cancelled
            </span>
          </div>
          <span className="font-bold text-sm">{statusBreakdown.CANCELLED}</span>
        </div>
      </div>

      {/* Low Stock & Out of Stock Notification Alert Card */}
      <Card
        className={`border-l-4 ${
          lowStockItems.length > 0
            ? "border-l-amber-500 bg-amber-50/20 dark:bg-amber-950/10"
            : "border-l-emerald-500"
        }`}
      >
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-lg shrink-0 ${
                lowStockItems.length > 0
                  ? "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-300"
                  : "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-300"
              }`}
            >
              {lowStockItems.length > 0 ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
            </div>
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2 flex-wrap">
                <span>Pemberitahuan Stok Produk &amp; Varian</span>
                {lowStockItems.length > 0 ? (
                  <Badge variant="warning" className="text-xs">
                    {lowStockItems.length} Varian Perlu Restok
                  </Badge>
                ) : (
                  <Badge variant="success" className="text-xs">
                    Semua Stok Aman
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Monitoring sisa stok produk dan varian &le; ambang batas (low stock threshold).
              </CardDescription>
            </div>
          </div>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5 shrink-0"
          >
            <Link href="/admin/products">
              <span>Kelola di Master Produk</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {lowStockItems.length === 0 ? (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 py-1 font-medium">
              ✓ Semua stok produk dan varian saat ini dalam kondisi aman di atas batas threshold.
            </p>
          ) : (
            <div className="rounded-md border border-neutral-200 dark:border-neutral-800 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">No</TableHead>
                    <TableHead>Nama Produk</TableHead>
                    <TableHead>Varian (Size / Warna)</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Sisa Stok</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStockItems.slice(0, 5).map((item, idx) => {
                    const isZero = item.stock === 0;
                    return (
                      <TableRow key={`${item.productId}-${item.variantId || idx}`}>
                        <TableCell className="font-medium text-xs">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="text-xs font-semibold">
                          {item.productName}
                        </TableCell>
                        <TableCell className="text-xs text-neutral-600 dark:text-neutral-400">
                          {item.size
                            ? `Size ${item.size} • ${item.color}`
                            : "Standar"}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-neutral-500">
                          {item.sku}
                        </TableCell>
                        <TableCell className="text-xs font-bold">
                          <span
                            className={
                              isZero ? "text-red-600" : "text-amber-600"
                            }
                          >
                            {item.stock} pcs
                          </span>{" "}
                          <span className="text-[10px] text-neutral-400 font-normal">
                            (Batas: {item.threshold})
                          </span>
                        </TableCell>
                        <TableCell>
                          {isZero ? (
                            <Badge
                              variant="destructive"
                              className="text-[10px] py-0 px-1.5"
                            >
                              Habis (0 pcs)
                            </Badge>
                          ) : (
                            <Badge
                              variant="warning"
                              className="text-[10px] py-0 px-1.5"
                            >
                              Menipis ({item.stock} pcs)
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs px-2.5"
                          >
                            <Link href="/admin/products">Edit Produk</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dynamic Sales Chart (Recharts) */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <span>Grafik Pendapatan Penjualan</span>
              <Badge variant="outline" className="text-xs capitalize font-normal">
                Mode {mode === "daily" ? "Harian" : mode === "monthly" ? "Bulanan" : "Tahunan"}
              </Badge>
            </CardTitle>
            <CardDescription>
              Tren pendapatan ({formatIDR(kpis.totalRevenue)}) pada {analyticsData?.periodLabel || "periode terpilih"}.
            </CardDescription>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant={chartType === "bar" ? "default" : "outline"}
              size="sm"
              onClick={() => setChartType("bar")}
              className="h-8 text-xs gap-1.5"
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Bar
            </Button>
            <Button
              type="button"
              variant={chartType === "line" ? "default" : "outline"}
              size="sm"
              onClick={() => setChartType("line")}
              className="h-8 text-xs gap-1.5"
            >
              <LineChartIcon className="h-3.5 w-3.5" />
              Line
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[320px] w-full">
            {isLoading ? (
              <div className="h-full w-full flex items-center justify-center bg-neutral-50 dark:bg-neutral-900/50 rounded-lg">
                <RefreshCw className="h-6 w-6 animate-spin text-neutral-400" />
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-full w-full flex items-center justify-center text-xs text-neutral-500">
                Tidak ada data transaksi untuk rentang waktu ini.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                {chartType === "bar" ? (
                  <BarChart data={chartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke={isDarkMode ? "#27272a" : "#f0f0f0"}
                    />
                    <XAxis
                      dataKey="date"
                      tick={{
                        fontSize: 11,
                        fill: isDarkMode ? "#a1a1aa" : "#71717a",
                      }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{
                        fontSize: 11,
                        fill: isDarkMode ? "#a1a1aa" : "#71717a",
                      }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) =>
                        v >= 1000000
                          ? `${(v / 1000000).toFixed(1)}M`
                          : `${(v / 1000).toFixed(0)}k`
                      }
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDarkMode ? "#09090b" : "#ffffff",
                        borderColor: isDarkMode ? "#27272a" : "#e4e4e7",
                        color: isDarkMode ? "#f4f4f5" : "#09090b",
                        borderRadius: "8px",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        fontSize: "12px",
                      }}
                      itemStyle={{
                        color: isDarkMode ? "#ffffff" : "#09090b",
                      }}
                      formatter={(val, name) => [
                        name === "revenue"
                          ? formatIDR(Number(val))
                          : `${val} transaksi`,
                        name === "revenue" ? "Revenue" : "Order",
                      ]}
                    />
                    <Bar
                      dataKey="revenue"
                      fill={isDarkMode ? "#ffffff" : "#171717"}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                ) : (
                  <LineChart data={chartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke={isDarkMode ? "#27272a" : "#f0f0f0"}
                    />
                    <XAxis
                      dataKey="date"
                      tick={{
                        fontSize: 11,
                        fill: isDarkMode ? "#a1a1aa" : "#71717a",
                      }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{
                        fontSize: 11,
                        fill: isDarkMode ? "#a1a1aa" : "#71717a",
                      }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) =>
                        v >= 1000000
                          ? `${(v / 1000000).toFixed(1)}M`
                          : `${(v / 1000).toFixed(0)}k`
                      }
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDarkMode ? "#09090b" : "#ffffff",
                        borderColor: isDarkMode ? "#27272a" : "#e4e4e7",
                        color: isDarkMode ? "#f4f4f5" : "#09090b",
                        borderRadius: "8px",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        fontSize: "12px",
                      }}
                      itemStyle={{
                        color: isDarkMode ? "#ffffff" : "#09090b",
                      }}
                      formatter={(val, name) => [
                        name === "revenue"
                          ? formatIDR(Number(val))
                          : `${val} transaksi`,
                        name === "revenue" ? "Revenue" : "Order",
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke={isDarkMode ? "#ffffff" : "#171717"}
                      strokeWidth={2.5}
                      dot={{
                        r: 3,
                        fill: isDarkMode ? "#ffffff" : "#171717",
                      }}
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bottom 2 Tables: Top 5 Best-Selling Products & 5 Latest Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Top 5 Best-Selling Products */}
        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Produk Terlaris (Top 5)
            </CardTitle>
            <CardDescription>
              Volume penjualan tertinggi pada periode {analyticsData?.periodLabel || "ini"}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3 py-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <div key={n} className="h-8 bg-neutral-100 dark:bg-neutral-800 animate-pulse rounded" />
                ))}
              </div>
            ) : topProducts.length === 0 ? (
              <div className="text-xs text-neutral-500 py-6 text-center">
                Belum ada produk terjual dalam periode ini.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">No</TableHead>
                    <TableHead>Produk</TableHead>
                    <TableHead className="text-right">Terjual</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProducts.map((item, idx) => (
                    <TableRow key={item.id || item.sku || idx}>
                      <TableCell className="font-medium">{idx + 1}</TableCell>
                      <TableCell>
                        <p className="font-medium text-xs sm:text-sm line-clamp-1">
                          {item.name}
                        </p>
                        <p className="text-[11px] text-neutral-500">{item.sku}</p>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {item.sold} pcs
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium">
                        {formatIDR(item.revenue)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* 5 Latest Orders */}
        <Card className="lg:col-span-7">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">
                Order Terbaru (5 Terakhir)
              </CardTitle>
              <CardDescription>
                Transaksi yang masuk dalam periode ini.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild className="h-8 text-xs">
              <Link href="/admin/orders">Lihat Semua</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3 py-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <div key={n} className="h-8 bg-neutral-100 dark:bg-neutral-800 animate-pulse rounded" />
                ))}
              </div>
            ) : latestOrders.length === 0 ? (
              <div className="text-xs text-neutral-500 py-6 text-center">
                Belum ada transaksi di periode ini.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Kurir</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {latestOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-xs font-semibold">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="hover:underline"
                        >
                          {order.orderNumber}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <p className="text-xs font-medium">{order.customerName}</p>
                        <p className="text-[11px] text-neutral-500">
                          {order.createdAt}
                        </p>
                      </TableCell>
                      <TableCell className="text-xs">{order.courier}</TableCell>
                      <TableCell>
                        {getOrderStatusBadge(order.orderStatus)}
                      </TableCell>
                      <TableCell className="text-right text-xs font-semibold">
                        {formatIDR(order.totalAmount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex h-96 items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-neutral-400" />
        </div>
      }
    >
      <DashboardContent />
    </React.Suspense>
  );
}
