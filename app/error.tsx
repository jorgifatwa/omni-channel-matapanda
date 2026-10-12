"use client";

import * as React from "react";
import Link from "next/link";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("[Root Error Boundary]:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 text-red-400 text-2xl font-mono mx-auto">
          !
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight uppercase">
            Terjadi Kesalahan
          </h1>
          <p className="text-sm text-zinc-400">
            {error?.message || "Sistem mengalami kendala saat memuat halaman ini."}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button
            onClick={() => reset()}
            className="px-5 py-2.5 bg-white text-black text-xs font-semibold uppercase tracking-wider hover:bg-zinc-200 transition-colors"
          >
            Coba Lagi
          </button>
          <Link
            href="/"
            className="px-5 py-2.5 bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-semibold uppercase tracking-wider hover:bg-zinc-800 hover:text-white transition-colors"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
