"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAdminStore } from "@/context/AdminStoreContext";
import { INITIAL_ORDERS, type AdminOrder } from "@/lib/admin-data";
import { generatePackingSlipPDF } from "@/lib/shipping-label-pdf";
import { formatIDR } from "@/lib/products";
import { Printer, Download, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function StandalonePackingSlipPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.id as string;
  const { orders } = useAdminStore();
  const [order, setOrder] = useState<AdminOrder | null>(null);

  useEffect(() => {
    if (!orderId) return;
    const found =
      orders.find((o) => o.id === orderId) ||
      INITIAL_ORDERS.find((o) => o.id === orderId);
    if (found) {
      setOrder(found);
    }
  }, [orderId, orders]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    if (order) generatePackingSlipPDF(order);
  };

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center font-sans text-neutral-600">
        <p>Memuat data packing slip...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 print:bg-white text-black font-sans py-4 sm:py-8">
      {/* Top Controls Bar (Hidden during Print) */}
      <div className="max-w-[760px] mx-auto mb-4 px-4 flex items-center justify-between print:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
          className="gap-1.5 text-xs bg-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Kembali</span>
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPDF}
            className="gap-1.5 text-xs bg-white"
          >
            <Download className="h-3.5 w-3.5" />
            <span>PDF</span>
          </Button>
          <Button
            size="sm"
            onClick={handlePrint}
            className="gap-1.5 text-xs bg-[#396254] hover:bg-[#2d4e44] text-white"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Cetak Sekarang</span>
          </Button>
        </div>
      </div>

      {/* Standard A4 Packing Slip Page Container */}
      <div className="flex justify-center">
        <div
          id="packing-slip-root"
          className="w-[210mm] min-h-[297mm] max-w-full bg-white text-black border border-neutral-300 print:border-none p-8 sm:p-10 text-xs select-none shadow-md print:shadow-none"
        >
          {/* Header Banner */}
          <div className="flex items-start justify-between border-b-2 border-black pb-4 mb-6">
            <div>
              <h1 className="text-2xl font-black tracking-tight uppercase">
                it&apos;s matapanda
              </h1>
              <p className="text-xs font-semibold text-neutral-700 tracking-wide mt-0.5">
                SURAT JALAN &amp; PACKING SLIP GUDANG
              </p>
              <p className="text-[11px] text-neutral-500 mt-1">
                Jl. Senopati No. 42, Kebayoran Baru, Jakarta Selatan 12190
              </p>
            </div>
            <div className="text-right">
              <span className="font-mono text-lg font-black text-black block">
                {order.orderNumber}
              </span>
              <span className="text-[11px] text-neutral-600 block mt-0.5">
                Tgl Pesan: {order.createdAt}
              </span>
              <span className="inline-block mt-2 px-3 py-0.5 text-[10px] font-bold uppercase rounded-sm border border-neutral-400 bg-neutral-100">
                {order.paymentStatus === "SETTLEMENT" ? "LUNAS (PAID)" : order.paymentStatus}
              </span>
            </div>
          </div>

          {/* 2-Column Info Grid */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* Left Column: Order Meta */}
            <div className="border border-neutral-200 rounded p-4 bg-neutral-50/50 space-y-1.5 text-xs">
              <h3 className="font-bold text-[11px] uppercase tracking-wider text-neutral-700 border-b pb-1">
                Detail Pengiriman &amp; Ekspedisi
              </h3>
              <div className="flex justify-between">
                <span className="text-neutral-500">Kurir / Layanan:</span>
                <span className="font-bold">
                  {order.courier} ({order.courierService || "Standard"})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Nomor Resi:</span>
                <span className="font-mono font-bold">
                  {order.trackingNumber || "Belum Tersedia"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Metode Bayar:</span>
                <span className="font-semibold">{order.paymentMethod}</span>
              </div>
            </div>

            {/* Right Column: Customer Shipping Address */}
            <div className="border border-neutral-200 rounded p-4 bg-neutral-50/50 space-y-1 text-xs">
              <h3 className="font-bold text-[11px] uppercase tracking-wider text-neutral-700 border-b pb-1">
                Alamat Tujuan Pengiriman
              </h3>
              <p className="font-bold text-sm text-black">
                {order.shippingAddress.recipient || order.customerName}
              </p>
              <p className="font-mono text-neutral-600">
                Telp: {order.shippingAddress.phone || order.customerPhone || "-"}
              </p>
              <p className="text-neutral-700 leading-snug mt-1">
                {order.shippingAddress.street}
              </p>
              <p className="font-bold text-neutral-800">
                {order.shippingAddress.city}, {order.shippingAddress.province}{" "}
                {order.shippingAddress.postalCode}
              </p>
            </div>
          </div>

          {/* Table: Items to Pack (Quality Control) */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-xs uppercase tracking-wider text-neutral-900">
                Daftar Barang yang Harus Dikemas ({order.items.length} Item)
              </h3>
              <span className="text-[11px] text-neutral-500">
                Centang kolom [Cek] saat barang dimasukkan ke paket
              </span>
            </div>
            <div className="border border-neutral-300 rounded overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-neutral-900 text-white font-bold text-[11px]">
                    <th className="py-2.5 px-2 text-center w-12">Cek</th>
                    <th className="py-2.5 px-2 text-center w-8">No</th>
                    <th className="py-2.5 px-3 w-32">SKU</th>
                    <th className="py-2.5 px-3">Nama Produk</th>
                    <th className="py-2.5 px-3 text-center w-28">Varian</th>
                    <th className="py-2.5 px-2 text-center w-12">Qty</th>
                    <th className="py-2.5 px-3 text-right w-28">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {order.items.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-neutral-50">
                      <td className="py-3 px-2 text-center">
                        <span className="inline-block h-4 w-4 border-2 border-black rounded-xs text-center leading-3 font-bold">
                          &nbsp;
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center font-mono text-neutral-500">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-[11px]">
                        {item.sku || `SKU-${item.id.substring(0, 6)}`}
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-semibold text-black">{item.productName}</p>
                      </td>
                      <td className="py-3 px-3 text-center text-neutral-700">
                        {item.size} / {item.color}
                      </td>
                      <td className="py-3 px-2 text-center font-bold text-black font-mono">
                        {item.quantity}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold font-mono">
                        {formatIDR(item.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Summary & Warehouse Notes */}
          <div className="grid grid-cols-12 gap-6 mb-8">
            <div className="col-span-7 space-y-2 border border-neutral-200 rounded p-4 text-xs bg-neutral-50">
              <h4 className="font-bold text-[11px] uppercase tracking-wider text-neutral-800">
                Instruksi Pengepakan Gudang (SOP):
              </h4>
              <ol className="list-decimal pl-4 space-y-1 text-neutral-600 text-[11px]">
                <li>Periksa jahitan, resleting, dan kebersihan produk sebelum dipacking.</li>
                <li>Bungkus dengan polybag resmi dan rekatkan segel QC.</li>
                <li>Pastikan invoice &amp; thanks note disertakan di dalam paket.</li>
                <li>Tempelkan label resi termal di bagian luar box/polybag paket.</li>
              </ol>
            </div>

            <div className="col-span-5 border border-neutral-200 rounded p-4 bg-neutral-50 space-y-1.5 text-xs">
              <div className="flex justify-between text-neutral-600">
                <span>Subtotal:</span>
                <span className="font-mono">{formatIDR(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>Ongkos Kirim:</span>
                <span className="font-mono">{formatIDR(order.shippingCost)}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Diskon:</span>
                  <span className="font-mono">-{formatIDR(order.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm border-t pt-2 text-black">
                <span>Total Bayar:</span>
                <span className="font-mono">{formatIDR(order.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Signatures / Verifikasi */}
          <div className="grid grid-cols-3 gap-6 pt-6 border-t border-neutral-200 text-center text-xs">
            <div className="border border-neutral-200 rounded p-3 h-28 flex flex-col justify-between">
              <span className="font-bold text-[10px] text-neutral-700">
                Disiapkan Oleh (Gudang)
              </span>
              <span className="text-[9px] text-neutral-400 italic">
                ( Tanda tangan &amp; Nama )
              </span>
            </div>
            <div className="border border-neutral-200 rounded p-3 h-28 flex flex-col justify-between">
              <span className="font-bold text-[10px] text-neutral-700">
                Quality Control (QC)
              </span>
              <span className="text-[9px] text-neutral-400 italic">
                ( Tanda tangan &amp; Nama )
              </span>
            </div>
            <div className="border border-neutral-200 rounded p-3 h-28 flex flex-col justify-between">
              <span className="font-bold text-[10px] text-neutral-700">
                Diserahkan ke Kurir ({order.courier})
              </span>
              <span className="text-[9px] text-neutral-400 italic">
                ( Tanda tangan &amp; No HP )
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Print Stylesheet for exact A4 Output */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          #packing-slip-root {
            border: none !important;
            box-shadow: none !important;
            margin: 0 auto !important;
            width: 100% !important;
            page-break-after: avoid !important;
          }
        }
      `}</style>
    </div>
  );
}
