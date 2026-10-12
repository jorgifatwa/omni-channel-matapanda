"use client";

import * as React from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("[Global Error]:", error);
  }, [error]);

  return (
    <html lang="id">
      <body className="bg-black text-white antialiased min-h-screen flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 text-red-400 text-2xl font-mono mx-auto">
            !
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight uppercase">
              Aplikasi Mengalami Kendala
            </h1>
            <p className="text-sm text-zinc-400">
              {error?.message || "Terjadi kesalahan internal pada sistem."}
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => reset()}
              className="px-6 py-2.5 bg-white text-black text-xs font-semibold uppercase tracking-wider hover:bg-zinc-200 transition-colors"
            >
              Muat Ulang
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
