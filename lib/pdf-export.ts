import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatIDR } from "./products";

export interface PDFExportData {
  reportTitle?: string;
  periodMode: "daily" | "monthly" | "yearly";
  periodLabel: string;
  adminName?: string;
  generatedAt?: string;
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
    activeCustomers?: number;
  };
  breakdown: Array<{
    label: string;
    orders: number;
    revenue: number;
  }>;
  topProducts: Array<{
    rank: number;
    name: string;
    sku: string;
    sold: number;
    revenue: number;
  }>;
  recentOrders?: Array<{
    orderNumber: string;
    customerName: string;
    date: string;
    status: string;
    total: number;
  }>;
}

export function generateDashboardPDF(data: PDFExportData): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // Header Banner Background
  doc.setFillColor(18, 18, 18);
  doc.rect(0, 0, pageWidth, 28, "F");

  // Header Text
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("it's matapanda", margin, 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(200, 200, 200);
  doc.text("EXECUTIVE SALES & PERFORMANCE REPORT", margin, 18);

  // Export metadata right aligned
  const nowStr =
    data.generatedAt ||
    new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  doc.setFontSize(8);
  doc.text(`Tanggal Export: ${nowStr}`, pageWidth - margin, 12, {
    align: "right",
  });
  doc.text(
    `Admin: ${data.adminName || "Administrator"}`,
    pageWidth - margin,
    18,
    { align: "right" }
  );

  let currentY = 36;

  // Period Badge / Subheading
  doc.setFillColor(245, 245, 247);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 10, 2, 2, "F");

  doc.setTextColor(50, 50, 50);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  const modeLabel =
    data.periodMode === "daily"
      ? "Laporan Harian"
      : data.periodMode === "monthly"
      ? "Laporan Bulanan"
      : "Laporan Tahunan";

  doc.text(`${modeLabel} — Periode: ${data.periodLabel}`, margin + 4, currentY + 6.5);
  currentY += 16;

  // KPI Summary Cards (4 Cards across width)
  const cardWidth = (pageWidth - margin * 2 - 9) / 4;
  const cardHeight = 18;

  const kpiItems = [
    {
      title: "TOTAL REVENUE",
      value: formatIDR(data.kpis.totalRevenue),
      sub: `${data.kpis.growthRevenue >= 0 ? "+" : ""}${data.kpis.growthRevenue.toFixed(1)}% vs lalu`,
      color: data.kpis.growthRevenue >= 0 ? [22, 163, 74] : [220, 38, 38],
    },
    {
      title: "TOTAL ORDER",
      value: `${data.kpis.totalOrders} Trx`,
      sub: `${data.kpis.growthOrders >= 0 ? "+" : ""}${data.kpis.growthOrders.toFixed(1)}% vs lalu`,
      color: data.kpis.growthOrders >= 0 ? [22, 163, 74] : [220, 38, 38],
    },
    {
      title: "ORDER SELESAI",
      value: `${data.kpis.completedOrders + data.kpis.shippedOrders} Trx`,
      sub: `Pending: ${data.kpis.pendingOrders}`,
      color: [75, 85, 99],
    },
    {
      title: "ORDER DIBATALKAN",
      value: `${data.kpis.cancelledOrders} Trx`,
      sub: `Cust Aktif: ${data.kpis.activeCustomers || 0}`,
      color: [107, 114, 128],
    },
  ];

  kpiItems.forEach((item, index) => {
    const cardX = margin + index * (cardWidth + 3);
    doc.setFillColor(250, 250, 250);
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 1.5, 1.5, "FD");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(120, 120, 120);
    doc.text(item.title, cardX + 3, currentY + 4.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(17, 24, 39);
    doc.text(item.value, cardX + 3, currentY + 10.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(item.color[0], item.color[1], item.color[2]);
    doc.text(item.sub, cardX + 3, currentY + 15);
  });

  currentY += cardHeight + 8;

  // Section 1: Period Breakdown Table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(24, 24, 27);
  doc.text("1. Breakdown Penjualan per Periode", margin, currentY);
  currentY += 4;

  const breakdownRows = data.breakdown.map((row) => [
    row.label,
    `${row.orders} transaksi`,
    formatIDR(row.revenue),
    data.kpis.totalRevenue > 0
      ? `${((row.revenue / data.kpis.totalRevenue) * 100).toFixed(1)}%`
      : "0%",
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [["Periode / Waktu", "Jumlah Order", "Total Revenue", "Kontribusi"]],
    body: breakdownRows,
    theme: "striped",
    headStyles: {
      fillColor: [24, 24, 27],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      halign: "left",
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [51, 51, 51],
    },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 35, halign: "center" },
      2: { cellWidth: 55, halign: "right", fontStyle: "bold" },
      3: { cellWidth: "auto", halign: "right" },
    },
    margin: { left: margin, right: margin },
  });

  // Calculate next start Y after first table
  // @ts-expect-error - jspdf-autotable plugin property
  currentY = doc.lastAutoTable.finalY + 8;

  // Check if we need a new page for Top Products
  if (currentY > pageHeight - 70) {
    doc.addPage();
    currentY = 20;
  }

  // Section 2: Top Products Table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(24, 24, 27);
  doc.text("2. Top 5 Produk Terlaris", margin, currentY);
  currentY += 4;

  const topProductRows = data.topProducts.map((p, idx) => [
    `${idx + 1}`,
    p.name,
    p.sku,
    `${p.sold} pcs`,
    formatIDR(p.revenue),
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [["No", "Nama Produk", "SKU", "Total Terjual", "Total Revenue"]],
    body: topProductRows,
    theme: "striped",
    headStyles: {
      fillColor: [24, 24, 27],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      halign: "left",
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [51, 51, 51],
    },
    columnStyles: {
      0: { cellWidth: 12, halign: "center" },
      1: { cellWidth: 70 },
      2: { cellWidth: 35, fontStyle: "italic" },
      3: { cellWidth: 28, halign: "right", fontStyle: "bold" },
      4: { cellWidth: "auto", halign: "right", fontStyle: "bold" },
    },
    margin: { left: margin, right: margin },
  });

  // @ts-expect-error - jspdf-autotable plugin property
  currentY = doc.lastAutoTable.finalY + 8;

  // Section 3: Recent Orders if available and space permits
  if (data.recentOrders && data.recentOrders.length > 0) {
    if (currentY > pageHeight - 65) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(24, 24, 27);
    doc.text("3. Sampel Transaksi Terbaru", margin, currentY);
    currentY += 4;

    const recentOrderRows = data.recentOrders.slice(0, 5).map((o) => [
      o.orderNumber,
      o.customerName,
      o.date,
      o.status,
      formatIDR(o.total),
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [["Order ID", "Customer", "Tanggal", "Status", "Nominal"]],
      body: recentOrderRows,
      theme: "grid",
      headStyles: {
        fillColor: [75, 85, 99],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 7.5,
      },
      bodyStyles: {
        fontSize: 7,
        textColor: [51, 51, 51],
      },
      columnStyles: {
        0: { cellWidth: 40, fontStyle: "bold" },
        1: { cellWidth: 45 },
        2: { cellWidth: 30 },
        3: { cellWidth: 28, halign: "center" },
        4: { cellWidth: "auto", halign: "right", fontStyle: "bold" },
      },
      margin: { left: margin, right: margin },
    });
  }

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);
    doc.text(
      "Dokumen ini digenerate secara otomatis oleh it's matapanda Admin Analytics System.",
      margin,
      pageHeight - 6
    );
    doc.text(`Halaman ${i} dari ${totalPages}`, pageWidth - margin, pageHeight - 6, {
      align: "right",
    });
  }

  // File name formatting
  const sanitizedPeriod = data.periodLabel
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-");
  const fileName = `itsmatapanda-sales-report-${data.periodMode}-${sanitizedPeriod}.pdf`;

  doc.save(fileName);
}
