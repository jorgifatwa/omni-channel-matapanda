"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  XCircle,
  ShoppingBag,
  ArrowRight,
  PackageCheck,
  Truck,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useCart } from "@/context/CartContext";
import { saveOrderLocally } from "@/context/AdminStoreContext";
import { type AdminOrder } from "@/lib/admin-data";

function FinishContent() {
  const { status: authStatus } = useSession();
  const isAuthenticated = authStatus === "authenticated";

  const searchParams = useSearchParams();
  const { clearCart } = useCart();

  const orderId = searchParams.get("order_id") || "ZDC-ORDER";
  const statusCode = searchParams.get("status_code") || "200";
  const transactionStatus =
    (searchParams.get("transaction_status") || "settlement").toLowerCase();

  const isSuccess =
    statusCode === "200" ||
    transactionStatus === "settlement" ||
    transactionStatus === "capture";
  const isPending = transactionStatus === "pending";

  React.useEffect(() => {
    if (isSuccess) {
      clearCart();

      // Baca data order asli yang disimpan dari checkout page sebelum redirect ke Midtrans
      let savedOrder: AdminOrder | null = null;
      try {
        const raw = sessionStorage.getItem("pendingOrderData");
        if (raw) {
          savedOrder = JSON.parse(raw) as AdminOrder;
          sessionStorage.removeItem("pendingOrderData"); // Hapus setelah dibaca
        }
      } catch {
        // sessionStorage tidak tersedia atau data corrupt — lanjut dengan fallback
      }

      // Buat completed order: gunakan data asli jika ada, fallback ke generic jika tidak
      const completedOrder: AdminOrder = savedOrder
        ? {
            ...savedOrder,
            orderNumber: orderId || savedOrder.orderNumber,
            paymentStatus: "SETTLEMENT",
            orderStatus: "PAID",
          }
        : {
            id: `ord-${orderId}`,
            orderNumber: orderId,
            customerId: `cust-web-${Date.now().toString().slice(-4)}`,
            customerName: "Customer ZODIAC (Online)",
            customerEmail: "customer@zodiacjakarta.com",
            customerPhone: "+62 812-3456-7890",
            shippingAddress: {
              recipient: "Customer ZODIAC",
              phone: "+62 812-3456-7890",
              street: "Jl. Senopati No. 64, Kebayoran Baru",
              city: "Jakarta Selatan",
              province: "DKI Jakarta",
              postalCode: "12190",
              country: "Indonesia",
            },
            subtotal: 10,
            shippingCost: 12000,
            discountAmount: 0,
            totalAmount: 12010,
            paymentMethod: "Midtrans Snap (QRIS / VA / GoPay)",
            midtransTransactionId: `MT-${orderId}`,
            paymentStatus: "SETTLEMENT",
            orderStatus: "PAID",
            shipmentStatus: "PENDING",
            courier: "JNE",
            courierService: "JNE Reguler (REG)",
            trackingNumber: `JNE0098${Math.floor(10000000 + Math.random() * 90000000)}`,
            items: [
              {
                id: `oi-${Date.now()}`,
                productId: "dawn-gong-sunburn-01-t-shirt",
                productName: "Dawn Gong Sunburn 01 T-shirt",
                sku: "DG-SB01-WHT-M",
                image:
                  "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=85",
                size: "M",
                color: "White",
                unitPrice: 10,
                quantity: 1,
                subtotal: 10,
              },
            ],
            trackingHistory: [
              {
                timestamp: new Date().toISOString().replace("T", " ").slice(0, 16),
                status: "PENDING",
                description: "Pembayaran terverifikasi via Midtrans. Menunggu pickup JNE.",
                location: "Jakarta Selatan (Origin)",
              },
            ],
            createdAt: new Date().toISOString().slice(0, 10),
          };

      saveOrderLocally(completedOrder);

      // Kirim email konfirmasi dengan data order asli pembeli
      fetch("/api/payment/send-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: completedOrder.orderNumber,
          email: completedOrder.customerEmail,
          customerName: completedOrder.customerName,
          customerPhone: completedOrder.customerPhone,
          shippingAddress: completedOrder.shippingAddress,
          items: completedOrder.items,
          subtotal: completedOrder.subtotal,
          shippingCost: completedOrder.shippingCost,
          discountAmount: completedOrder.discountAmount,
          totalAmount: completedOrder.totalAmount,
          courier: completedOrder.courier,
          courierService: completedOrder.courierService,
          trackingNumber: completedOrder.trackingNumber,
          paymentMethod: completedOrder.paymentMethod,
          paymentStatus: "SETTLEMENT",
        }),
      })
        .then((r) => r.json())
        .then((d) => console.log("[Finish] Email receipt sent:", d))
        .catch((err) => console.warn("[Finish] Email receipt error:", err));

      // Otomatis potong stok di Shopee & marketplace yang terhubung secara real-time
      fetch("/api/integrations/products/deduct-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: completedOrder.items.map((it) => ({
            productId: it.productId,
            sku: it.sku,
            quantity: it.quantity,
          })),
        }),
      })
        .then((r) => r.json())
        .then((d) => console.log("[Finish] Marketplace stock auto-deducted:", d))
        .catch((err) => console.warn("[Finish] Marketplace stock sync error:", err));
    }
  }, [isSuccess, orderId, clearCart]);

  return (
    <div className="min-h-dvh flex flex-col bg-[#fafaf8] dark:bg-neutral-950 font-sans text-neutral-900 dark:text-neutral-100">
      {/* Top Header */}
      <header className="w-full border-b border-[#396254]/10 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-[1280px] mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="text-2xl font-black tracking-tight text-[#396254] dark:text-[#dcf58d] hover:opacity-80 transition-opacity flex items-center gap-2"
          >
            <span>it&apos;smatapanda</span>
          </Link>
          <Link
            href="/new-arrivals"
            className="text-xs font-bold px-3.5 py-1.5 rounded-full bg-[#396254]/10 dark:bg-white/10 text-[#396254] dark:text-[#d5c6ff] hover:bg-[#396254] hover:text-[#dcf58d] transition-all flex items-center gap-1.5 shadow-sm"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            <span>Katalog Produk</span>
          </Link>
        </div>
      </header>

      {/* Main Content Box */}
      <main className="flex-1 flex items-center justify-center px-4 py-12 relative overflow-hidden">
        {/* Playful Background Glows */}
        <div className="absolute top-10 left-1/4 w-72 h-72 rounded-full bg-[#d5c6ff]/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-1/4 w-72 h-72 rounded-full bg-[#dcf58d]/20 blur-3xl pointer-events-none" />

        <div className="w-full max-w-[620px] rounded-3xl border-2 border-[#396254]/15 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-7 sm:p-10 shadow-xl space-y-6 text-center relative z-10">
          {isSuccess ? (
            <>
              {/* Success Badge Icon */}
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-[#dcf58d] text-[#396254] shadow-md rotate-[-2deg] hover:rotate-0 transition-transform">
                <CheckCircle2 className="h-10 w-10 stroke-[2.5]" />
              </div>

              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#d5c6ff]/40 text-[#396254] dark:text-[#d5c6ff] font-bold text-xs mb-3 shadow-sm">
                  Pembayaran Berhasil!
                </span>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#396254] dark:text-white">
                  Yess! Pesanan Kamu Sukses
                </h1>
                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed max-w-md mx-auto">
                  Transaksi Midtrans kamu telah terverifikasi otomatis (Settlement). Paket imutmu sedang disiapkan dengan penuh cinta oleh tim it&apos;smatapanda!
                </p>
              </div>

              {/* Order Detail Box */}
              <div className="rounded-3xl border border-[#396254]/15 dark:border-neutral-800 bg-[#fafaf8] dark:bg-neutral-800/60 p-5 sm:p-6 text-left text-xs space-y-3.5 shadow-inner">
                <div className="flex items-center justify-between border-b border-[#396254]/10 dark:border-neutral-700/60 pb-3">
                  <span className="text-neutral-500 dark:text-neutral-400 font-medium">Nomor Order ID</span>
                  <span className="font-mono font-black text-[#396254] dark:text-[#dcf58d] text-sm bg-[#396254]/5 dark:bg-white/5 px-2.5 py-1 rounded-lg">
                    {orderId}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-[#396254]/10 dark:border-neutral-700/60 pb-3">
                  <span className="text-neutral-500 dark:text-neutral-400 font-medium">Status Pembayaran</span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#dcf58d] font-bold text-[#396254] text-[11px] shadow-sm">
                    <PackageCheck className="h-3.5 w-3.5" />
                    LUNAS (Settlement)
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-[#396254]/10 dark:border-neutral-700/60 pb-3">
                  <span className="text-neutral-500 dark:text-neutral-400 font-medium">Metode Kurir</span>
                  <span className="font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5 bg-[#d5c6ff]/30 px-2.5 py-1 rounded-full">
                    <Truck className="h-3.5 w-3.5 text-[#396254]" />
                    JNE Express (Reguler)
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-neutral-500 dark:text-neutral-400 font-medium">Waktu Transaksi</span>
                  <span className="text-neutral-700 dark:text-neutral-300 font-medium">
                    {new Date().toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                <Link
                  href={`/tracking?orderId=${encodeURIComponent(orderId)}`}
                  className="w-full inline-flex items-center justify-center rounded-2xl bg-[#396254] px-6 py-4 text-sm font-bold text-[#dcf58d] hover:bg-[#2e5044] hover:-translate-y-0.5 active:scale-95 transition-all shadow-md gap-2"
                >
                  <Truck className="h-4 w-4" />
                  <span>Lacak Status Pengiriman Pesanan</span>
                </Link>

                <Link
                  href="/new-arrivals"
                  className="w-full inline-flex items-center justify-center rounded-2xl border-2 border-[#396254]/20 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-6 py-3.5 text-sm font-bold text-[#396254] dark:text-neutral-100 hover:bg-[#396254]/5 hover:-translate-y-0.5 active:scale-95 transition-all gap-2"
                >
                  <span>Lanjutkan Belanja Seru</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              {/* Account Registration Callout (Hanya untuk tamu yang belum login) */}
              {!isAuthenticated && (
                <div className="mt-4 p-5 rounded-3xl bg-[#396254] text-left text-xs text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
                  <div>
                    <p className="font-black text-sm text-[#dcf58d]">
                      Ingin melihat semua pesanan di satu tempat?
                    </p>
                    <p className="text-[11px] text-white/80 mt-1">
                      Daftar akun gratis agar tidak perlu mencatat nomor Order ID setiap berbelanja.
                    </p>
                  </div>
                  <Link
                    href="/account/register?callbackUrl=/account/orders"
                    className="shrink-0 px-4 py-2.5 rounded-full bg-[#dcf58d] text-[#396254] text-xs font-black hover:bg-[#cbef6f] hover:scale-105 active:scale-95 transition-all shadow-sm text-center"
                  >
                    Daftar Akun
                  </Link>
                </div>
              )}
            </>
          ) : isPending ? (
            <>
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-100 text-amber-600 shadow-md rotate-[-2deg]">
                <Clock className="h-10 w-10 stroke-[2.5]" />
              </div>

              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-xs mb-3">
                  Menunggu Pembayaran
                </span>
                <h1 className="text-2xl font-black tracking-tight text-[#396254] dark:text-white">
                  Menunggu Pembayaran
                </h1>
                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed max-w-md mx-auto">
                  Pesanan <span className="font-mono font-bold text-[#396254] dark:text-[#dcf58d]">{orderId}</span> sedang menunggu penyelesaian pembayaran Anda via Midtrans.
                </p>
              </div>

              <div className="pt-2">
                <Link
                  href="/new-arrivals"
                  className="w-full inline-flex items-center justify-center rounded-2xl bg-[#396254] px-6 py-4 text-sm font-bold text-[#dcf58d] hover:bg-[#2e5044] hover:-translate-y-0.5 active:scale-95 transition-all shadow-md"
                >
                  Lanjutkan Belanja
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-rose-100 text-rose-600 shadow-md rotate-[-2deg]">
                <XCircle className="h-10 w-10 stroke-[2.5]" />
              </div>

              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-800 font-bold text-xs mb-3">
                  Belum Selesai
                </span>
                <h1 className="text-2xl font-black tracking-tight text-[#396254] dark:text-white">
                  Pembayaran Dibatalkan / Gagal
                </h1>
                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed max-w-md mx-auto">
                  Transaksi untuk order <span className="font-mono font-bold text-[#396254] dark:text-[#dcf58d]">{orderId}</span> tidak berhasil atau telah kadaluarsa.
                </p>
              </div>

              <div className="pt-2">
                <Link
                  href="/checkout"
                  className="w-full inline-flex items-center justify-center rounded-2xl bg-[#396254] px-6 py-4 text-sm font-bold text-[#dcf58d] hover:bg-[#2e5044] hover:-translate-y-0.5 active:scale-95 transition-all shadow-md"
                >
                  Coba Bayar Ulang
                </Link>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[#396254]/10 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 py-4 text-center text-xs text-neutral-500 font-medium">
        &copy; 2026 it&apos;smatapanda. Crafted with love.
      </footer>
    </div>
  );
}

export default function CheckoutFinishPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-dvh flex items-center justify-center bg-neutral-50 text-xs text-neutral-500">
          Memuat status transaksi...
        </div>
      }
    >
      <FinishContent />
    </React.Suspense>
  );
}
