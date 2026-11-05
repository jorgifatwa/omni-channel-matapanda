/**
 * Payment methods offered at checkout (Midtrans Core API).
 * Client-safe: no server imports here.
 */

export const PAYMENT_METHODS = [
  "qris",
  "gopay",
  "shopeepay",
  "bca_va",
  "bni_va",
  "bri_va",
  "mandiri_bill",
  "permata_va",
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  qris: "QRIS",
  gopay: "GoPay",
  shopeepay: "ShopeePay",
  bca_va: "BCA Virtual Account",
  bni_va: "BNI Virtual Account",
  bri_va: "BRI Virtual Account",
  mandiri_bill: "Mandiri Virtual Account",
  permata_va: "Permata Virtual Account",
};

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return typeof value === "string" && (PAYMENT_METHODS as readonly string[]).includes(value);
}

export function isQrMethod(method: PaymentMethod): boolean {
  return method === "qris" || method === "gopay" || method === "shopeepay";
}

/** What the checkout renders for a pending charge (returned by the API). */
export interface PaymentInstructions {
  method: PaymentMethod;
  label: string;
  midtransOrderId: string;
  amount: number;
  expiresAt: string | null;
  vaNumber?: string;
  bank?: string;
  billerCode?: string;
  billKey?: string;
  qrUrl?: string;
  deeplinkUrl?: string;
}

/** Human label for a stored Payment.paymentType ("bca_va" -> "BCA Virtual Account"). */
export function paymentMethodLabel(paymentType: string | null | undefined): string {
  if (!paymentType) return "-";
  return isPaymentMethod(paymentType) ? PAYMENT_METHOD_LABELS[paymentType] : paymentType;
}
