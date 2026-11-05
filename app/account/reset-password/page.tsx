"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, Lock, ArrowRight, CheckCircle } from "lucide-react";
import Navbar from "@/components/Navbar";

function ResetForm() {
  const token = useSearchParams().get("token") || "";
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) return setError("Password minimal 6 karakter.");
    if (password !== confirm) return setError("Konfirmasi password tidak sama.");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setDone(true);
      else setError(data.error || "Gagal menyimpan password.");
    } catch {
      setError("Tidak dapat terhubung ke server. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <p className="text-center text-sm text-neutral-700">
        Link tidak lengkap.{" "}
        <Link href="/account/forgot-password" className="font-black text-[#396254] underline">Minta link baru</Link>
      </p>
    );
  }

  return done ? (
    <div className="text-center space-y-3" role="status">
      <CheckCircle className="h-10 w-10 text-[#396254] mx-auto" />
      <p className="text-sm text-neutral-700 font-medium">Password berhasil disimpan.</p>
      <Link href="/account/login" className="inline-block rounded-full bg-[#396254] px-6 py-3 text-xs font-black text-white uppercase">
        Masuk Sekarang
      </Link>
    </div>
  ) : (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {error && (
        <div role="alert" className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 font-bold">
          {error}{" "}
          {error.includes("Link") && (
            <Link href="/account/forgot-password" className="underline">Minta link baru</Link>
          )}
        </div>
      )}
      {[
        { id: "password", label: "Password Baru", value: password, set: setPassword },
        { id: "confirm", label: "Ulangi Password", value: confirm, set: setConfirm },
      ].map((f) => (
        <div key={f.id}>
          <label htmlFor={f.id} className="block text-xs font-black text-neutral-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5" />
            <span>{f.label}</span>
          </label>
          <input
            id={f.id}
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={f.value}
            onChange={(e) => f.set(e.target.value)}
            className="block w-full rounded-2xl border border-neutral-300 px-4 py-3.5 text-sm text-black focus:border-[#396254] focus:outline-none focus:ring-2 focus:ring-[#396254]/20 font-medium"
          />
        </div>
      ))}
      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 rounded-full bg-[#396254] hover:bg-[#2b4c41] py-4 px-4 text-xs sm:text-sm font-black text-white uppercase tracking-wider disabled:opacity-50 shadow-md"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
        <span>{loading ? "Menyimpan..." : "Simpan Password"}</span>
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-black uppercase">Atur Password</h1>
          <p className="mt-2 text-xs sm:text-sm text-neutral-600 font-medium">Buat password baru untuk akun it&apos;smatapanda kamu.</p>
        </div>
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-6 sm:px-10 border border-neutral-200/90 sm:rounded-3xl shadow-xl">
            <React.Suspense fallback={<p className="text-center text-xs text-neutral-400">Memuat...</p>}>
              <ResetForm />
            </React.Suspense>
          </div>
        </div>
      </main>
    </div>
  );
}
