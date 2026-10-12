"use client";

import * as React from "react";
import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Plug,
  ExternalLink,
  RefreshCw,
  ShoppingBag,
  Loader2,
  Clock,
  Info,
  ArrowRightLeft,
} from "lucide-react";
import { useSearchParams } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MarketplaceAccount {
  id: string;
  platform: "SHOPEE" | "TIKTOK_SHOP";
  shopId: string;
  shopName: string | null;
  tokenExpiresAt: string;
  isActive: boolean;
  connectedAt: string;
  isTokenExpired: boolean;
  isTokenExpiringSoon: boolean;
  connectedBy: { name: string; email: string } | null;
}

interface StatusResponse {
  accounts: MarketplaceAccount[];
}

// ─── Platform config ──────────────────────────────────────────────────────────

const PLATFORMS = [
  {
    id: "SHOPEE" as const,
    name: "Shopee",
    description: "Sinkronisasi produk & order dari Shopee Indonesia",
    connectPath: "/api/integrations/shopee/connect",
    color: "bg-orange-500",
    textColor: "text-orange-600 dark:text-orange-400",
    borderColor: "border-orange-200 dark:border-orange-900/50",
    bgLight: "bg-orange-50 dark:bg-orange-950/40",
    logo: (
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500 text-white font-bold text-xl">
        S
      </div>
    ),
    docsUrl: "https://open.shopee.com",
    registerUrl: "https://open.shopee.com",
    sandbox: true,
  },
  {
    id: "TIKTOK_SHOP" as const,
    name: "Tokopedia (TikTok Shop)",
    description:
      "Integrasi via TikTok Shop Partner Center — mencakup Tokopedia & TikTok Shop setelah merger",
    connectPath: "/api/integrations/tiktokshop/connect",
    color: "bg-black",
    textColor: "text-neutral-900 dark:text-neutral-100",
    borderColor: "border-neutral-200 dark:border-neutral-800",
    bgLight: "bg-neutral-50 dark:bg-neutral-800/60",
    logo: (
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-black text-white font-bold text-xl">
        T
      </div>
    ),
    docsUrl: "https://partner.tiktokshop.com",
    registerUrl: "https://partner.tiktokshop.com",
    sandbox: true,
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

function IntegrationsContent() {
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = React.useState<MarketplaceAccount[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [disconnecting, setDisconnecting] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // Handle redirect params from OAuth callbacks
  React.useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    const shop = searchParams.get("shop");

    if (success === "shopee_connected") {
      setToast({ type: "success", message: `Shopee "${shop}" berhasil terhubung!` });
    } else if (success === "tiktokshop_connected") {
      setToast({
        type: "success",
        message: `Tokopedia/TikTok Shop "${shop}" berhasil terhubung!`,
      });
    } else if (error) {
      const errorMessages: Record<string, string> = {
        unauthorized: "Sesi tidak valid. Silahkan login ulang.",
        shopee_missing_params: "Shopee tidak mengirimkan kode otorisasi yang valid.",
        shopee_token_error: "Gagal menukar kode Shopee menjadi token. Coba hubungkan ulang.",
        shopee_callback_failed: "Terjadi kesalahan saat menyimpan koneksi Shopee.",
        tiktokshop_missing_code: "TikTok Shop tidak mengirimkan kode otorisasi.",
        tiktokshop_token_error: "Gagal menukar kode TikTok Shop menjadi token.",
        tiktokshop_callback_failed: "Terjadi kesalahan saat menyimpan koneksi TikTok Shop.",
        admin_not_found: "Admin user tidak ditemukan di database.",
      };
      setToast({
        type: "error",
        message: errorMessages[error] || `Terjadi kesalahan: ${error}`,
      });
    }
  }, [searchParams]);

  // Auto-dismiss toast after 6 seconds
  React.useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  // Fetch connection status
  const fetchStatus = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/integrations/status");
      if (res.ok) {
        const data: StatusResponse = await res.json();
        setAccounts(data.accounts);
      }
    } catch (err) {
      console.error("Failed to fetch integration status:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleDisconnect = async (accountId: string, platformName: string) => {
    if (
      !confirm(
        `Putuskan koneksi dengan ${platformName}?\n\nAnda perlu menghubungkan ulang untuk menggunakan fitur sinkronisasi.`
      )
    )
      return;

    setDisconnecting(accountId);
    try {
      const res = await fetch(`/api/integrations/status?id=${accountId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setToast({ type: "success", message: `Koneksi ${platformName} berhasil diputus.` });
        await fetchStatus();
      } else {
        setToast({ type: "error", message: `Gagal memutus koneksi ${platformName}.` });
      }
    } catch {
      setToast({ type: "error", message: "Terjadi kesalahan jaringan." });
    } finally {
      setDisconnecting(null);
    }
  };

  const getAccountForPlatform = (platformId: "SHOPEE" | "TIKTOK_SHOP") =>
    accounts.find((a) => a.platform === platformId);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Plug className="h-6 w-6 text-neutral-600" />
            <h1 className="text-2xl font-bold text-neutral-900">Integrasi Marketplace</h1>
          </div>
          <p className="text-sm text-neutral-500 ml-9">
            Kelola koneksi toko marketplace serta sinkronisasi katalog produk dan stok inventori.
          </p>
        </div>

        <Link
          href="/admin/integrations/products"
          className="inline-flex items-center gap-2 rounded-xl bg-black dark:bg-white px-4 py-2.5 text-xs font-semibold text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors shadow-sm self-start sm:self-auto"
        >
          <ArrowRightLeft className="h-4 w-4 text-orange-400" />
          <span>Kelola Pemetaan Produk & Stok →</span>
        </Link>
      </div>

      {/* Toast notification */}
      {toast && (
        <div
          className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm font-medium ${
            toast.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300"
              : toast.type === "error"
              ? "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-300"
              : "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/50 text-blue-800 dark:text-blue-300"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
          ) : toast.type === "error" ? (
            <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
          ) : (
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Info banner */}
      <div className="flex gap-3 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/40 px-4 py-3 text-sm text-blue-800 dark:text-blue-300">
        <Info className="h-4 w-4 mt-0.5 shrink-0 text-blue-500 dark:text-blue-400" />
        <div>
          <p className="font-semibold">Fondasi koneksi saja — Fitur sync belum aktif</p>
          <p className="text-blue-700 dark:text-blue-400 mt-0.5">
            Halaman ini menyiapkan koneksi OAuth. Sinkronisasi stok, pesanan, dan mapping produk
            akan tersedia di step berikutnya setelah koneksi berhasil.
          </p>
        </div>
      </div>

      {/* Platform cards */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {PLATFORMS.map((platform) => {
          const account = getAccountForPlatform(platform.id);
          const isConnected = !!account;

          return (
            <div
              key={platform.id}
              className={`rounded-2xl border ${
                isConnected ? platform.borderColor : "border-neutral-200 dark:border-neutral-800"
              } bg-white dark:bg-neutral-900 p-6 space-y-5`}
            >
              {/* Card header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  {platform.logo}
                  <div>
                    <h2 className="font-bold text-neutral-900 dark:text-white">{platform.name}</h2>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed max-w-xs">
                      {platform.description}
                    </p>
                  </div>
                </div>

                {/* Status badge */}
                {loading ? (
                  <div className="shrink-0">
                    <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
                  </div>
                ) : isConnected ? (
                  <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" />
                    Terhubung
                  </span>
                ) : (
                  <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">
                    <XCircle className="h-3 w-3" />
                    Belum Terhubung
                  </span>
                )}
              </div>

              {/* Connected account info */}
              {isConnected && account && (
                <div className={`rounded-xl ${platform.bgLight} border ${platform.borderColor} p-4 space-y-2.5`}>
                  <div className="flex items-center gap-2">
                    <ShoppingBag className={`h-4 w-4 ${platform.textColor}`} />
                    <span className="font-semibold text-sm text-neutral-900 dark:text-white">
                      {account.shopName || `Shop ID: ${account.shopId}`}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-neutral-600 dark:text-neutral-400">
                    <div>
                      <span className="text-neutral-400 dark:text-neutral-500">Shop ID</span>
                      <p className="font-mono font-medium mt-0.5 text-neutral-800 dark:text-neutral-200">{account.shopId}</p>
                    </div>
                    <div>
                      <span className="text-neutral-400 dark:text-neutral-500">Terhubung sejak</span>
                      <p className="font-medium mt-0.5 text-neutral-800 dark:text-neutral-200">
                        {new Date(account.connectedAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Token expiry status */}
                  <div
                    className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 ${
                      account.isTokenExpired
                        ? "bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400"
                        : account.isTokenExpiringSoon
                        ? "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400"
                        : "bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-800"
                    }`}
                  >
                    {account.isTokenExpired ? (
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    ) : account.isTokenExpiringSoon ? (
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    )}
                    <span>
                      {account.isTokenExpired
                        ? "Token expired — hubungkan ulang untuk memperbarui"
                        : account.isTokenExpiringSoon
                        ? `Token hampir expired: ${new Date(account.tokenExpiresAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`
                        : `Token aktif hingga ${new Date(account.tokenExpiresAt).toLocaleString("id-ID", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}`}
                    </span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                {isConnected ? (
                  <>
                    <Link
                      href="/admin/integrations/products"
                      className="flex items-center gap-1.5 rounded-lg bg-orange-600 text-white px-3.5 py-2 text-xs font-semibold hover:bg-orange-700 transition-colors shadow-sm"
                    >
                      <ArrowRightLeft className="h-3.5 w-3.5" />
                      Pemetaan Produk & Stok
                    </Link>
                    <a
                      href={platform.connectPath}
                      className={`flex items-center gap-2 rounded-lg border ${platform.borderColor} ${platform.bgLight} ${platform.textColor} px-3.5 py-2 text-xs font-semibold hover:opacity-80 transition-opacity`}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Hubungkan Ulang
                    </a>
                    <button
                      onClick={() =>
                        handleDisconnect(
                          account!.id,
                          platform.name
                        )
                      }
                      disabled={disconnecting === account?.id}
                      className="flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 px-3 py-2 text-xs font-semibold hover:opacity-80 transition-opacity disabled:opacity-50"
                    >
                      {disconnecting === account?.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5" />
                      )}
                      Putuskan
                    </button>
                  </>
                ) : (
                  <a
                    href={platform.connectPath}
                    className="flex items-center gap-2 rounded-lg bg-black dark:bg-white text-white dark:text-black px-5 py-2.5 text-xs font-semibold hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
                  >
                    <Plug className="h-3.5 w-3.5" />
                    Hubungkan {platform.name.split(" ")[0]}
                  </a>
                )}

                <a
                  href={platform.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors ml-auto"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Dokumentasi
                </a>
              </div>

              {/* Sandbox note */}
              {platform.sandbox && (
                <p className="text-[11px] text-neutral-400 dark:text-neutral-500 border-t border-neutral-100 dark:border-neutral-800 pt-3">
                  Sandbox tersedia — gunakan Development Shop saat testing sebelum production.{" "}
                  <a
                    href={platform.registerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-neutral-600 dark:hover:text-neutral-300"
                  >
                    Daftar partner →
                  </a>
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Setup guide */}
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 p-6 space-y-5">
        <h3 className="font-bold text-neutral-900 dark:text-white flex items-center gap-2">
          <Info className="h-4 w-4 text-neutral-500" />
          Panduan Setup Awal
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Shopee guide */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center">
                S
              </div>
              <span className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">Shopee Open Platform</span>
            </div>
            <ol className="space-y-2 text-xs text-neutral-600 dark:text-neutral-400 list-none">
              {[
                "Daftar di open.shopee.com → pilih Third-party Partner Platform (ISV)",
                "Siapkan dokumen badan usaha (CV/PT) + demo app untuk review",
                "Approval ~10 hari kerja — kamu akan dapat Partner ID & Partner Key",
                "Tambahkan ke .env: SHOPEE_PARTNER_ID dan SHOPEE_PARTNER_KEY",
                "Set SHOPEE_SANDBOX=true untuk testing, false untuk production",
              ].map((step, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="shrink-0 h-4 w-4 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 text-[10px] font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* TikTok Shop / Tokopedia guide */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center">
                T
              </div>
              <span className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">TikTok Shop Partner Center (Tokopedia)</span>
            </div>
            <ol className="space-y-2 text-xs text-neutral-600 dark:text-neutral-400 list-none">
              {[
                "Daftar di partner.tiktokshop.com → pilih App Developer (ISV)",
                "Buat app di App & Service — dapatkan App Key & App Secret",
                "Untuk sandbox: buat Development Shop (tidak butuh KYC untuk Core Function)",
                "Tambahkan ke .env: TIKTOK_SHOP_APP_KEY dan TIKTOK_SHOP_APP_SECRET",
                "Set Redirect URL di Partner Center: /api/integrations/tiktokshop/callback",
              ].map((step, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="shrink-0 h-4 w-4 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-[10px] font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Required env vars */}
        <div className="rounded-xl bg-neutral-900 text-neutral-100 p-4 font-mono text-xs leading-relaxed">
          <p className="text-neutral-400 mb-2"># .env — tambahkan variabel berikut:</p>
          <p className="text-green-400"># Shopee Open Platform</p>
          <p>{"SHOPEE_PARTNER_ID=\"<your_partner_id>\""}</p>
          <p>{"SHOPEE_PARTNER_KEY=\"<your_partner_key>\""}</p>
          <p>{"SHOPEE_REDIRECT_URI=\"https://yourdomain.com/api/integrations/shopee/callback\""}</p>
          <p>{"SHOPEE_SANDBOX=\"true\""}</p>
          <p className="mt-2 text-green-400"># TikTok Shop Partner Center (Tokopedia)</p>
          <p>{"TIKTOK_SHOP_APP_KEY=\"<your_app_key>\""}</p>
          <p>{"TIKTOK_SHOP_APP_SECRET=\"<your_app_secret>\""}</p>
          <p>{"TIKTOK_SHOP_REDIRECT_URI=\"https://yourdomain.com/api/integrations/tiktokshop/callback\""}</p>
          <p className="mt-2 text-green-400"># Enkripsi token & cron refresh</p>
          <p>{"MARKETPLACE_ENCRYPTION_KEY=\"<64_char_hex_key>\""}</p>
          <p>{"CRON_SECRET=\"<random_string>\""}</p>
        </div>
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
        </div>
      }
    >
      <IntegrationsContent />
    </React.Suspense>
  );
}
