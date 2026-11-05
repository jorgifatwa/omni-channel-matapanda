"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, Mail, ArrowRight, CheckCircle } from "lucide-react";
import Navbar from "@/components/Navbar";

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setSent(data.message || "Link sudah dikirim. Cek email kamu.");
      else setError(data.error || "Gagal mengirim link. Silakan coba lagi.");
    } catch {
      setError("Tidak dapat terhubung ke server. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-black uppercase">Lupa Password</h1>
          <p className="mt-2 text-xs sm:text-sm text-neutral-600 font-medium">
            Masukkan email akunmu. Kami kirim link untuk membuat password baru. Pernah belanja tanpa akun?
            Pakai email yang sama untuk membuat password.
          </p>
        </div>
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-6 sm:px-10 border border-neutral-200/90 sm:rounded-3xl shadow-xl">
            {sent ? (
              <div className="text-center space-y-3" role="status">
                <CheckCircle className="h-10 w-10 text-[#396254] mx-auto" />
                <p className="text-sm text-neutral-700 font-medium">{sent}</p>
                <Link href="/account/login" className="inline-block text-xs font-black text-[#396254] underline underline-offset-4">
                  Kembali ke halaman masuk
                </Link>
              </div>
            ) : (
              <form className="space-y-5" onSubmit={handleSubmit}>
                {error && (
                  <div role="alert" className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 font-bold">
                    {error}
                  </div>
                )}
                <div>
                  <label htmlFor="email" className="block text-xs font-black text-neutral-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    <span>Email</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="nama@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full rounded-2xl border border-neutral-300 px-4 py-3.5 text-sm text-black placeholder:text-neutral-400 focus:border-[#396254] focus:outline-none focus:ring-2 focus:ring-[#396254]/20 font-medium"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-full bg-[#396254] hover:bg-[#2b4c41] py-4 px-4 text-xs sm:text-sm font-black text-white uppercase tracking-wider disabled:opacity-50 shadow-md"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  <span>{loading ? "Mengirim..." : "Kirim Link"}</span>
                </button>
                <p className="text-center text-xs text-neutral-600">
                  Ingat password?{" "}
                  <Link href="/account/login" className="font-black text-[#396254] underline underline-offset-4">
                    Masuk
                  </Link>
                </p>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
