"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAdminStore } from "@/context/AdminStoreContext";
import { INITIAL_ORDERS, type AdminOrder } from "@/lib/admin-data";
import { generateShippingLabelPDF } from "@/lib/shipping-label-pdf";
import { BarcodeSvg } from "@/components/admin/BarcodeSvg";
import { Printer, Download, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function StandaloneShippingLabelPage() {
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
    if (order) generateShippingLabelPDF(order);
  };

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center font-sans text-neutral-600">
        <p>Memuat data label resi...</p>
      </div>
    );
  }

  const totalQty = order.items.reduce((acc, it) => acc + it.quantity, 0);
  const trackingNumber = order.trackingNumber || `MP-${order.orderNumber}`;

  return (
    <div className="min-h-screen bg-neutral-100 print:bg-white text-black font-sans py-4 sm:py-8">
      {/* Top Controls Bar (Hidden during Print) */}
      <div className="max-w-[420px] mx-auto mb-4 px-4 flex items-center justify-between print:hidden">
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

      {/* 100mm x 150mm Standard Thermal Shipping Label */}
      <div className="flex justify-center">
        <div
          id="shipping-label-root"
          className="w-[100mm] min-h-[148mm] max-w-full bg-white text-black border-2 border-black p-3.5 text-xs select-none shadow-md print:shadow-none print:border-2 print:m-0"
        >
          {/* 1. Header: Store & Courier */}
          <div className="flex items-center justify-between border-b-2 border-black pb-2">
            <div>
              <h2 className="text-base font-black tracking-tight uppercase leading-none">
                it&apos;s matapanda
              </h2>
              <p className="text-[10px] text-neutral-600 font-medium mt-0.5">
                Official Store Jakarta
              </p>
            </div>
            <div className="bg-black text-white px-3 py-1 text-xs font-black tracking-wider uppercase">
              {order.courier} - {order.courierService || "REG"}
            </div>
          </div>

          {/* 2. Barcode & Tracking Number */}
          <div className="py-2.5 text-center border-b-2 border-black">
            <BarcodeSvg value={trackingNumber} height={44} />
          </div>

          {/* 3. Order Reference & Non-COD Badge */}
          <div className="flex items-center justify-between py-1.5 border-b-2 border-black text-[11px]">
            <div>
              <p className="font-semibold">
                No. Order: <span className="font-mono">{order.orderNumber}</span>
              </p>
              <p className="text-neutral-600 text-[10px]">Tgl: {order.createdAt}</p>
            </div>
            <div className="border border-black px-2 py-0.5 font-bold text-[10px] bg-neutral-100">
              NON-COD (LUNAS)
            </div>
          </div>

          {/* 4. Destination / Recipient (Most Prominent) */}
          <div className="py-2.5 border-b-2 border-black bg-neutral-50 -mx-3.5 px-3.5">
            <span className="text-[9px] font-bold text-neutral-600 uppercase tracking-wider block mb-0.5">
              Penerima (Destination):
            </span>
            <p className="text-sm font-black text-black">
              {order.shippingAddress.recipient || order.customerName}
            </p>
            <p className="text-xs font-bold font-mono text-black">
              {order.shippingAddress.phone || order.customerPhone || "-"}
            </p>
            <p className="text-[11px] leading-tight text-neutral-800 mt-1">
              {order.shippingAddress.street || "-"}
            </p>
            <p className="text-xs font-bold text-black mt-1 uppercase">
              {order.shippingAddress.city}, {order.shippingAddress.province}{" "}
              {order.shippingAddress.postalCode}
            </p>
          </div>

          {/* 5. Sender Box */}
          <div className="py-2 border-b-2 border-black text-[10px]">
            <span className="text-[9px] font-bold text-neutral-600 uppercase tracking-wider block">
              Pengirim (Sender):
            </span>
            <p className="font-bold text-black">it&apos;s matapanda Jakarta (Official)</p>
            <p className="text-neutral-700">
              Jl. Senopati No. 42, Kebayoran Baru, Jakarta Selatan 12190
            </p>
            <p className="text-neutral-700 font-mono">Telp: +62 812-9876-5432</p>
          </div>

          {/* 6. Item List Summary */}
          <div className="py-2 text-[10px] border-b-2 border-black">
            <span className="font-bold block mb-1">Isi Paket:</span>
            <ul className="space-y-1">
              {order.items.slice(0, 3).map((it, idx) => (
                <li key={idx} className="flex justify-between text-neutral-800">
                  <span className="truncate max-w-[220px]">
                    {it.productName} ({it.size}/{it.color})
                  </span>
                  <span className="font-bold font-mono">x{it.quantity}</span>
                </li>
              ))}
              {order.items.length > 3 && (
                <li className="text-[9px] italic text-neutral-500">
                  + {order.items.length - 3} item lainnya...
                </li>
              )}
            </ul>
            <div className="mt-2 pt-1 border-t border-dashed border-neutral-300 flex justify-between font-bold text-[10px]">
              <span>Total Kuantitas: {totalQty} pcs</span>
              <span>Est. Berat: ~{(totalQty * 0.4).toFixed(1)} kg</span>
            </div>
          </div>

          {/* 7. Footer Instructions */}
          <div className="bg-black text-white text-center py-1 mt-2 text-[9px] font-bold tracking-wider uppercase">
            FRAGILE - JANGAN DIBANTING - TERIMA KASIH
          </div>
        </div>
      </div>

      {/* Print Stylesheet for exact 100x150 mm Thermal Output */}
      <style jsx global>{`
        @media print {
          @page {
            size: 100mm 150mm;
            margin: 0;
          }
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          #shipping-label-root {
            border: 2px solid black !important;
            box-shadow: none !important;
            margin: 0 auto !important;
            width: 100mm !important;
            height: 150mm !important;
            max-height: 150mm !important;
            page-break-after: avoid !important;
          }
        }
      `}</style>
    </div>
  );
}
