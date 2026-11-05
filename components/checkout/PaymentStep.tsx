"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  ChevronDown,
  Clock,
  Copy,
  ExternalLink,
  FlaskConical,
  Lock,
  QrCode,
  RefreshCw,
  Smartphone,
  XCircle,
} from "lucide-react";
import { type AdminOrder } from "@/lib/admin-data";
import {
  PAYMENT_METHOD_LABELS,
  type PaymentInstructions,
  type PaymentMethod,
} from "@/lib/payment-methods";
import { CheckoutStepper } from "@/components/checkout/CheckoutStepper";
import PaymentMethodPicker, { MethodBadge } from "@/components/checkout/PaymentMethodPicker";

export interface PaymentStart {
  method: PaymentMethod;
  instructions: PaymentInstructions | null;
  error: string | null;
  isLive: boolean;
}

interface Props {
  order: AdminOrder;
  checkoutToken: string | null;
  totalLabel: string;
  start: PaymentStart;
  onPaid: () => void;
}

type Status = "waiting" | "expired" | "cancelled" | "paid";

const POLL_MS = 5000;

const HOW_TO: Record<PaymentMethod, string[]> = {
  qris: [
    "Buka aplikasi e-wallet atau m-banking yang mendukung QRIS (GoPay, OVO, DANA, ShopeePay, LinkAja, BCA, Livin', BRImo, dll.).",
    "Pilih menu Scan / Bayar, lalu arahkan kamera ke kode QR di atas.",
    "Pastikan nama toko dan nominal sesuai, lalu konfirmasi pembayaran.",
  ],
  gopay: [
    "Di komputer: buka aplikasi Gojek, ketuk Bayar, lalu scan kode QR di atas.",
    "Di HP: ketuk tombol Buka Aplikasi Gojek.",
    "Periksa nominal, lalu konfirmasi dengan PIN GoPay.",
  ],
  shopeepay: [
    "Ketuk tombol Buka Aplikasi Shopee di HP yang sudah terpasang aplikasi Shopee.",
    "Periksa nominal, lalu konfirmasi dengan PIN ShopeePay.",
    "Sedang di komputer? Pilih QRIS. Kode QRIS juga bisa dibayar dari aplikasi Shopee.",
  ],
  bca_va: [
    "Buka m-BCA atau BCA mobile, pilih m-Transfer, lalu BCA Virtual Account.",
    "Masukkan nomor Virtual Account di atas.",
    "Periksa nama dan nominal tagihan, lalu masukkan PIN.",
    "Bisa juga lewat KlikBCA atau ATM BCA (Transfer > BCA Virtual Account).",
  ],
  bni_va: [
    "Buka BNI Mobile Banking, pilih Transfer, lalu Virtual Account Billing.",
    "Masukkan nomor Virtual Account di atas, lalu periksa nominal.",
    "Konfirmasi dengan password transaksi.",
    "Dari bank lain: transfer online ke bank BNI (kode 009) dengan nomor VA sebagai rekening tujuan.",
  ],
  bri_va: [
    "Buka BRImo, pilih Pembayaran, lalu BRIVA.",
    "Masukkan nomor BRIVA di atas, lalu periksa nominal.",
    "Konfirmasi dengan PIN.",
    "Dari bank lain: transfer online ke bank BRI (kode 002) dengan nomor VA sebagai rekening tujuan.",
  ],
  mandiri_bill: [
    "Buka Livin' by Mandiri, pilih Bayar, lalu E-Commerce.",
    "Cari penyedia jasa Midtrans (kode 70012).",
    "Masukkan Kode Bayar di atas, periksa nominal, lalu konfirmasi dengan PIN.",
    "Di ATM Mandiri: Bayar/Beli > Lainnya > Multi Payment > kode 70012 > Kode Bayar.",
  ],
  permata_va: [
    "Buka PermataMobile X, pilih Bayar Tagihan, lalu Virtual Account.",
    "Masukkan nomor Virtual Account di atas, lalu periksa nominal.",
    "Konfirmasi dengan PIN.",
    "Dari bank lain: transfer online ke bank Permata (kode 013) dengan nomor VA sebagai rekening tujuan.",
  ],
};

const rupiah = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;
const groupDigits = (v: string) => v.replace(/(\d{4})(?=\d)/g, "$1 ");

function formatDeadline(iso: string) {
  return (
    new Date(iso).toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }) + " WIB"
  );
}

function useCountdown(expiresAt: string | null) {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (!expiresAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [expiresAt]);
  if (!expiresAt) return null;
  const left = Math.max(0, new Date(expiresAt).getTime() - now);
  const h = Math.floor(left / 3_600_000);
  const m = Math.floor((left % 3_600_000) / 60_000);
  const s = Math.floor((left % 60_000) / 1000);
  const label = (h > 0 ? [h, m, s] : [m, s]).map((n) => String(n).padStart(2, "0")).join(":");
  return { left, label };
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1800);
        } catch {
          // clipboard blocked; the value is still selectable
        }
      }}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[#396254]/20 bg-white dark:bg-neutral-800 px-3 py-2 text-xs font-bold text-[#396254] dark:text-[#dcf58d] hover:bg-[#396254]/5 transition-colors"
      aria-label={`Salin ${label}`}
    >
      {copied ? <CheckCircle className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Tersalin" : "Salin"}
    </button>
  );
}

function CodeRow({ label, value, testId }: { label: string; value: string; testId?: string }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">{label}</p>
      <div className="mt-1.5 flex items-center justify-between gap-3 rounded-2xl bg-[#fafaf8] dark:bg-neutral-950 border border-[#396254]/10 dark:border-neutral-800 px-4 py-3">
        <span
          data-testid={testId}
          className="font-mono text-xl sm:text-2xl font-black tracking-wide text-neutral-900 dark:text-white break-words"
        >
          {groupDigits(value)}
        </span>
        <CopyButton value={value} label={label} />
      </div>
    </div>
  );
}

/**
 * Langkah 2 checkout: instruksi pembayaran Midtrans Core API yang dirender
 * sendiri (nomor VA, QR, tombol aplikasi). Status lunas yang resmi tetap
 * ditentukan server (webhook / status API), halaman ini hanya memantau.
 */
export default function PaymentStep({ order, checkoutToken, totalLabel, start, onPaid }: Props) {
  const router = useRouter();
  const [instructions, setInstructions] = React.useState<PaymentInstructions | null>(start.instructions);
  const [choosing, setChoosing] = React.useState(!start.instructions);
  const [selected, setSelected] = React.useState<PaymentMethod>(start.method);
  const [error, setError] = React.useState<string | null>(start.error);
  const [busy, setBusy] = React.useState(false);
  const [checking, setChecking] = React.useState(false);
  const [status, setStatus] = React.useState<Status>("waiting");
  const [isLive, setIsLive] = React.useState(start.isLive);
  const countdown = useCountdown(instructions?.expiresAt ?? null);
  const onPaidRef = React.useRef(onPaid);
  onPaidRef.current = onPaid;

  const finishPaid = React.useCallback(() => {
    setStatus("paid");
    onPaidRef.current();
    const params = new URLSearchParams({
      order_id: order.orderNumber,
      status_code: "200",
      transaction_status: "settlement",
    });
    router.push(`/checkout/finish?${params.toString()}`);
  }, [order.orderNumber, router]);

  const pollStatus = React.useCallback(async () => {
    const res = await fetch("/api/payment/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderNumber: order.orderNumber, checkoutToken }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.paymentStatus === "SETTLEMENT" || data.orderStatus === "PAID") {
      finishPaid();
    } else if (data.orderStatus === "CANCELLED") {
      setStatus("cancelled");
    } else if (["EXPIRE", "CANCEL", "DENY"].includes(data.paymentStatus)) {
      setStatus("expired");
    }
    return data;
  }, [order.orderNumber, checkoutToken, finishPaid]);

  // Auto-check every few seconds while the buyer is paying
  React.useEffect(() => {
    if (!instructions || choosing || status !== "waiting") return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") pollStatus().catch(() => undefined);
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [instructions, choosing, status, pollStatus]);

  // The charge itself expired (QR codes last 30 minutes)
  React.useEffect(() => {
    if (countdown && countdown.left === 0 && status === "waiting" && instructions) {
      pollStatus()
        .then((d) => {
          if (d && d.paymentStatus === "PENDING" && d.orderStatus === "PENDING") setStatus("expired");
        })
        .catch(() => setStatus("expired"));
    }
  }, [countdown, status, instructions, pollStatus]);

  const charge = async (method: PaymentMethod) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/payment/charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber: order.orderNumber, checkoutToken, method }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.instructions) {
        setInstructions(data.instructions);
        setIsLive(Boolean(data.isLive));
        setSelected(method);
        setChoosing(false);
        setStatus("waiting");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      if (data.paid) {
        finishPaid();
        return;
      }
      setError(data.error || "Tagihan gagal dibuat. Silakan coba lagi atau pilih metode lain.");
    } catch {
      setError("Tidak dapat menghubungi server pembayaran. Periksa koneksi internet lalu coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  const checkNow = async () => {
    setChecking(true);
    setError(null);
    try {
      const data = await pollStatus();
      if (data && data.paymentStatus === "PENDING" && data.orderStatus === "PENDING") {
        setError("Pembayaran belum kami terima. Jika baru saja membayar, tunggu sebentar. Halaman ini akan terupdate otomatis.");
      }
    } catch {
      setError("Status belum bisa dicek. Periksa koneksi internet lalu coba lagi.");
    } finally {
      setChecking(false);
    }
  };

  const addr = order.shippingAddress;
  const urgent = countdown ? countdown.left < 5 * 60_000 : false;

  return (
    <div className="space-y-5" data-testid="payment-step">
      <CheckoutStepper step={2} />

      {/* Order summary */}
      <div className="flex items-start justify-between gap-4 rounded-2xl border border-[#396254]/15 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 text-sm">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Dikirim ke</p>
          <p className="font-bold text-neutral-900 dark:text-white truncate">
            {order.customerName} · {addr.street}, {addr.city}
          </p>
          <p className="text-xs text-neutral-500 flex items-center gap-1.5 flex-wrap">
            <span>{order.courierService}</span>
            <span>·</span>
            <span>
              Order <span className="font-mono font-bold text-neutral-700 dark:text-neutral-300">{order.orderNumber}</span>
            </span>
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Total</p>
          <p className="font-black text-[#396254] dark:text-[#dcf58d]">{totalLabel}</p>
        </div>
      </div>

      {!isLive && (
        <div className="flex items-start gap-3 rounded-2xl border border-[#d5c6ff] bg-[#d5c6ff]/20 dark:bg-[#d5c6ff]/10 px-4 py-3 text-xs text-[#4b3a8c] dark:text-[#d5c6ff]">
          <FlaskConical className="h-4 w-4 shrink-0 mt-0.5" />
          <p>
            <strong>Mode uji (sandbox).</strong> Tidak ada uang sungguhan. Simulasikan pembayaran lewat{" "}
            <a
              href="https://simulator.sandbox.midtrans.com/"
              target="_blank"
              rel="noreferrer"
              className="font-bold underline underline-offset-2"
            >
              Simulator Midtrans
            </a>
            .
          </p>
        </div>
      )}

      {status === "cancelled" ? (
        <div className="rounded-3xl border border-rose-200 dark:border-rose-900 bg-white dark:bg-neutral-900 p-6 text-center space-y-3">
          <XCircle className="h-10 w-10 text-rose-500 mx-auto" />
          <p className="text-lg font-black text-neutral-900 dark:text-white">Pesanan dibatalkan</p>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Batas waktu pembayaran sudah lewat. Silakan checkout ulang dari keranjang.
          </p>
        </div>
      ) : choosing || !instructions ? (
        /* Choose / switch method */
        <div className="rounded-3xl border border-[#396254]/15 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-black text-[#396254] dark:text-white">Pilih Metode Pembayaran</h2>
            {instructions && (
              <button
                type="button"
                onClick={() => {
                  setChoosing(false);
                  setError(null);
                }}
                className="text-xs font-bold text-neutral-500 hover:text-[#396254] underline underline-offset-2"
              >
                Batal
              </button>
            )}
          </div>
          <PaymentMethodPicker value={selected} onChange={setSelected} disabled={busy} />
          {error && (
            <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/40 p-3 text-xs sm:text-sm font-semibold text-rose-700 dark:text-rose-300">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={() => charge(selected)}
            disabled={busy}
            data-testid="pay-confirm"
            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-[#396254] hover:bg-[#2e5044] px-6 py-4 text-sm font-black text-[#dcf58d] transition-all disabled:opacity-70"
          >
            {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            {busy ? "Membuat tagihan..." : `Bayar dengan ${PAYMENT_METHOD_LABELS[selected]}`}
          </button>
        </div>
      ) : (
        /* Payment instructions */
        <div className="rounded-3xl border border-[#396254]/15 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden" data-testid="payment-instructions">
          <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-[#396254]/10 dark:border-neutral-800">
            <div className="flex items-center gap-3 min-w-0">
              <MethodBadge method={instructions.method} size="lg" />
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Bayar dengan</p>
                <p className="font-black text-neutral-900 dark:text-white truncate">{instructions.label}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setChoosing(true);
                setError(null);
              }}
              className="shrink-0 rounded-xl border border-[#396254]/20 px-3 py-2 text-xs font-bold text-[#396254] dark:text-[#dcf58d] hover:bg-[#396254]/5"
            >
              Ganti metode
            </button>
          </div>

          <div className="p-5 sm:p-6 space-y-5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Total pembayaran</p>
                <p className="text-2xl sm:text-3xl font-black text-[#396254] dark:text-[#dcf58d]">
                  {rupiah(instructions.amount)}
                </p>
              </div>
              <CopyButton value={String(instructions.amount)} label="nominal" />
            </div>

            {status === "expired" ? (
              <div className="rounded-2xl border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-5 text-center space-y-3">
                <Clock className="h-8 w-8 text-amber-600 mx-auto" />
                <p className="font-black text-neutral-900 dark:text-white">
                  {instructions.qrUrl || instructions.deeplinkUrl ? "Kode pembayaran kedaluwarsa" : "Tagihan kedaluwarsa"}
                </p>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                  Pesananmu masih aman. Buat kode baru untuk melanjutkan pembayaran.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <button
                    type="button"
                    onClick={() => charge(instructions.method)}
                    disabled={busy}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#396254] px-4 py-2.5 text-xs font-black text-[#dcf58d] disabled:opacity-70"
                  >
                    <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
                    Buat kode baru
                  </button>
                  <button
                    type="button"
                    onClick={() => setChoosing(true)}
                    className="rounded-xl border border-[#396254]/20 px-4 py-2.5 text-xs font-bold text-[#396254] dark:text-[#dcf58d]"
                  >
                    Pilih metode lain
                  </button>
                </div>
              </div>
            ) : (
              <>
                {instructions.vaNumber && (
                  <CodeRow
                    label={`Nomor Virtual Account ${(instructions.bank || "").toUpperCase()}`}
                    value={instructions.vaNumber}
                    testId="va-number"
                  />
                )}
                {instructions.billerCode && instructions.billKey && (
                  <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
                    <CodeRow label="Kode Perusahaan" value={instructions.billerCode} />
                    <CodeRow label="Kode Bayar" value={instructions.billKey} testId="va-number" />
                  </div>
                )}

                {instructions.qrUrl && (
                  <div className="flex flex-col items-center gap-3">
                    <div className="rounded-3xl border-2 border-[#396254]/15 bg-white p-4 shadow-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={instructions.qrUrl}
                        alt={`Kode QR ${instructions.label}`}
                        width={240}
                        height={240}
                        className="h-60 w-60"
                        data-testid="qr-image"
                      />
                    </div>
                    <p className="flex items-center gap-1.5 text-xs text-neutral-500">
                      <QrCode className="h-3.5 w-3.5" />
                      {instructions.method === "qris"
                        ? "Bisa dibayar dari semua aplikasi e-wallet & m-banking"
                        : "Scan dengan aplikasi Gojek"}
                    </p>
                  </div>
                )}

                {instructions.deeplinkUrl && (
                  <a
                    href={instructions.deeplinkUrl}
                    className={`w-full items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-black text-white transition-all ${
                      instructions.method === "shopeepay" ? "bg-[#ee4d2d] hover:bg-[#d73211] inline-flex" : "bg-[#00aed6] hover:bg-[#0096b9] inline-flex sm:hidden"
                    }`}
                  >
                    <Smartphone className="h-4 w-4" />
                    {instructions.method === "shopeepay" ? "Buka Aplikasi Shopee" : "Buka Aplikasi Gojek"}
                    <ExternalLink className="h-3.5 w-3.5 opacity-80" />
                  </a>
                )}

                {countdown && (
                  <div
                    className={`flex items-center justify-between gap-3 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-bold ${
                      urgent
                        ? "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900"
                        : "bg-[#fafaf8] text-neutral-700 border border-[#396254]/10 dark:bg-neutral-950 dark:text-neutral-300 dark:border-neutral-800"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Bayar sebelum {instructions.expiresAt ? formatDeadline(instructions.expiresAt) : ""}
                    </span>
                    <span className="font-mono tabular-nums">{countdown.label}</span>
                  </div>
                )}

                <details className="group rounded-2xl border border-[#396254]/10 dark:border-neutral-800">
                  <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-bold text-neutral-800 dark:text-neutral-200">
                    Cara membayar
                    <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                  </summary>
                  <ol className="list-decimal space-y-1.5 px-4 pb-4 pl-8 text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    {HOW_TO[instructions.method].map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </details>
              </>
            )}

            {status === "waiting" && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-[#dcf58d]/30 dark:bg-[#dcf58d]/10 px-4 py-3">
                <p className="flex items-center gap-2.5 text-xs sm:text-sm font-bold text-[#396254] dark:text-[#dcf58d]" data-testid="payment-waiting">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#396254] opacity-50" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#396254]" />
                  </span>
                  Menunggu pembayaran. Halaman ini terupdate otomatis.
                </p>
                <button
                  type="button"
                  onClick={checkNow}
                  disabled={checking}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#396254] px-4 py-2 text-xs font-black text-[#dcf58d] hover:bg-[#2e5044] disabled:opacity-70"
                >
                  {checking ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                  Cek status
                </button>
              </div>
            )}

            {error && (
              <p role="alert" className="rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 p-3 text-xs sm:text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                {error}
              </p>
            )}
          </div>
        </div>
      )}

      <p className="flex items-center justify-center gap-2 text-xs text-neutral-500">
        <Lock className="h-3.5 w-3.5" />
        Pembayaran diproses aman oleh Midtrans.
      </p>
    </div>
  );
}
