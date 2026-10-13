import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { AdminOrder } from "./admin-data";
import { formatIDR } from "./products";

/**
 * Generate and download a 100mm x 150mm (A6 standard thermal shipping label) PDF.
 */
export function generateShippingLabelPDF(order: AdminOrder): void {
  // Thermal shipping label standard: 100mm width x 150mm height
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [100, 150],
  });

  const pageWidth = 100;
  const margin = 5;
  const contentWidth = pageWidth - margin * 2; // 90mm

  // Outer border of shipping label
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.6);
  doc.rect(margin, margin, contentWidth, 140);

  // 1. Header: Store Name & Courier Badge
  let y = margin + 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(0, 0, 0);
  doc.text("it's matapanda", margin + 3, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("Official Store Jakarta", margin + 3, y + 4);

  // Courier Badge (Right aligned)
  const courierText = `${order.courier} - ${order.courierService || "REG"}`;
  doc.setFillColor(0, 0, 0);
  doc.rect(pageWidth - margin - 35, margin + 2, 33, 9, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(courierText, pageWidth - margin - 18.5, margin + 8, { align: "center" });

  // Divider
  y = margin + 14;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);

  // 2. Simulated High-Contrast Barcode for Tracking Number
  y += 3;
  const trackingNumber = order.trackingNumber || `MP-${order.orderNumber}`;
  const barcodeX = margin + 8;
  const barcodeWidth = 74;
  const barcodeHeight = 12;

  // Draw barcode lines with pseudo-code128 pattern based on character codes
  let currentX = barcodeX;
  const hashStr = trackingNumber + "CHECK";
  for (let i = 0; i < hashStr.length; i++) {
    const charCode = hashStr.charCodeAt(i);
    const w1 = (charCode % 3) * 0.4 + 0.3;
    const w2 = ((charCode >> 1) % 2) * 0.5 + 0.4;
    const w3 = ((charCode >> 2) % 3) * 0.4 + 0.3;

    doc.setFillColor(0, 0, 0);
    doc.rect(currentX, y, w1, barcodeHeight, "F");
    currentX += w1 + 0.4;

    doc.rect(currentX, y, w2, barcodeHeight, "F");
    currentX += w2 + 0.5;

    doc.rect(currentX, y, w3, barcodeHeight, "F");
    currentX += w3 + 0.4;

    if (currentX > barcodeX + barcodeWidth) break;
  }

  // Tracking Number Text
  y += barcodeHeight + 4;
  doc.setFont("courier", "bold");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(trackingNumber, pageWidth / 2, y, { align: "center" });

  // Divider
  y += 2.5;
  doc.line(margin, y, pageWidth - margin, y);

  // 3. Order Reference & Non-COD Badge
  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text(`No. Order : ${order.orderNumber}`, margin + 3, y);
  doc.setFont("helvetica", "normal");
  doc.text(`Tgl Pesan : ${order.createdAt}`, margin + 3, y + 4);

  // Payment Status / Non-COD Badge
  doc.setFillColor(240, 240, 240);
  doc.rect(pageWidth - margin - 35, y - 2.5, 33, 7.5, "F");
  doc.setDrawColor(0, 0, 0);
  doc.rect(pageWidth - margin - 35, y - 2.5, 33, 7.5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("NON-COD (LUNAS)", pageWidth - margin - 18.5, y + 2.5, { align: "center" });

  // Divider
  y += 7.5;
  doc.line(margin, y, pageWidth - margin, y);

  // 4. Recipient / Destination Box (Prominent)
  y += 1;
  doc.setFillColor(248, 248, 248);
  doc.rect(margin + 1, y, contentWidth - 2, 33, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(80, 80, 80);
  doc.text("PENERIMA (DESTINATION):", margin + 3, y + 4);

  // Recipient Name & Phone
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text(order.shippingAddress.recipient || order.customerName, margin + 3, y + 9);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(order.shippingAddress.phone || order.customerPhone || "-", margin + 3, y + 13.5);

  // Street Address & City (Wrapped)
  doc.setFontSize(8);
  const streetText = order.shippingAddress.street || "-";
  const splitStreet = doc.splitTextToSize(streetText, contentWidth - 8);
  doc.text(splitStreet, margin + 3, y + 18);

  const cityLine = `${order.shippingAddress.city}, ${order.shippingAddress.province} ${order.shippingAddress.postalCode}`;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text(cityLine, margin + 3, y + 28);

  // Divider
  y += 35;
  doc.line(margin, y, pageWidth - margin, y);

  // 5. Sender Box (Pengirim)
  y += 1;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(80, 80, 80);
  doc.text("PENGIRIM (SENDER):", margin + 3, y + 3.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text("it's matapanda Jakarta (Official)", margin + 3, y + 7.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("Jl. Senopati No. 42, Kebayoran Baru, Jakarta Selatan 12190 | Telp: +62 812-9876-5432", margin + 3, y + 11.5);

  // Divider
  y += 14;
  doc.line(margin, y, pageWidth - margin, y);

  // 6. Item List Summary Box (Table)
  y += 3;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("RINCIAN BARANG DALAM PAKET:", margin + 3, y);

  let itemY = y + 4;
  const itemsToShow = order.items.slice(0, 3);
  itemsToShow.forEach((item, idx) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    const itemTitle = `${idx + 1}. ${item.productName.substring(0, 32)} (${item.size}/${item.color})`;
    doc.text(itemTitle, margin + 3, itemY);
    doc.setFont("helvetica", "bold");
    doc.text(`x${item.quantity}`, pageWidth - margin - 5, itemY, { align: "right" });
    itemY += 3.5;
  });

  if (order.items.length > 3) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(6);
    doc.text(`+ ${order.items.length - 3} item lainnya...`, margin + 3, itemY);
    itemY += 3.5;
  }

  // Total Quantity & Weight
  const totalQty = order.items.reduce((sum, it) => sum + it.quantity, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text(`Total Kuantitas: ${totalQty} pcs | Est. Berat: ~${(totalQty * 0.4).toFixed(1)} kg`, margin + 3, 137);

  // 7. Footer Instructions
  doc.setFillColor(0, 0, 0);
  doc.rect(margin, 140, contentWidth, 5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.setTextColor(255, 255, 255);
  doc.text("FRAGILE - JANGAN DIBANTING - TERIMA KASIH TELAH BERBELANJA DI IT'S MATAPANDA", pageWidth / 2, 143.5, { align: "center" });

  // Save PDF
  doc.save(`shipping-label-${order.orderNumber}.pdf`);
}

/**
 * Generate and download an A4 Packing Slip / Warehouse Dispatch Note PDF.
 */
export function generatePackingSlipPDF(order: AdminOrder): void {
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
  doc.setFontSize(18);
  doc.text("it's matapanda", margin, 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(200, 200, 200);
  doc.text("SURAT JALAN & PACKING SLIP GUDANG (FULFILLMENT DISPATCH)", margin, 18);

  // Order Number on Header (Right Aligned)
  doc.setFont("courier", "bold");
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text(order.orderNumber, pageWidth - margin, 12, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(200, 200, 200);
  doc.text(`Tanggal: ${order.createdAt}`, pageWidth - margin, 18, { align: "right" });

  let y = 35;

  // Two Column Information: Order Details (Left) & Customer / Shipping Address (Right)
  const colWidth = (pageWidth - margin * 2 - 8) / 2;

  // Left Column: Order Meta
  doc.setFillColor(248, 248, 248);
  doc.roundedRect(margin, y, colWidth, 38, 2, 2, "F");
  doc.setDrawColor(220, 220, 220);
  doc.roundedRect(margin, y, colWidth, 38, 2, 2);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  doc.text("INFORMASI PESANAN", margin + 4, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text("Status Pesanan :", margin + 4, y + 13);
  doc.text("Status Bayar    :", margin + 4, y + 18);
  doc.text("Metode Bayar    :", margin + 4, y + 23);
  doc.text("Ekspedisi       :", margin + 4, y + 28);
  doc.text("Nomor Resi      :", margin + 4, y + 33);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text(order.orderStatus, margin + 30, y + 13);
  doc.text(order.paymentStatus === "SETTLEMENT" ? "LUNAS (Settlement)" : order.paymentStatus, margin + 30, y + 18);
  doc.text(order.paymentMethod, margin + 30, y + 23);
  doc.text(`${order.courier} (${order.courierService || "Standard"})`, margin + 30, y + 28);
  doc.setFont("courier", "bold");
  doc.text(order.trackingNumber || "-", margin + 30, y + 33);

  // Right Column: Shipping Destination
  const rightX = margin + colWidth + 8;
  doc.setFillColor(248, 248, 248);
  doc.roundedRect(rightX, y, colWidth, 38, 2, 2, "F");
  doc.setDrawColor(220, 220, 220);
  doc.roundedRect(rightX, y, colWidth, 38, 2, 2);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  doc.text("TUJUAN PENGIRIMAN", rightX + 4, y + 6);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(order.shippingAddress.recipient || order.customerName, rightX + 4, y + 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  doc.text(`Telp: ${order.shippingAddress.phone || order.customerPhone || "-"}`, rightX + 4, y + 16.5);

  const addressLines = doc.splitTextToSize(order.shippingAddress.street || "-", colWidth - 8);
  doc.text(addressLines, rightX + 4, y + 21);

  doc.setFont("helvetica", "bold");
  doc.text(
    `${order.shippingAddress.city}, ${order.shippingAddress.province} ${order.shippingAddress.postalCode}`,
    rightX + 4,
    y + 32
  );

  y += 45;

  // Table of Items for Warehouse QC & Packing
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text("CHECKLIST ITEM BARANG (QUALITY CONTROL)", margin, y);

  const tableBody = order.items.map((item, index) => [
    "[  ]", // Checkbox for warehouse picker
    String(index + 1),
    item.sku || `SKU-${item.id.substring(0, 6)}`,
    item.productName,
    `${item.size} / ${item.color}`,
    String(item.quantity),
    formatIDR(item.unitPrice),
    formatIDR(item.subtotal),
  ]);

  autoTable(doc, {
    startY: y + 3,
    head: [["Cek", "No", "SKU", "Nama Produk", "Varian", "Qty", "Harga Satuan", "Subtotal"]],
    body: tableBody,
    theme: "grid",
    headStyles: {
      fillColor: [35, 35, 35],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: "bold",
      halign: "center",
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [30, 30, 30],
    },
    columnStyles: {
      0: { cellWidth: 12, halign: "center", fontStyle: "bold" },
      1: { cellWidth: 10, halign: "center" },
      2: { cellWidth: 26, fontStyle: "bold" },
      3: { cellWidth: "auto" },
      4: { cellWidth: 26, halign: "center" },
      5: { cellWidth: 14, halign: "center", fontStyle: "bold" },
      6: { cellWidth: 25, halign: "right" },
      7: { cellWidth: 25, halign: "right", fontStyle: "bold" },
    },
    margin: { left: margin, right: margin },
  });

  // Calculate position after table
  // @ts-expect-error autoTable adds lastAutoTable to jsPDF instance
  const afterTableY = doc.lastAutoTable.finalY + 6;

  // Payment Summary Box
  const summaryBoxWidth = 80;
  const summaryX = pageWidth - margin - summaryBoxWidth;

  doc.setFillColor(250, 250, 250);
  doc.rect(summaryX, afterTableY, summaryBoxWidth, 24, "F");
  doc.setDrawColor(220, 220, 220);
  doc.rect(summaryX, afterTableY, summaryBoxWidth, 24);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text("Subtotal Produk:", summaryX + 4, afterTableY + 5);
  doc.text(formatIDR(order.subtotal), pageWidth - margin - 4, afterTableY + 5, { align: "right" });

  doc.text(`Ongkos Kirim (${order.courier}):`, summaryX + 4, afterTableY + 10);
  doc.text(formatIDR(order.shippingCost), pageWidth - margin - 4, afterTableY + 10, { align: "right" });

  if (order.discountAmount > 0) {
    doc.setTextColor(0, 130, 0);
    doc.text("Diskon Promo:", summaryX + 4, afterTableY + 15);
    doc.text(`-${formatIDR(order.discountAmount)}`, pageWidth - margin - 4, afterTableY + 15, { align: "right" });
  }

  doc.setLineWidth(0.3);
  doc.line(summaryX + 2, afterTableY + 18, pageWidth - margin - 2, afterTableY + 18);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  doc.text("Total Pembayaran:", summaryX + 4, afterTableY + 22);
  doc.text(formatIDR(order.totalAmount), pageWidth - margin - 4, afterTableY + 22, { align: "right" });

  // Warehouse Checklist Notes (Left side)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("INSTRUKSI PENGEMASAN GUDANG:", margin, afterTableY + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(80, 80, 80);
  doc.text("1. Periksa kelengkapan item, kondisi resleting/jahitan, dan hangtag.", margin, afterTableY + 10);
  doc.text("2. Masukkan ke dalam dustbag/polybag resmi it's matapanda.", margin, afterTableY + 14);
  doc.text("3. Rekatkan sticker fragile dan tempelkan label resi di sisi luar paket.", margin, afterTableY + 18);

  // Signatures Section
  const signatureY = afterTableY + 32;
  const sigBoxWidth = (pageWidth - margin * 2 - 20) / 3;

  const signatures = [
    { role: "Petugas Packing (Gudang)", note: "(Ttd & Nama Jelas)" },
    { role: "Quality Control (QC)", note: "(Ttd & Nama Jelas)" },
    { role: "Kurir Pick-up (" + order.courier + ")", note: "(Ttd & No. HP)" },
  ];

  signatures.forEach((sig, idx) => {
    const sigX = margin + idx * (sigBoxWidth + 10);
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.rect(sigX, signatureY, sigBoxWidth, 24);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(0, 0, 0);
    doc.text(sig.role, sigX + sigBoxWidth / 2, signatureY + 5, { align: "center" });

    doc.setFont("helvetica", "italic");
    doc.setFontSize(6.5);
    doc.setTextColor(140, 140, 140);
    doc.text(sig.note, sigX + sigBoxWidth / 2, signatureY + 21, { align: "center" });
  });

  // Footer on bottom of page
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);
  doc.text(
    "Dokumen ini digenerate secara otomatis oleh it's matapanda Fulfillment & Warehouse System.",
    margin,
    pageHeight - 6
  );
  doc.text(`Waktu Cetak: ${new Date().toLocaleString("id-ID")}`, pageWidth - margin, pageHeight - 6, {
    align: "right",
  });

  // Save PDF
  doc.save(`packing-slip-${order.orderNumber}.pdf`);
}
