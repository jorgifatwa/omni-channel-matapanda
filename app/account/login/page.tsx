"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { Loader2, ArrowRight, Mail, Lock } from "lucide-react";
import Navbar from "@/components/Navbar";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/account/orders";

  const { status } = useSession();
  const [identifier, setIdentifier] = React.useState("");
  const [password, setPassword] = React.useState("");
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
      const res = await signIn("credentials", {
        redirect: false,
        identifier: identifier.trim(),
        password,
        callbackUrl,
      });

      if (res?.error) {
        setError("Email/No. HP atau kata sandi tidak sesuai. Silakan coba lagi.");
        setLoading(false);
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError("Terjadi kesalahan saat masuk. Silakan coba lagi.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#d5c6ff] text-[#396254] text-xs font-black uppercase tracking-wider shadow-xs mb-3">
          <span>Welcome Back!</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-center text-black uppercase">
          Masuk Akun Panda
        </h1>
        <p className="mt-2 text-center text-xs sm:text-sm text-neutral-600 font-medium">
          Akses pesananmu, lacak pengiriman live, dan checkout lebih cepat!
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
                htmlFor="identifier"
                className="block text-xs font-black text-neutral-800 uppercase tracking-wider mb-2 flex items-center gap-1.5"
              >
                <Mail className="h-3.5 w-3.5" />
                <span>Email atau No. Handphone</span>
              </label>
              <input
                id="identifier"
                name="identifier"
                type="text"
                autoComplete="username"
                required
                placeholder="nama@email.com atau 08123456789"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="block w-full rounded-2xl border border-neutral-300 px-4 py-3.5 text-sm text-black placeholder:text-neutral-400 focus:border-[#396254] focus:outline-none focus:ring-2 focus:ring-[#396254]/20 transition-all font-medium"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="password"
                  className="block text-xs font-black text-neutral-800 uppercase tracking-wider flex items-center gap-1.5"
                >
                  <Lock className="h-3.5 w-3.5" />
                  <span>Kata Sandi</span>
                </label>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full rounded-2xl border border-neutral-300 px-4 py-3.5 text-sm text-black placeholder:text-neutral-400 focus:border-[#396254] focus:outline-none focus:ring-2 focus:ring-[#396254]/20 transition-all font-medium"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-full bg-[#396254] hover:bg-[#2b4c41] py-4 px-4 text-xs sm:text-sm font-black text-white uppercase tracking-wider transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 shadow-md cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <span>Masuk Sekarang</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials Info */}
          <div className="mt-6 pt-5 border-t border-neutral-100 text-center">
            <p className="text-[11px] text-neutral-500 font-medium">
              Demo: <span className="font-mono text-[#396254] font-bold bg-[#d5c6ff]/30 px-2 py-0.5 rounded-md">customer@itsmatapanda.com</span> / <span className="font-mono text-neutral-800 font-bold">customer123</span>
            </p>
          </div>

          <div className="mt-6 pt-5 border-t border-neutral-100 text-center">
            <p className="text-xs text-neutral-600 font-medium">
              Belum punya akun?{" "}
              <Link
                href={`/account/register${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`}
                className="font-black text-[#396254] underline underline-offset-4 hover:opacity-80 transition-opacity"
              >
                Daftar sekarang
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CustomerLoginPage() {
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col font-sans">
      <Navbar />
      <main className="flex-1">
        <React.Suspense
          fallback={
            <div className="min-h-[300px] flex items-center justify-center text-xs text-neutral-400">
              Memuat formulir masuk...
            </div>
          }
        >
          <LoginForm />
        </React.Suspense>
      </main>
      <footer className="border-t border-neutral-200 bg-white py-6 text-center text-xs text-neutral-500">
        &copy; 2026 it&apos;smatapanda. All rights reserved.
      </footer>
    </div>
  );
}
