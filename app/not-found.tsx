import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full space-y-6">
        <div className="text-6xl font-mono font-bold tracking-tighter text-zinc-600">
          404
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight uppercase">
            Halaman Tidak Ditemukan
          </h1>
          <p className="text-sm text-zinc-400">
            Halaman atau tautan yang Anda tuju tidak tersedia atau telah dipindahkan.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-block px-6 py-2.5 bg-white text-black text-xs font-semibold uppercase tracking-wider hover:bg-zinc-200 transition-colors"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
