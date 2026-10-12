"use client";

import * as React from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Package,
  LogOut,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import Navbar from "@/components/Navbar";

export default function AccountProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/account/login?callbackUrl=/account");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col font-sans">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-6 text-sm text-neutral-500">
          Memuat informasi akun...
        </main>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#fafaf8] flex flex-col font-sans text-neutral-900">
      <Navbar />

      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        {/* Page Header */}
        <div className="mb-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-200/80 pb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#d5c6ff] text-[#396254] text-xs font-black uppercase tracking-wider shadow-xs mb-2">
              <span>Dashboard Customer</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-black mt-1">
              Akun Saya
            </h1>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="inline-flex items-center gap-2 self-start sm:self-auto rounded-full border border-neutral-200 bg-white px-5 py-2.5 text-xs font-black uppercase tracking-wider text-neutral-700 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all active:scale-95 cursor-pointer shadow-xs"
          >
            <LogOut className="h-4 w-4" />
            <span>Keluar Akun</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {/* User Profile Card */}
          <div className="md:col-span-1 rounded-3xl border border-neutral-200/90 bg-white p-7 shadow-md space-y-6">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#396254] text-[#dcf58d] font-black text-2xl shadow-sm">
                {session.user.name ? session.user.name.charAt(0).toUpperCase() : "U"}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-black text-base text-neutral-900 uppercase truncate">
                  {session.user.name || "Customer"}
                </h2>
                <p className="text-xs text-neutral-500 font-medium truncate">
                  {session.user.email}
                </p>
                <span className="mt-1.5 inline-block px-2.5 py-0.5 rounded-full bg-[#d5c6ff] text-[#396254] text-[10px] font-black uppercase tracking-wider shadow-xs">
                  {(session.user as { role?: string }).role || "CUSTOMER"}
                </span>
              </div>
            </div>

            <div className="border-t border-neutral-100 pt-4 space-y-3 text-xs text-neutral-600 font-medium">
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Status Keanggotaan</span>
                <span className="font-bold text-emerald-600 flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Aktif Terverifikasi
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Mata Uang Pilihan</span>
                <span className="font-bold text-neutral-900">IDR (Rupiah)</span>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href="/account/orders"
                className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#396254] hover:bg-[#2b4c41] px-5 py-3.5 text-xs font-black uppercase tracking-wider text-white transition-all hover:-translate-y-0.5 active:scale-95 shadow-md cursor-pointer"
              >
                <Package className="h-4 w-4" />
                <span>Lihat Riwayat Pesanan</span>
              </Link>
            </div>
          </div>

          {/* Quick Actions & Highlights */}
          <div className="md:col-span-2 space-y-6">
            {/* Action Banner */}
            <div className="rounded-3xl border border-neutral-200/90 bg-white p-6 sm:p-8 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="space-y-2 max-w-md">
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#d5c6ff] text-[#396254] text-[10px] font-black uppercase tracking-wider">
                  Realtime Tracking
                </div>
                <h3 className="text-lg font-black text-neutral-900 uppercase">
                  Lacak Pengiriman Pesananmu
                </h3>
                <p className="text-xs text-neutral-600 font-medium leading-relaxed">
                  Periksa nomor resi kurir, status pengiriman live, dan detail tas belanjaanmu secara realtime.
                </p>
              </div>
              <Link
                href="/account/orders"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#396254] hover:bg-[#2b4c41] px-6 py-3.5 text-xs font-black uppercase tracking-wider text-white transition-all hover:-translate-y-0.5 active:scale-95 shadow-md shrink-0 cursor-pointer"
              >
                <span>Pesanan Saya</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Store Browsing Box */}
            <div className="rounded-3xl border border-neutral-200/90 bg-white p-6 sm:p-8 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="space-y-2 max-w-md">
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#ED96D7]/20 text-[#ED96D7] text-[10px] font-black uppercase tracking-wider">
                  Koleksi Baru
                </div>
                <h3 className="text-lg font-black text-neutral-900 uppercase">
                  Koleksi Baru it&apos;smatapanda
                </h3>
                <p className="text-xs text-neutral-600 font-medium leading-relaxed">
                  Eksplor rilisan tas Dumpling, Puffer series, tote bag estetik, dan aksesoris playful terbaru!
                </p>
              </div>
              <Link
                href="/new-arrivals"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#dcf58d] hover:bg-[#c9e875] px-6 py-3.5 text-xs font-black uppercase tracking-wider text-[#396254] transition-all hover:-translate-y-0.5 active:scale-95 shadow-sm shrink-0 cursor-pointer"
              >
                <ShoppingBag className="h-4 w-4" />
                <span>Belanja Koleksi</span>
              </Link>
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
