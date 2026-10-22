"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { Loader2, ArrowRight, User, Mail, Lock, Eye, EyeOff } from "lucide-react";
import Navbar from "@/components/Navbar";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/account/orders";

  const { status } = useSession();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (status === "authenticated") {
      router.replace(callbackUrl);
    }
  }, [status, router, callbackUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Gagal melakukan pendaftaran. Silakan coba lagi.");
        setLoading(false);
        return;
      }

      // Broadcast notification event to admin tabs
      try {
        if (typeof window !== "undefined") {
          const newNotif = data.notification || {
            id: `notif-${Date.now()}`,
            type: "NEW_CUSTOMER",
            title: "Customer Baru Terdaftar",
            message: `${name.trim()} (${email.trim()}) baru saja mendaftar akun customer it'smatapanda.`,
            link: "/admin/customers",
            isRead: false,
            createdAt: new Date().toISOString(),
          };

          // Save latest event in localStorage to trigger storage listener
          window.localStorage.setItem(
            "itspanda_latest_notification_event",
            JSON.stringify({ ...newNotif, timestamp: Date.now() })
          );

          // Broadcast via BroadcastChannel if available
          if ("BroadcastChannel" in window) {
            const bc = new BroadcastChannel("itspanda_admin_notifications_channel");
            bc.postMessage({ type: "NEW_NOTIFICATION", notification: newNotif });
            bc.close();
          }
        }
      } catch (bcErr) {
        console.warn("Notification broadcast error:", bcErr);
      }

      // Auto login right after register
      const loginRes = await signIn("credentials", {
        redirect: false,
        identifier: email.trim(),
        password,
        callbackUrl,
      });

      if (loginRes?.error) {
        router.push("/account/login?registered=true");
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError("Terjadi kesalahan koneksi. Silakan periksa jaringan Anda.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#d5c6ff] text-[#396254] text-xs font-black uppercase tracking-wider shadow-xs mb-3">
          <span>Gabung Bersama Panda!</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-center text-black uppercase">
          Daftar Akun Baru
        </h1>
        <p className="mt-2 text-center text-xs sm:text-sm text-neutral-600 font-medium">
          Buat akun dalam sekejap untuk melacak pesanan dan simpan wishlist favorit!
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 border border-neutral-200/90 sm:rounded-3xl shadow-xl">
          {error && (
            <div className="mb-6 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 leading-relaxed font-bold shadow-xs">
              {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="name"
                className="block text-xs font-black text-neutral-800 uppercase tracking-wider mb-2 flex items-center gap-1.5"
              >
                <User className="h-3.5 w-3.5" />
                <span>Nama Lengkap</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                placeholder="Contoh: Alex Pratama"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="block w-full rounded-2xl border border-neutral-300 px-4 py-3.5 text-sm text-black placeholder:text-neutral-400 focus:border-[#396254] focus:outline-none focus:ring-2 focus:ring-[#396254]/20 transition-all font-medium"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-xs font-black text-neutral-800 uppercase tracking-wider mb-2 flex items-center gap-1.5"
              >
                <Mail className="h-3.5 w-3.5" />
                <span>Email atau No. Handphone</span>
              </label>
              <input
                id="email"
                name="email"
                type="text"
                required
                placeholder="alex@example.com atau 08123456789"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full rounded-2xl border border-neutral-300 px-4 py-3.5 text-sm text-black placeholder:text-neutral-400 focus:border-[#396254] focus:outline-none focus:ring-2 focus:ring-[#396254]/20 transition-all font-medium"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-black text-neutral-800 uppercase tracking-wider mb-2 flex items-center gap-1.5"
              >
                <Lock className="h-3.5 w-3.5" />
                <span>Kata Sandi (Minimal 6 Karakter)</span>
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-2xl border border-neutral-300 pl-4 pr-11 py-3.5 text-sm text-black placeholder:text-neutral-400 focus:border-[#396254] focus:outline-none focus:ring-2 focus:ring-[#396254]/20 transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 transition-colors focus:outline-none"
                  aria-label={showPassword ? "Sembunyikan password" : "Lihat password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-full bg-[#396254] hover:bg-[#2b4c41] py-4 px-4 text-xs sm:text-sm font-black text-white uppercase tracking-wider transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 shadow-md cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Mendaftarkan...</span>
                </>
              ) : (
                <>
                  <span>Buat Akun Sekarang</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-neutral-100 text-center">
            <p className="text-xs text-neutral-600 font-medium">
              Sudah memiliki akun?{" "}
              <Link
                href={`/account/login${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`}
                className="font-black text-[#396254] underline underline-offset-4 hover:opacity-80 transition-opacity"
              >
                Masuk di sini
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CustomerRegisterPage() {
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col font-sans">
      <Navbar />
      <main className="flex-1">
        <React.Suspense
          fallback={
            <div className="min-h-[300px] flex items-center justify-center text-xs text-neutral-400">
              Memuat formulir pendaftaran...
            </div>
          }
        >
          <RegisterForm />
        </React.Suspense>
      </main>
      <footer className="border-t border-neutral-200 bg-white py-6 text-center text-xs text-neutral-500">
        &copy; 2026 it&apos;smatapanda. All rights reserved.
      </footer>
    </div>
  );
}
