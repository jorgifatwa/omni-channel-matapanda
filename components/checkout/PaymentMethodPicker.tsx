"use client";

import { Check } from "lucide-react";
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/lib/payment-methods";

/** Brand-coloured tile standing in for each provider's logo. */
export function MethodBadge({ method, size = "md" }: { method: PaymentMethod; size?: "md" | "lg" }) {
  const style: Record<PaymentMethod, { text: string; className: string }> = {
    qris: { text: "QRIS", className: "bg-white text-neutral-900 border border-neutral-300 [&>span]:text-[#e2231a]" },
    gopay: { text: "gopay", className: "bg-[#00aed6] text-white lowercase" },
    shopeepay: { text: "SPay", className: "bg-[#ee4d2d] text-white" },
    bca_va: { text: "BCA", className: "bg-[#0060af] text-white italic" },
    bni_va: { text: "BNI", className: "bg-[#005e6a] text-[#f15a23]" },
    bri_va: { text: "BRI", className: "bg-[#00529c] text-white" },
    mandiri_bill: { text: "mandiri", className: "bg-[#003d79] text-[#ffb700] lowercase" },
    permata_va: { text: "Permata", className: "bg-[#00843d] text-white" },
  };
  const s = style[method];
  const dims = size === "lg" ? "h-11 w-[72px] text-sm" : "h-8 w-[60px] text-[11px]";
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-lg px-2 font-black tracking-tight ${dims} ${s.className}`}
    >
      {method === "qris" ? (
        <>
          QR<span>IS</span>
        </>
      ) : (
        s.text
      )}
    </span>
  );
}

const GROUPS: { title: string; hint: string; methods: { id: PaymentMethod; note: string }[] }[] = [
  {
    title: "QRIS & E-Wallet",
    hint: "Bayar instan, langsung terkonfirmasi",
    methods: [
      { id: "qris", note: "Scan dari aplikasi e-wallet atau m-banking apa pun" },
      { id: "gopay", note: "Scan QR atau buka aplikasi Gojek" },
      { id: "shopeepay", note: "Buka aplikasi Shopee di HP" },
    ],
  },
  {
    title: "Virtual Account",
    hint: "Transfer via m-banking, internet banking, atau ATM",
    methods: [
      { id: "bca_va", note: "m-BCA, KlikBCA, ATM BCA" },
      { id: "bni_va", note: "BNI Mobile, ATM BNI, bank lain" },
      { id: "bri_va", note: "BRImo, ATM BRI, bank lain" },
      { id: "mandiri_bill", note: "Livin' by Mandiri, ATM Mandiri" },
      { id: "permata_va", note: "PermataMobile X, ATM, bank lain" },
    ],
  },
];

export default function PaymentMethodPicker({
  value,
  onChange,
  disabled,
}: {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-5" role="radiogroup" aria-label="Metode pembayaran">
      {GROUPS.map((group) => (
        <div key={group.title}>
          <div className="flex items-baseline justify-between gap-3 mb-2">
            <p className="text-xs font-black uppercase tracking-wider text-[#396254] dark:text-[#dcf58d]">
              {group.title}
            </p>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 text-right">{group.hint}</p>
          </div>
          <div className="rounded-2xl border border-[#396254]/15 dark:border-neutral-800 bg-white dark:bg-neutral-900 divide-y divide-[#396254]/10 dark:divide-neutral-800 overflow-hidden">
            {group.methods.map(({ id, note }) => {
              const selected = value === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={disabled}
                  onClick={() => onChange(id)}
                  data-testid={`pay-method-${id}`}
                  className={`w-full flex items-center gap-3.5 px-4 py-3.5 text-left transition-colors disabled:opacity-60 ${
                    selected
                      ? "bg-[#dcf58d]/35 dark:bg-[#dcf58d]/10"
                      : "hover:bg-[#396254]/[0.04] dark:hover:bg-white/[0.03]"
                  }`}
                >
                  <MethodBadge method={id} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-neutral-900 dark:text-white">
                      {PAYMENT_METHOD_LABELS[id]}
                    </span>
                    <span className="block text-xs text-neutral-500 dark:text-neutral-400 truncate">{note}</span>
                  </span>
                  <span
                    className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-colors ${
                      selected
                        ? "border-[#396254] bg-[#396254] text-[#dcf58d]"
                        : "border-neutral-300 dark:border-neutral-600"
                    }`}
                  >
                    {selected && <Check className="h-3 w-3 stroke-[3]" />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
