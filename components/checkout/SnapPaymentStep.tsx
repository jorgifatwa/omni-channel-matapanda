"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Clock, Lock, RefreshCw, XCircle } from "lucide-react";
import { type AdminOrder } from "@/lib/admin-data";

/** Data returned by /api/payment/create-transaction. */
export interface SnapSession {
  token: string;
  redirectUrl: string;
  clientKey: string | null;
  isLive: boolean;
  expiresAt: string | null;
}

type SnapResult = {
  order_id?: string;
  status_code?: string;
  transaction_status?: string;
};

type SnapCallbacks = {
  embedId: string;
  onSuccess?: (r: SnapResult) => void;
  onPending?: (r: SnapResult) => void;
  onError?: (r: SnapResult) => void;
  onClose?: () => void;
};

declare global {
  interface Window {
    snap?: {
      embed?: (token: string, options: SnapCallbacks) => void;
      hide?: () => void;
    };
  }
}

const EMBED_ID = "snap-container";

/** Loads Midtrans snap.js once per page (sandbox or production). */
function loadSnapScript(clientKey: string, isLive: boolean): Promise<void> {
  const src = isLive
    ? "https://app.midtrans.com/snap/snap.js"
    : "https://app.sandbox.midtrans.com/snap/snap.js";

  if (window.snap?.embed) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    const script = existing ?? document.createElement("script");
    const timer = window.setTimeout(() => reject(new Error("snap.js timeout")), 15000);
    script.addEventListener("load", () => {
      window.clearTimeout(timer);
      if (window.snap?.embed) resolve();
      else reject(new Error("snap.embed tidak tersedia"));
    });
    script.addEventListener("error", () => {
      window.clearTimeout(timer);
      reject(new Error("snap.js gagal dimuat"));
    });
    if (!existing) {
      script.src = src;
      script.async = true;
      script.setAttribute("data-client-key", clientKey);
      document.body.appendChild(script);
    }
  });
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
  return { left, label: [h, m, s].map((n) => String(n).padStart(2, "0")).join(":") };
}

type Phase = "loading" | "ready" | "pending" | "error";

export function CheckoutStepper({ step }: { step: 1 | 2 | 3 }) {
  const steps = ["Pengiriman", "Pembayaran", "Selesai"];
  return (
    <ol className="flex items-center gap-2 flex-wrap text-xs sm:text-sm font-bold mb-6" aria-label="Langkah checkout">
      {steps.map((label, i) => {
        const n = (i + 1) as 1 | 2 | 3;
        const done = n < step;
        const active = n === step;
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className={`flex items-center gap-2 ${
                active ? "text-[#396254] dark:text-[#dcf58d]" : "text-neutral-400 dark:text-neutral-500"
              } ${done ? "text-[#396254] dark:text-[#dcf58d]" : ""}`}
              aria-current={active ? "step" : undefined}
            >
              <span
                className={`w-6 h-6 rounded-full grid place-items-center text-[11px] ${
                  done
                    ? "bg-[#396254] text-[#dcf58d]"
                    : active
                    ? "bg-[#dcf58d] text-[#396254] ring-4 ring-[#d5c6ff]/70"
                    : "bg-neutral-200 dark:bg-neutral-800"
                }`}
              >
                {done ? "✓" : n}
              </span>
              <span>{label}</span>
            </span>
            {i < steps.length - 1 && <span className="w-6 h-0.5 rounded bg-neutral-200 dark:bg-neutral-700" />}
          </li>
        );
      })}
    </ol>
  );
}

interface Props {
  order: AdminOrder;
  session: SnapSession;
  totalLabel: string;
  onPaid: () => void;
}

/**
 * Langkah 2 checkout: form pembayaran Midtrans tampil di dalam halaman kita
 * (Snap Embed). Jika snap.js tidak bisa dimuat, otomatis kembali ke halaman
 * pembayaran Midtrans (redirect) supaya pembeli tetap bisa membayar.
 * Status lunas yang resmi tetap ditentukan webhook Midtrans di server.
 */
export default function SnapPaymentStep({ order, session, totalLabel, onPaid }: Props) {
  const router = useRouter();
  const [phase, setPhase] = React.useState<Phase>("loading");
  const [message, setMessage] = React.useState<string | null>(null);
  const [isChecking, setIsChecking] = React.useState(false);
  const [attempt, setAttempt] = React.useState(0);
  const countdown = useCountdown(session.expiresAt);
  // Keep callbacks in refs so re-renders never re-embed the payment form.
  const onPaidRef = React.useRef(onPaid);
  onPaidRef.current = onPaid;

  const goToFinish = React.useCallback(
    (r: SnapResult, fallbackStatus: string) => {
      const params = new URLSearchParams({
        order_id: r.order_id || order.orderNumber,
        status_code: r.status_code || "200",
        transaction_status: r.transaction_status || fallbackStatus,
      });
      router.push(`/checkout/finish?${params.toString()}`);
    },
    [order.orderNumber, router]
  );

  React.useEffect(() => {
    let cancelled = false;
    const fallbackToRedirect = () => {
      if (!cancelled) window.location.href = session.redirectUrl;
    };

    if (!session.clientKey) {
      fallbackToRedirect();
      return;
    }

    setPhase("loading");
    loadSnapScript(session.clientKey, session.isLive)
      .then(() => {
        if (cancelled || !window.snap?.embed) return;
        const container = document.getElementById(EMBED_ID);
        if (container) container.innerHTML = "";
        window.snap.embed(session.token, {
          embedId: EMBED_ID,
          onSuccess: (r) => {
            onPaidRef.current();
            goToFinish(r, "settlement");
          },
          onPending: () => {
            setPhase("pending");
            setMessage(null);
          },
          onError: () => {
            setPhase("error");
            setMessage("Pembayaran gagal diproses. Silakan coba lagi atau pilih metode lain.");
          },
          onClose: () => {
            setPhase("error");
            setMessage("Form pembayaran ditutup sebelum selesai.");
          },
        });
        setPhase("ready");
      })
      .catch((err) => {
        console.warn("[Checkout] Snap embed tidak tersedia, pindah ke halaman Midtrans:", err);
        fallbackToRedirect();
      });

    return () => {
      cancelled = true;
    };
  }, [session, attempt, goToFinish]);

  const checkStatus = async () => {
    setIsChecking(true);
    setMessage(null);
    try {
      const res = await fetch("/api/tracking/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.orderNumber, email: order.customerEmail }),
      });
      const data = await res.json().catch(() => ({}));
      const status = data?.order?.payment?.status;
      if (status === "SETTLEMENT") {
        onPaid();
        goToFinish({ order_id: order.orderNumber }, "settlement");
        return;
      }
      if (status === "EXPIRE" || status === "CANCEL" || status === "DENY") {
        setPhase("error");
        setMessage("Pembayaran kedaluwarsa atau dibatalkan. Silakan checkout ulang.");
        return;
      }
      setMessage("Pembayaran belum kami terima. Jika baru saja membayar, tunggu 1–2 menit lalu cek lagi.");
    } catch {
      setMessage("Status belum bisa dicek. Periksa koneksi internet lalu coba lagi.");
    } finally {
      setIsChecking(false);
    }
  };

  const addr = order.shippingAddress;

  return (
    <div className="space-y-5" data-testid="snap-payment-step">
      <CheckoutStepper step={2} />

      <div className="flex items-start justify-between gap-4 rounded-2xl border border-[#396254]/15 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 text-sm">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Dikirim ke</p>
          <p className="font-bold text-neutral-900 dark:text-white truncate">
            {order.customerName} · {addr.street}, {addr.city}
          </p>
          <p className="text-xs text-neutral-500">
            {order.courierService} · Order <span className="font-mono">{order.orderNumber}</span>
          </p>
        </div>
        <div className="text-right shrink-0 lg:hidden">
          <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Total</p>
          <p className="font-black text-[#396254] dark:text-[#dcf58d]">{totalLabel}</p>
        </div>
      </div>

      {countdown && countdown.left > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 px-4 py-2.5 text-xs sm:text-sm font-bold text-amber-800 dark:text-amber-300">
          <span className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Selesaikan pembayaran sebelum
          </span>
          <span className="font-mono tabular-nums">{countdown.label}</span>
        </div>
      )}

      {phase === "pending" && (
        <div className="rounded-2xl border border-[#396254]/20 bg-[#dcf58d]/30 dark:bg-[#dcf58d]/10 p-4 text-sm space-y-3">
          <p className="font-bold text-[#396254] dark:text-[#dcf58d]">
            Instruksi pembayaran sudah dibuat. Selesaikan pembayaran sesuai petunjuk di bawah.
          </p>
          <button
            type="button"
            onClick={checkStatus}
            disabled={isChecking}
            className="inline-flex items-center gap-2 rounded-xl bg-[#396254] px-4 py-2.5 text-xs font-black text-[#dcf58d] hover:bg-[#2e5044] disabled:opacity-70"
          >
            {isChecking ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            Saya sudah bayar, cek status
          </button>
        </div>
      )}

      {message && (
        <p
          role="alert"
          className={`rounded-2xl border p-3 text-xs sm:text-sm font-semibold ${
            phase === "error"
              ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
              : "border-neutral-200 bg-white text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
          }`}
        >
          {message}
        </p>
      )}

      {phase === "error" && (
        <button
          type="button"
          onClick={() => {
            setMessage(null);
            setAttempt((n) => n + 1);
          }}
          className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-[#396254] px-6 py-3.5 text-sm font-black text-[#dcf58d] hover:bg-[#2e5044]"
        >
          <XCircle className="h-4 w-4" />
          Coba metode lain
        </button>
      )}

      <div className="relative rounded-3xl border-2 border-[#d5c6ff] bg-white overflow-hidden min-h-[520px]">
        {phase === "loading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-sm text-neutral-500">
            <RefreshCw className="h-6 w-6 animate-spin text-[#396254]" />
            Memuat pilihan pembayaran...
          </div>
        )}
        <div id={EMBED_ID} className="w-full min-h-[520px]" />
      </div>

      <p className="flex items-center gap-2 text-xs text-neutral-500">
        <Lock className="h-3.5 w-3.5" />
        Pembayaran diproses aman oleh Midtrans. Kami tidak menyimpan data kartu.
      </p>
    </div>
  );
}
