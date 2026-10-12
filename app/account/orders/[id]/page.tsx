"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  Copy,
  Check,
  MapPin,
  Truck,
  Radio,
  ShoppingBag,
  CreditCard,
} from "lucide-react";
import Navbar from "@/components/Navbar";

interface OrderItem {
  id: string;
  productName: string;
  sku: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  image: string;
}

interface TrackingCheckpoint {
  timestamp: string;
  status: string;
  description: string;
  location: string;
}

interface OrderDetail {
  id: string;
  orderNumber: string;
  date: string;
  createdAt: string;
  status: string;
  totalAmount: number;
  subtotal: number;
  shippingCost: number;
  discountAmount: number;
  currency: string;
  payment: {
    status: string;
    paymentType: string;
    paidAt: string | null;
  };
  shipment: {
    courier: string;
    serviceName: string;
    trackingNumber: string | null;
    status: string;
    originCity: string;
    destinationCity: string;
    destinationCountry: string;
    estimatedDays: string;
    trackingHistory?: TrackingCheckpoint[] | null;
  };
  shippingAddress: {
    recipient: string;
    phone: string;
    street: string;
    apartment?: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
  };
  items: OrderItem[];
}

const ORDER_STEPS = [
  { key: "CREATED", label: "Pesanan Dibuat", description: "Pesanan tercatat di sistem" },
  { key: "PAID", label: "Pembayaran Lunas", description: "Terverifikasi via Midtrans" },
  { key: "PROCESSING", label: "Sedang Dikemas", description: "Diproses oleh tim it'smatapanda" },
  { key: "SHIPPED", label: "Dalam Pengiriman", description: "Diserahkan ke kurir" },
  { key: "DELIVERED", label: "Pesanan Selesai", description: "Paket telah diterima" },
];

function getCurrentStepIndex(orderStatus: string, shipmentStatus: string, paymentStatus: string) {
  const normShip = (shipmentStatus || "").toUpperCase();
  const normPay = (paymentStatus || "").toUpperCase();

  if (normShip === "DELIVERED" || normShip === "COMPLETED") return 4;
  if (normShip === "IN_TRANSIT" || normShip === "OUT_FOR_DELIVERY" || normShip === "PICKED_UP") return 3;
  if (normShip === "PROCESSING" || normPay === "SETTLEMENT" || normPay === "PAID") return 2;
  if (normPay === "SETTLEMENT" || normPay === "PAID") return 1;
  return 0;
}

export default function OrderTrackingDetailPage() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;

  const [order, setOrder] = React.useState<OrderDetail | null>(null);
  const [trackingLogs, setTrackingLogs] = React.useState<TrackingCheckpoint[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [copiedResi, setCopiedResi] = React.useState(false);

  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/account/login?callbackUrl=/account/orders/${orderId}`);
    }
  }, [status, router, orderId]);

  React.useEffect(() => {
    if (status === "authenticated" && orderId) {
      fetch(`/api/account/orders/${orderId}`)
        .then((res) => {
          if (!res.ok) throw new Error("Not found");
          return res.json();
        })
        .then((data) => {
          if (data.order) {
            setOrder(data.order);
            const initialLogs = data.order.shipment?.trackingHistory;
            if (Array.isArray(initialLogs) && initialLogs.length > 0) {
              setTrackingLogs(initialLogs);
            } else if (data.order.shipment?.trackingNumber) {
              // Fetch from live tracking API
              fetch(
                `/api/shipping/tracking?courier=${data.order.shipment.courier}&waybill=${data.order.shipment.trackingNumber}`
              )
                .then((r) => (r.ok ? r.json() : null))
                .then((trackData) => {
                  if (trackData?.history) {
                    setTrackingLogs(trackData.history);
                  }
                })
                .catch(() => {});
            }
          }
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    }
  }, [status, orderId]);

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedResi(true);
    setTimeout(() => setCopiedResi(false), 2000);
  };

  if (status === "loading" || (loading && status === "authenticated")) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col font-sans">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-6 text-sm text-neutral-500">
          <div className="flex items-center gap-3">
            <RefreshCw className="h-4 w-4 animate-spin text-neutral-800" />
            <span>Memuat detail pelacakan...</span>
          </div>
        </main>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col font-sans">
        <Navbar />
        <main className="flex-1 max-w-[800px] w-full mx-auto px-4 py-16 text-center space-y-4">
          <h1 className="text-xl font-bold text-neutral-900">Pesanan Tidak Ditemukan</h1>
          <p className="text-xs text-neutral-600">
            Pesanan yang Anda cari tidak tersedia atau Anda tidak memiliki hak akses.
          </p>
          <Link
            href="/account/orders"
            className="inline-flex items-center gap-2 rounded-xl bg-black px-5 py-3 text-xs font-semibold text-white hover:bg-neutral-800"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Pesanan Saya</span>
          </Link>
        </main>
      </div>
    );
  }

  const currentStep = getCurrentStepIndex(
    order.status,
    order.shipment.status,
    order.payment.status
  );

  return (
    <div className="min-h-screen bg-[#fafaf8] flex flex-col font-sans text-neutral-900">
      <Navbar />

      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        {/* Navigation & Title */}
        <div className="mb-8 space-y-3">
          <Link
            href="/account/orders"
            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#396254] hover:opacity-80 transition-opacity"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>← Kembali ke Semua Pesanan</span>
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-neutral-200/80 pb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#d5c6ff] text-[#396254] text-xs font-black uppercase tracking-wider shadow-xs mb-2">
                <span>Detail &amp; Lacak Pesanan</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-black mt-1 font-mono">
                {order.orderNumber}
              </h1>
            </div>
            <div className="text-xs text-neutral-500 sm:text-right font-medium">
              <p>
                Waktu Transaksi:{" "}
                <span className="font-bold text-neutral-800">
                  {new Date(order.createdAt).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Visual Step Progress Tracker */}
        <div className="mb-8 rounded-3xl border border-neutral-200/90 bg-white p-6 sm:p-8 shadow-md">
          <h2 className="text-xs font-black uppercase tracking-wider text-neutral-800 mb-6 flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            <span>Status Perjalanan Paket</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 relative">
            {ORDER_STEPS.map((step, idx) => {
              const isCompleted = idx <= currentStep;
              const isCurrent = idx === currentStep;

              return (
                <div key={step.key} className="flex flex-col items-start sm:items-center text-left sm:text-center relative">
                  {/* Circle Icon */}
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-full text-xs font-black transition-all ${
                      isCompleted
                        ? "bg-[#396254] text-white shadow-md"
                        : "bg-neutral-100 text-neutral-400 border border-neutral-200"
                    } ${isCurrent ? "ring-4 ring-[#d5c6ff] scale-110" : ""}`}
                  >
                    {isCompleted ? <Check className="h-5 w-5 stroke-[3]" /> : idx + 1}
                  </div>

                  <div className="mt-3">
                    <p
                      className={`text-xs font-black uppercase tracking-wider ${
                        isCompleted ? "text-[#396254]" : "text-neutral-400"
                      }`}
                    >
                      {step.label}
                    </p>
                    <p className="text-[11px] text-neutral-500 mt-0.5 font-medium">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Shipment Logs & Products */}
          <div className="lg:col-span-8 space-y-8">
            {/* Courier & Tracking Number Card */}
            <div className="rounded-3xl border border-neutral-200/90 bg-white p-6 sm:p-7 shadow-md space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#d5c6ff] text-[#396254] shadow-xs">
                    <Truck className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-neutral-900 uppercase">
                      {order.shipment.courier} &mdash; {order.shipment.serviceName}
                    </h3>
                    <p className="text-xs text-neutral-500 font-medium">
                      Estimasi Sampai: <span className="font-bold text-neutral-800">{order.shipment.estimatedDays}</span>
                    </p>
                  </div>
                </div>

                {order.shipment.trackingNumber && (
                  <div className="flex items-center gap-2 bg-[#d5c6ff]/20 border border-[#d5c6ff]/50 rounded-2xl px-3.5 py-2">
                    <span className="text-xs font-bold text-[#396254]">No. Resi:</span>
                    <span className="font-mono font-bold text-xs text-black">
                      {order.shipment.trackingNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(order.shipment.trackingNumber!)}
                      aria-label="Salin nomor resi"
                      className="text-neutral-500 hover:text-black transition-colors p-1 cursor-pointer"
                    >
                      {copiedResi ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Timeline Checkpoints */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-neutral-700 mb-4 flex items-center gap-1.5">
                  <Radio className="h-3.5 w-3.5" />
                  <span>Riwayat Perjalanan Paket</span>
                </h4>
                {trackingLogs.length > 0 ? (
                  <div className="space-y-4 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#396254]/30 pl-6">
                    {trackingLogs.map((log, index) => (
                      <div key={index} className="relative space-y-0.5">
                        <span className="absolute -left-6 top-1.5 h-3 w-3 rounded-full bg-[#396254] ring-4 ring-[#d5c6ff]/50" />
                        <p className="text-xs font-bold text-neutral-900">
                          {log.description}
                        </p>
                        <p className="text-[11px] text-neutral-500 font-medium">
                          {log.timestamp} &bull; {log.location}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-500 italic font-medium">
                    Paket sedang disiapkan di gudang kami dan akan segera diserahkan ke kurir {order.shipment.courier}.
                  </p>
                )}
              </div>
            </div>

            {/* Products Card */}
            <div className="rounded-3xl border border-neutral-200/90 bg-white p-6 sm:p-7 shadow-md space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-neutral-800 border-b border-neutral-100 pb-3 flex items-center gap-1.5">
                <ShoppingBag className="h-3.5 w-3.5" />
                <span>Daftar Produk ({order.items.reduce((acc, it) => acc + it.quantity, 0)} Item)</span>
              </h3>

              <div className="divide-y divide-neutral-100">
                {order.items.map((item) => (
                  <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="relative h-20 w-16 shrink-0 rounded-2xl bg-neutral-100 overflow-hidden border border-neutral-200">
                        <Image
                          src={item.image}
                          alt={item.productName}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-black text-sm text-neutral-900 truncate uppercase">
                          {item.productName}
                        </h4>
                        <p className="text-xs text-neutral-500 mt-1 font-medium">
                          SKU: {item.sku} &bull; Size: {item.size} &bull; Warna: {item.color}
                        </p>
                        <p className="text-xs text-neutral-600 mt-1 font-semibold">
                          {item.quantity} &times; Rp {item.unitPrice.toLocaleString("id-ID")}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-black text-sm text-neutral-900">
                        Rp {item.subtotal.toLocaleString("id-ID")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Address & Payment Summary */}
          <div className="lg:col-span-4 space-y-6">
            {/* Shipping Address */}
            <div className="rounded-3xl border border-neutral-200/90 bg-white p-6 shadow-md space-y-4">
              <div className="flex items-center gap-2 border-b border-neutral-100 pb-3 text-neutral-900">
                <MapPin className="h-4 w-4" />
                <h3 className="text-xs font-black uppercase tracking-wider">
                  Alamat Pengiriman
                </h3>
              </div>

              <div className="text-xs space-y-1.5 text-neutral-700 leading-relaxed font-medium">
                <p className="font-black text-sm text-neutral-900">
                  {order.shippingAddress.recipient}
                </p>
                <p className="text-neutral-500">{order.shippingAddress.phone}</p>
                <p>{order.shippingAddress.street}</p>
                {order.shippingAddress.apartment && (
                  <p>{order.shippingAddress.apartment}</p>
                )}
                <p>
                  {order.shippingAddress.city}, {order.shippingAddress.province}{" "}
                  {order.shippingAddress.postalCode}
                </p>
                <p className="font-bold text-neutral-900">
                  {order.shippingAddress.country}
                </p>
              </div>
            </div>

            {/* Payment Summary */}
            <div className="rounded-3xl border border-neutral-200/90 bg-white p-6 shadow-md space-y-4">
              <div className="flex items-center gap-2 border-b border-neutral-100 pb-3 text-neutral-900">
                <CreditCard className="h-4 w-4" />
                <h3 className="text-xs font-black uppercase tracking-wider">
                  Rincian Pembayaran
                </h3>
              </div>

              <div className="space-y-2.5 text-xs text-neutral-600 font-medium">
                <div className="flex justify-between">
                  <span>Metode</span>
                  <span className="font-bold text-neutral-900">
                    {order.payment.paymentType}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Status Pembayaran</span>
                  <span className="font-black text-emerald-800 bg-emerald-100/70 px-2.5 py-0.5 rounded-full">
                    {order.payment.status}
                  </span>
                </div>
                <div className="border-t border-neutral-100 pt-2.5 flex justify-between">
                  <span>Subtotal Produk</span>
                  <span>Rp {order.subtotal.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ongkos Kirim ({order.shipment.courier})</span>
                  <span>Rp {order.shippingCost.toLocaleString("id-ID")}</span>
                </div>
                {order.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Diskon</span>
                    <span>-Rp {order.discountAmount.toLocaleString("id-ID")}</span>
                  </div>
                )}
                <div className="border-t border-neutral-200 pt-3 flex justify-between text-sm font-black text-black">
                  <span>Total Akhir</span>
                  <span className="text-[#396254]">Rp {order.totalAmount.toLocaleString("id-ID")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-neutral-200 bg-white py-6 text-center text-xs text-neutral-500">
        &copy; 2026 it&apos;smatapanda. All rights reserved.
      </footer>
    </div>
  );
}
