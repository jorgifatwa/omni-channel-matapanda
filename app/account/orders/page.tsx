"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Truck,
  ArrowRight,
  ShoppingBag,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  RefreshCw,
  Package,
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

interface CustomerOrder {
  id: string;
  orderNumber: string;
  date: string;
  createdAt: string;
  status: string;
  totalAmount: number;
  subtotal: number;
  shippingCost: number;
  currency: string;
  paymentStatus: string;
  paymentMethod: string;
  courier: string;
  courierService: string;
  trackingNumber: string | null;
  shipmentStatus: string;
  itemCount: number;
  items: OrderItem[];
}

function getPaymentBadge(status: string) {
  const normalized = (status || "").toUpperCase();
  if (normalized === "SETTLEMENT" || normalized === "PAID" || normalized === "CAPTURE") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Lunas
      </span>
    );
  }
  if (normalized === "PENDING") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-200">
        <Clock className="h-3.5 w-3.5" />
        Menunggu Pembayaran
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-semibold border border-rose-200">
      <AlertCircle className="h-3.5 w-3.5" />
      Dibatalkan
    </span>
  );
}

function getShipmentBadge(status: string) {
  const normalized = (status || "").toUpperCase();
  if (normalized === "DELIVERED" || normalized === "COMPLETED") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Terkirim
      </span>
    );
  }
  if (normalized === "IN_TRANSIT" || normalized === "OUT_FOR_DELIVERY" || normalized === "PICKED_UP") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
        <Truck className="h-3.5 w-3.5" />
        Dalam Pengiriman
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-700 text-xs font-semibold border border-neutral-200">
      <Clock className="h-3.5 w-3.5" />
      Diproses
    </span>
  );
}

export default function CustomerOrdersPage() {
  const { status } = useSession();
  const router = useRouter();

  const [orders, setOrders] = React.useState<CustomerOrder[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/account/login?callbackUrl=/account/orders");
    }
  }, [status, router]);

  React.useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/account/orders")
        .then((res) => (res.ok ? res.json() : { orders: [] }))
        .then((data) => {
          setOrders(data.orders || []);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    }
  }, [status]);

  if (status === "loading" || (loading && status === "authenticated")) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col font-sans">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-6 text-sm text-neutral-500">
          <div className="flex items-center gap-3">
            <RefreshCw className="h-4 w-4 animate-spin text-neutral-800" />
            <span>Memuat data pesanan...</span>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col font-sans text-neutral-900">
      <Navbar />

      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        {/* Page Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-200 pb-6">
          <div>
            <span className="text-xs uppercase font-bold tracking-widest text-neutral-500">
              Riwayat Pembelian
            </span>
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-black mt-1">
              Pesanan Saya
            </h1>
          </div>
          <Link
            href="/new-arrivals"
            className="inline-flex items-center gap-2 self-start sm:self-auto rounded-xl bg-black px-5 py-2.5 text-xs font-semibold text-white hover:bg-neutral-800 transition-colors uppercase tracking-wider"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            <span>Belanja Lagi</span>
          </Link>
        </div>

        {/* Orders List / Empty State */}
        {orders.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-neutral-200 bg-white p-10 sm:p-16 text-center space-y-4 shadow-sm">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#d5c6ff]/40 text-[#396254] shadow-sm">
              <Package className="h-8 w-8 text-[#396254]" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-neutral-900 uppercase">
              Belum Ada Pesanan
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500 max-w-sm mx-auto leading-relaxed font-medium">
              Kamu belum memiliki riwayat pesanan. Yuk eksplor koleksi tas seru kami sekarang!
            </p>
            <div className="pt-2">
              <Link
                href="/new-arrivals"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#396254] hover:bg-[#2b4c41] px-7 py-3.5 text-xs font-black text-white hover:-translate-y-0.5 active:scale-95 transition-all uppercase tracking-wider shadow-md cursor-pointer"
              >
                <span>Mulai Belanja</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div
                key={order.id}
                className="rounded-3xl border border-neutral-200/90 bg-white p-6 sm:p-7 shadow-md hover:shadow-lg transition-all space-y-5"
              >
                {/* Header bar of Order Card */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-4">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="font-mono font-black text-sm text-[#396254] bg-[#d5c6ff]/30 px-2.5 py-0.5 rounded-full">
                      {order.orderNumber}
                    </span>
                    <span className="text-xs text-neutral-400">&bull;</span>
                    <span className="text-xs text-neutral-500 font-medium">
                      {new Date(order.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {getPaymentBadge(order.paymentStatus)}
                    {getShipmentBadge(order.shipmentStatus)}
                  </div>
                </div>

                {/* Items preview */}
                <div className="divide-y divide-neutral-100">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="relative h-16 w-14 shrink-0 rounded-2xl bg-neutral-100 overflow-hidden border border-neutral-200">
                          <Image
                            src={item.image}
                            alt={item.productName}
                            fill
                            sizes="56px"
                            className="object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-black text-sm text-neutral-900 truncate uppercase">
                            {item.productName}
                          </h3>
                          <p className="text-xs text-neutral-500 mt-0.5 font-medium">
                            {item.quantity} &times; Rp {item.unitPrice.toLocaleString("id-ID")} &bull; Size: {item.size}
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

                {/* Footer bar with Total and Tracking Button */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-neutral-100 bg-neutral-50/70 -mx-6 -mb-6 p-6 sm:p-7 rounded-b-3xl">
                  <div className="flex items-center gap-6">
                    <div>
                      <span className="text-[11px] text-neutral-500 block uppercase tracking-wider font-semibold">
                        Kurir Pengiriman
                      </span>
                      <span className="text-xs font-bold text-neutral-800 flex items-center gap-1.5 mt-0.5">
                        <Truck className="h-3.5 w-3.5 text-[#396254]" />
                        {order.courier} ({order.courierService})
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] text-neutral-500 block uppercase tracking-wider font-semibold">
                        Total Belanja
                      </span>
                      <span className="text-base font-black text-[#396254] mt-0.5 block">
                        Rp {order.totalAmount.toLocaleString("id-ID")}
                      </span>
                    </div>
                  </div>

                  <Link
                    href={`/account/orders/${order.id}`}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[#396254] hover:bg-[#2b4c41] px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white transition-all hover:-translate-y-0.5 active:scale-95 shadow-sm cursor-pointer"
                  >
                    <span>Lacak &amp; Detail</span>
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-neutral-200 bg-white py-6 text-center text-xs text-neutral-500">
        &copy; 2026 it&apos;smatapanda. All rights reserved.
      </footer>
    </div>
  );
}
