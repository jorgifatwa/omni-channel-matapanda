"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Search,
  CheckCircle2,
  Copy,
  Check,
  ArrowRight,
  Loader2,
  AlertCircle,
  UserPlus,
  Mail,
  MapPin,
  Radio,
  ShoppingBag,
  CreditCard,
  Truck,
} from "lucide-react";
import { useSession } from "next-auth/react";
import Navbar from "@/components/Navbar";

interface TrackingCheckpoint {
  timestamp: string;
  status: string;
  description: string;
  location: string;
}

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

interface OrderTrackingData {
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
    city: string;
    province: string;
    country: string;
  };
  items: OrderItem[];
}

const ORDER_STEPS = [
  { key: "CREATED", label: "Pesanan Dibuat", description: "Pesanan tercatat" },
  { key: "PAID", label: "Pembayaran Lunas", description: "Terverifikasi" },
  { key: "PROCESSING", label: "Sedang Dikemas", description: "Diproses gudang" },
  { key: "SHIPPED", label: "Dalam Pengiriman", description: "Diserahkan ke kurir" },
  { key: "DELIVERED", label: "Pesanan Selesai", description: "Paket diterima" },
];

function getStepIndex(shipmentStatus: string, paymentStatus: string) {
  const normShip = (shipmentStatus || "").toUpperCase();
  const normPay = (paymentStatus || "").toUpperCase();

  if (normShip === "DELIVERED" || normShip === "COMPLETED") return 4;
  if (normShip === "IN_TRANSIT" || normShip === "OUT_FOR_DELIVERY" || normShip === "PICKED_UP") return 3;
  if (normShip === "PROCESSING" || normPay === "SETTLEMENT" || normPay === "PAID") return 2;
  if (normPay === "SETTLEMENT" || normPay === "PAID") return 1;
  return 0;
}

function TrackingContent() {
  const { status: authStatus } = useSession();
  const isAuthenticated = authStatus === "authenticated";

  const searchParams = useSearchParams();
  const initialOrderId = searchParams.get("orderId") || searchParams.get("resi") || searchParams.get("waybill") || "";
  const initialEmail = searchParams.get("email") || "";

  const [searchKey, setSearchKey] = React.useState(initialOrderId);
  const [emailOrPhone, setEmailOrPhone] = React.useState(initialEmail);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<OrderTrackingData | null>(null);
  const [copiedResi, setCopiedResi] = React.useState(false);

  const performLookup = React.useCallback(async (query: string, email: string) => {
    if (!query || !query.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/tracking/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: query.trim(),
          email: email.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Pesanan tidak ditemukan. Periksa kembali nomor Order ID atau No. Resi.");
        setResult(null);
      } else {
        setResult(data.order);
      }
    } catch {
      setError("Terjadi gangguan saat mengambil data. Silakan coba lagi.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (initialOrderId) {
      performLookup(initialOrderId, initialEmail);
    }
  }, [initialOrderId, initialEmail, performLookup]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performLookup(searchKey, emailOrPhone);
  };

  const copyResi = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedResi(true);
    setTimeout(() => setCopiedResi(false), 2000);
  };

  const currentStep = result
    ? getStepIndex(result.shipment.status, result.payment.status)
    : 0;

  return (
    <div className="max-w-[1200px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12">
      {/* Hero Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3.5">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#d5c6ff] text-[#396254] text-xs font-black uppercase tracking-wider shadow-xs">
          <span>Order Tracker</span>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-black">
          Lacak Paketmu
        </h1>
        <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed font-medium">
          Masukkan Nomor Order ID (contoh: <span className="font-mono font-bold text-[#396254] bg-[#d5c6ff]/30 px-2 py-0.5 rounded-md">ZDC-2026-9812</span>) atau Nomor Resi Kurir Anda untuk cek posisi paketmu secara instan!
        </p>
      </div>

      {/* Search Input Box */}
      <div className="max-w-xl mx-auto">
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-neutral-200/90 bg-white p-6 sm:p-8 shadow-lg space-y-5"
        >
          <div>
            <label
              htmlFor="searchKey"
              className="block text-xs font-black uppercase tracking-wider text-neutral-800 mb-2 flex items-center gap-1.5"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Nomor Order ID atau Resi Kurir</span>
            </label>
            <div className="relative">
              <input
                id="searchKey"
                type="text"
                required
                placeholder="Contoh: ZDC-2026-9812 atau JNE009823718291"
                value={searchKey}
                onChange={(e) => setSearchKey(e.target.value)}
                className="w-full rounded-2xl border border-neutral-300 py-3.5 pl-4 pr-10 text-sm text-black placeholder:text-neutral-400 focus:border-[#396254] focus:outline-none focus:ring-2 focus:ring-[#396254]/20 transition-all font-medium"
              />
              <Search className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            </div>
          </div>

          <div>
            <label
              htmlFor="emailOrPhone"
              className="block text-xs font-black uppercase tracking-wider text-neutral-800 mb-2 flex items-center gap-1.5"
            >
              <Mail className="h-3.5 w-3.5" />
              <span>Email atau No. Handphone (Opsional)</span>
            </label>
            <input
              id="emailOrPhone"
              type="text"
              placeholder="nama@email.com atau 08123456789"
              value={emailOrPhone}
              onChange={(e) => setEmailOrPhone(e.target.value)}
              className="w-full rounded-2xl border border-neutral-300 py-3.5 px-4 text-sm text-black placeholder:text-neutral-400 focus:border-[#396254] focus:outline-none focus:ring-2 focus:ring-[#396254]/20 transition-all font-medium"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-full bg-[#396254] hover:bg-[#2b4c41] py-4 px-6 text-xs sm:text-sm font-black uppercase tracking-wider text-white transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 shadow-md cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Melacak Paket...</span>
              </>
            ) : (
              <>
                <span>Lacak Status Pengiriman</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {error && (
          <div className="mt-4 p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 font-bold flex items-center gap-2.5 shadow-xs">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Tracking Result View */}
      {result && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Order Header Summary */}
          <div className="rounded-3xl border border-neutral-200/90 bg-white p-6 sm:p-8 shadow-md space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 pb-5">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-[#396254] flex items-center gap-1">
                  <span>Hasil Pelacakan Pesanan</span>
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-black font-mono mt-0.5">
                  {result.orderNumber}
                </h2>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-black shadow-xs">
                  {result.payment.status === "SETTLEMENT" || result.payment.status === "PAID"
                    ? "LUNAS"
                    : "MENUNGGU PEMBAYARAN"}
                </span>
                <span className="px-3.5 py-1.5 rounded-full bg-[#d5c6ff] text-[#396254] text-xs font-black shadow-xs">
                  {result.shipment.status === "IN_TRANSIT"
                    ? "DALAM PENGIRIMAN"
                    : result.shipment.status === "DELIVERED"
                    ? "TERKIRIM"
                    : "SEDANG DIKEMAS"}
                </span>
              </div>
            </div>

            {/* Visual Step Progress Tracker */}
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-neutral-800 mb-6 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                <span>Tahapan Perjalanan Paket</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 relative">
                {ORDER_STEPS.map((step, idx) => {
                  const isCompleted = idx <= currentStep;
                  const isCurrent = idx === currentStep;

                  return (
                    <div
                      key={step.key}
                      className="flex flex-col items-start sm:items-center text-left sm:text-center relative"
                    >
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
          </div>

          {/* Courier Checkpoints and Details Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Courier Logs */}
            <div className="lg:col-span-8 space-y-6">
              {/* Courier Card */}
              <div className="rounded-3xl border border-neutral-200/90 bg-white p-6 sm:p-7 shadow-md space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#d5c6ff] text-[#396254] shadow-xs">
                      <Truck className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-black text-sm text-neutral-900 uppercase tracking-tight">
                        {result.shipment.courier} &mdash; {result.shipment.serviceName}
                      </h3>
                      <p className="text-xs text-neutral-500 font-medium">
                        Estimasi Tiba: <span className="font-bold text-neutral-800">{result.shipment.estimatedDays}</span>
                      </p>
                    </div>
                  </div>

                  {result.shipment.trackingNumber && (
                    <div className="flex items-center gap-2 bg-[#d5c6ff]/20 border border-[#d5c6ff]/50 rounded-2xl px-3.5 py-2">
                      <span className="text-xs font-bold text-[#396254]">No. Resi:</span>
                      <span className="font-mono font-bold text-xs text-black">
                        {result.shipment.trackingNumber}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyResi(result.shipment.trackingNumber!)}
                        aria-label="Salin resi"
                        className="text-neutral-500 hover:text-black p-1 transition-colors cursor-pointer"
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

                {/* Checkpoint list */}
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-neutral-700 mb-4 flex items-center gap-1.5">
                    <Radio className="h-3.5 w-3.5" />
                    <span>Riwayat Perjalanan Paket Live</span>
                  </h4>
                  {result.shipment.trackingHistory && result.shipment.trackingHistory.length > 0 ? (
                    <div className="space-y-4 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#396254]/30 pl-6">
                      {result.shipment.trackingHistory.map((log, index) => (
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
                    <p className="text-xs text-neutral-500 italic">
                      Paket sedang dalam persiapan di pusat logistik it&apos;smatapanda dan segera di-pickup oleh kurir {result.shipment.courier}.
                    </p>
                  )}
                </div>
              </div>

              {/* Items in this order */}
              <div className="rounded-3xl border border-neutral-200/90 bg-white p-6 sm:p-7 shadow-md space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-neutral-800 border-b border-neutral-100 pb-3 flex items-center gap-1.5">
                  <ShoppingBag className="h-3.5 w-3.5" />
                  <span>Barang yang Dipesan ({result.items.reduce((acc, it) => acc + it.quantity, 0)} Item)</span>
                </h3>

                <div className="divide-y divide-neutral-100">
                  {result.items.map((item) => (
                    <div
                      key={item.id}
                      className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="relative h-18 w-14 shrink-0 rounded-2xl bg-neutral-100 overflow-hidden border border-neutral-200/80">
                          <Image
                            src={item.image}
                            alt={item.productName}
                            fill
                            sizes="56px"
                            className="object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-black text-sm text-neutral-900 truncate uppercase">
                            {item.productName}
                          </h4>
                          <p className="text-xs text-neutral-500 mt-0.5 font-medium">
                            Size: {item.size} &bull; Warna: {item.color} &bull; Qty: {item.quantity}
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

            {/* Right Column: Address & Register Banner */}
            <div className="lg:col-span-4 space-y-6">
              {/* Destination address */}
              <div className="rounded-3xl border border-neutral-200/90 bg-white p-6 shadow-md space-y-4">
                <div className="flex items-center gap-2 border-b border-neutral-100 pb-3 text-neutral-900">
                  <MapPin className="h-4 w-4" />
                  <h3 className="text-xs font-black uppercase tracking-wider">
                    Tujuan Pengiriman
                  </h3>
                </div>

                <div className="text-xs space-y-1.5 text-neutral-700 leading-relaxed font-medium">
                  <p className="font-black text-sm text-neutral-900">
                    {result.shippingAddress.recipient}
                  </p>
                  <p>
                    {result.shippingAddress.city}, {result.shippingAddress.province}
                  </p>
                  <p className="font-bold text-neutral-900">
                    {result.shippingAddress.country}
                  </p>
                </div>
              </div>

              {/* Payment Summary */}
              <div className="rounded-3xl border border-neutral-200/90 bg-white p-6 shadow-md space-y-4">
                <div className="flex items-center gap-2 border-b border-neutral-100 pb-3 text-neutral-900">
                  <CreditCard className="h-4 w-4" />
                  <h3 className="text-xs font-black uppercase tracking-wider">
                    Ringkasan Biaya
                  </h3>
                </div>

                <div className="space-y-2 text-xs text-neutral-600 font-medium">
                  <div className="flex justify-between">
                    <span>Metode</span>
                    <span className="font-bold text-neutral-900">
                      {result.payment.paymentType}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>Rp {result.subtotal.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ongkos Kirim ({result.shipment.courier})</span>
                    <span>Rp {result.shippingCost.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="border-t border-neutral-200 pt-2.5 flex justify-between text-sm font-black text-black">
                    <span>Total Pembayaran</span>
                    <span className="text-[#396254]">Rp {result.totalAmount.toLocaleString("id-ID")}</span>
                  </div>
                </div>
              </div>

              {/* Guest to Account Conversion Callout (Hanya tampil untuk pengunjung yang belum login) */}
              {!isAuthenticated && (
                <div className="rounded-3xl border border-[#396254] bg-[#396254] p-6 text-white shadow-lg space-y-3">
                  <div className="flex items-center gap-2 text-[#dcf58d]">
                    <UserPlus className="h-4 w-4" />
                    <h4 className="text-xs font-black uppercase tracking-wider">
                      Buat Akun Customer
                    </h4>
                  </div>
                  <p className="text-xs text-neutral-100/90 leading-relaxed font-medium">
                    Simpan semua pesananmu dalam satu dashboard seru tanpa perlu ketik Order ID lagi!
                  </p>
                  <Link
                    href="/account/register?callbackUrl=/account/orders"
                    className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#dcf58d] hover:bg-[#c9e875] px-4 py-3 text-xs font-black text-[#396254] uppercase tracking-wider transition-all hover:-translate-y-0.5 active:scale-95 shadow-sm cursor-pointer"
                  >
                    <span>Daftar Akun Gratis</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TrackingPage() {
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col font-sans text-neutral-900">
      <Navbar />
      <main className="flex-1">
        <React.Suspense
          fallback={
            <div className="min-h-[400px] flex items-center justify-center text-xs text-neutral-500">
              Memuat sistem pelacakan...
            </div>
          }
        >
          <TrackingContent />
        </React.Suspense>
      </main>
      <footer className="border-t border-neutral-200 bg-white py-6 text-center text-xs text-neutral-500">
        &copy; 2026 it&apos;smatapanda. All rights reserved.
      </footer>
    </div>
  );
}
