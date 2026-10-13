"use client";

import React, { useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download, ExternalLink } from "lucide-react";
import type { AdminOrder } from "@/lib/admin-data";
import { generateShippingLabelPDF } from "@/lib/shipping-label-pdf";
import { BarcodeSvg } from "./BarcodeSvg";
import Link from "next/link";

interface ShippingLabelModalProps {
  order: AdminOrder | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ShippingLabelModal({
  order,
  isOpen,
  onClose,
}: ShippingLabelModalProps) {
  const printContentRef = useRef<HTMLDivElement>(null);

  if (!order) return null;

  const totalQty = order.items.reduce((acc, it) => acc + it.quantity, 0);
  const trackingNumber = order.trackingNumber || `MP-${order.orderNumber}`;

  const handlePrint = () => {
    // Open dedicated print window for 100% clean thermal printer output
    const printUrl = `/admin/print/shipping-label/${order.id}`;
    const win = window.open(printUrl, "_blank", "width=480,height=720");
    if (win) {
      win.focus();
    }
  };

  const handleDownloadPDF = () => {
    generateShippingLabelPDF(order);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 bg-neutral-100 dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700">
        <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
          <div>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Printer className="h-5 w-5 text-[#396254]" />
              <span>Label Resi Pengiriman (Thermal A6)</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              Format standar cetak kurir 100x150 mm (Printer Thermal &amp; Kertas Label).
            </DialogDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPDF}
              className="h-8 text-xs gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download PDF</span>
            </Button>
            <Button
              onClick={handlePrint}
              size="sm"
              className="h-8 text-xs gap-1.5 bg-[#396254] hover:bg-[#2d4e44] text-white"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Cetak Sekarang</span>
            </Button>
          </div>
        </DialogHeader>

        {/* Realistic Thermal Shipping Label Preview (100mm x 150mm scale) */}
        <div className="flex justify-center py-4 bg-neutral-200/60 dark:bg-neutral-950/60 rounded-xl p-2 sm:p-4">
          <div
            ref={printContentRef}
            className="w-full max-w-[390px] bg-white text-black font-sans border-2 border-black rounded-sm shadow-xl p-3.5 text-xs select-none"
            style={{ minHeight: "560px" }}
          >
            {/* 1. Header: Store & Courier */}
            <div className="flex items-center justify-between border-b-2 border-black pb-2.5">
              <div>
                <h2 className="text-base font-black tracking-tight uppercase">
                  it&apos;s matapanda
                </h2>
                <p className="text-[10px] text-neutral-600 font-medium">
                  Official Store Jakarta
                </p>
              </div>
              <div className="bg-black text-white px-3 py-1 text-xs font-black tracking-wider uppercase rounded-xs">
                {order.courier} - {order.courierService || "REG"}
              </div>
            </div>

            {/* 2. Barcode & Tracking Number */}
            <div className="py-2.5 text-center border-b-2 border-black">
              <BarcodeSvg value={trackingNumber} height={46} />
            </div>

            {/* 3. Order Reference & Payment Status */}
            <div className="flex items-center justify-between py-2 border-b-2 border-black text-[11px]">
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
            <div className="py-2.5 border-b-2 border-black bg-neutral-50/70 -mx-3.5 px-3.5">
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
                    <span className="truncate max-w-[240px]">
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

        {/* Modal Footer Links */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-neutral-200 dark:border-neutral-800 text-xs">
          <Link
            href={`/admin/print/shipping-label/${order.id}`}
            target="_blank"
            className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white flex items-center gap-1 underline underline-offset-4"
          >
            <span>Buka halaman cetak di tab baru</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
          <Button variant="outline" size="sm" onClick={onClose} className="w-full sm:w-auto">
            Tutup
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
