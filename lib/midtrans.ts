/**
 * Midtrans Core API helpers.
 *
 * The checkout builds its own payment UI (no Snap iframe): the buyer picks a
 * method, the server creates a Core API charge and the page renders the
 * returned VA number / QR code / app deeplink itself.
 *
 * Docs: https://docs.midtrans.com/reference/core-api
 */

import { createHash, timingSafeEqual } from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  PAYMENT_METHOD_LABELS,
  isQrMethod,
  type PaymentInstructions,
  type PaymentMethod,
} from "@/lib/payment-methods";

export {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  isPaymentMethod,
  isQrMethod,
  type PaymentInstructions,
  type PaymentMethod,
} from "@/lib/payment-methods";

// ─── Payment methods ─────────────────────────────────────────────────────────

/** QR / app payments get a short window; the buyer can always generate a new one. */
const QR_CHARGE_MINUTES = 30;
/** Total time an order may stay unpaid before it is cancelled. */
export const ORDER_PAYMENT_WINDOW_HOURS = 24;

export function orderPaymentDeadline(createdAt: Date): Date {
  return new Date(createdAt.getTime() + ORDER_PAYMENT_WINDOW_HOURS * 3_600_000);
}

// ─── Config / HTTP ───────────────────────────────────────────────────────────

export function midtransConfig() {
  const serverKey = process.env.MIDTRANS_SERVER_KEY?.trim() || "";
  const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";
  return {
    serverKey,
    isProduction,
    apiBase: isProduction ? "https://api.midtrans.com" : "https://api.sandbox.midtrans.com",
  };
}

export class MidtransError extends Error {
  constructor(
    message: string,
    public httpStatus: number,
    public statusCode?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "MidtransError";
  }
}

export type MidtransResponse = Record<string, unknown> & {
  status_code?: string;
  status_message?: string;
  transaction_id?: string;
  order_id?: string;
  gross_amount?: string;
  payment_type?: string;
  transaction_status?: string;
  fraud_status?: string;
  expiry_time?: string;
  va_numbers?: { bank: string; va_number: string }[];
  permata_va_number?: string;
  bill_key?: string;
  biller_code?: string;
  actions?: { name: string; method: string; url: string }[];
  qr_string?: string;
};

async function midtransRequest(
  path: string,
  method: "GET" | "POST",
  body?: unknown
): Promise<MidtransResponse> {
  const { serverKey, apiBase } = midtransConfig();
  if (!serverKey) throw new MidtransError("MIDTRANS_SERVER_KEY belum dikonfigurasi.", 503);

  const res = await fetch(`${apiBase}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${serverKey}:`).toString("base64")}`,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as MidtransResponse;
  return data;
}

// ─── Charge ──────────────────────────────────────────────────────────────────

export interface ChargeOrder {
  orderNumber: string;
  createdAt: Date;
  totalAmount: unknown;
  shippingCost: unknown;
  discountAmount: unknown;
  items: {
    sku: string | null;
    productId: string;
    productName: string;
    size: string | null;
    color: string | null;
    unitPrice: unknown;
    quantity: number;
  }[];
  shipment?: { courier: string; serviceName: string } | null;
  address?: {
    recipient: string;
    phone: string | null;
    street: string;
    city: string;
    postalCode: string | null;
  } | null;
  user?: { name: string | null; email: string; phone: string | null } | null;
}

export const toIdr = (value: unknown): number => Math.round(Number(value) || 0);
const clip = (value: string, max = 50): string => value.slice(0, max);

/** item_details whose sum always equals the order total (Midtrans requirement). */
function buildItemDetails(order: ChargeOrder, grossAmount: number) {
  const items = order.items.map((it) => ({
    id: clip(it.sku || it.productId),
    price: toIdr(it.unitPrice),
    quantity: it.quantity,
    name: clip([it.productName, it.size, it.color].filter(Boolean).join(" / ")),
  }));

  const shippingCost = toIdr(order.shippingCost);
  if (shippingCost > 0) {
    items.push({
      id: "SHIPPING",
      price: shippingCost,
      quantity: 1,
      name: clip(`Ongkos Kirim${order.shipment ? ` ${order.shipment.courier} ${order.shipment.serviceName}` : ""}`),
    });
  }
  const discount = toIdr(order.discountAmount);
  if (discount > 0) items.push({ id: "DISCOUNT", price: -discount, quantity: 1, name: "Diskon" });

  const diff = grossAmount - items.reduce((sum, it) => sum + it.price * it.quantity, 0);
  if (diff !== 0) items.push({ id: "ADJUSTMENT", price: diff, quantity: 1, name: "Penyesuaian Pembulatan" });
  return items;
}

function buildCustomerDetails(order: ChargeOrder) {
  const recipient = order.address?.recipient || order.user?.name || "Customer";
  const [firstName, ...rest] = recipient.trim().split(/\s+/);
  const phone = order.address?.phone || order.user?.phone || undefined;
  const address = order.address
    ? {
        first_name: firstName,
        last_name: rest.join(" "),
        phone,
        address: order.address.street,
        city: order.address.city,
        postal_code: order.address.postalCode || undefined,
      }
    : undefined;
  return {
    first_name: firstName || "Customer",
    last_name: rest.join(" "),
    email: order.user?.email || undefined,
    phone,
    billing_address: address,
    shipping_address: address,
  };
}

function methodPayload(method: PaymentMethod, finishUrl: string): Record<string, unknown> {
  switch (method) {
    case "qris":
      return { payment_type: "qris", qris: { acquirer: "gopay" } };
    case "gopay":
      return { payment_type: "gopay", gopay: { enable_callback: true, callback_url: finishUrl } };
    case "shopeepay":
      return { payment_type: "shopeepay", shopeepay: { callback_url: finishUrl } };
    case "bca_va":
      return { payment_type: "bank_transfer", bank_transfer: { bank: "bca" } };
    case "bni_va":
      return { payment_type: "bank_transfer", bank_transfer: { bank: "bni" } };
    case "bri_va":
      return { payment_type: "bank_transfer", bank_transfer: { bank: "bri" } };
    case "permata_va":
      return { payment_type: "bank_transfer", bank_transfer: { bank: "permata" } };
    case "mandiri_bill":
      return {
        payment_type: "echannel",
        echannel: { bill_info1: "Pembayaran:", bill_info2: "it's matapanda" },
      };
  }
}


/**
 * Creates a Core API charge. `midtransOrderId` must be unique per charge, so a
 * method switch uses a suffixed id (ZDC-12345678-2, -3, ...).
 */
export async function createCharge(
  order: ChargeOrder,
  method: PaymentMethod,
  midtransOrderId: string,
  finishUrl: string
): Promise<MidtransResponse> {
  const grossAmount = toIdr(order.totalAmount);
  const deadline = orderPaymentDeadline(order.createdAt).getTime();
  const minutesLeft = Math.max(1, Math.floor((deadline - Date.now()) / 60_000));
  const expiryMinutes = isQrMethod(method) ? Math.min(minutesLeft, QR_CHARGE_MINUTES) : minutesLeft;

  const payload = {
    ...methodPayload(method, finishUrl),
    transaction_details: { order_id: midtransOrderId, gross_amount: grossAmount },
    item_details: buildItemDetails(order, grossAmount),
    customer_details: buildCustomerDetails(order),
    custom_expiry: { expiry_duration: expiryMinutes, unit: "minute" },
  };

  const data = await midtransRequest("/v2/charge", "POST", payload);
  if (data.status_code !== "201" && data.status_code !== "200") {
    throw new MidtransError(
      data.status_message || "Midtrans menolak pembuatan tagihan.",
      502,
      data.status_code,
      (data as { validation_messages?: unknown }).validation_messages
    );
  }
  return data;
}

export async function getTransactionStatus(midtransOrderId: string): Promise<MidtransResponse> {
  return midtransRequest(`/v2/${encodeURIComponent(midtransOrderId)}/status`, "GET");
}

/** Best-effort: stop a pending charge so it can no longer be paid. */
export async function expireCharge(midtransOrderId: string): Promise<void> {
  const res = await midtransRequest(`/v2/${encodeURIComponent(midtransOrderId)}/expire`, "POST");
  if (res.status_code !== "407" && res.status_code !== "200") {
    await midtransRequest(`/v2/${encodeURIComponent(midtransOrderId)}/cancel`, "POST").catch(() => undefined);
  }
}

// ─── Instructions shown to the buyer ─────────────────────────────────────────


/** Midtrans returns "YYYY-MM-DD HH:mm:ss" in Jakarta time (UTC+7). */
function parseMidtransTime(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const d = new Date(`${value.trim().replace(" ", "T")}+07:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Infers our method key from a charge/status/notification payload. */
export function methodFromMidtrans(data: MidtransResponse): PaymentMethod | null {
  switch (data.payment_type) {
    case "qris":
      return "qris";
    case "gopay":
      return "gopay";
    case "shopeepay":
      return "shopeepay";
    case "echannel":
      return "mandiri_bill";
    case "bank_transfer": {
      if (data.permata_va_number) return "permata_va";
      const bank = data.va_numbers?.[0]?.bank;
      if (bank === "bca") return "bca_va";
      if (bank === "bni") return "bni_va";
      if (bank === "bri") return "bri_va";
      if (bank === "permata") return "permata_va";
      return null;
    }
    default:
      return null;
  }
}

/**
 * Normalises a charge OR status response into what the checkout renders.
 * Status responses carry no `actions`, so QR images are rebuilt from the
 * transaction id; ShopeePay deeplinks only exist on the charge response.
 */
export function toInstructions(
  data: MidtransResponse,
  method: PaymentMethod,
  midtransOrderId: string,
  amount: number
): PaymentInstructions {
  const { apiBase } = midtransConfig();
  const action = (name: string) => data.actions?.find((a) => a.name === name)?.url;
  const out: PaymentInstructions = {
    method,
    label: PAYMENT_METHOD_LABELS[method],
    midtransOrderId,
    amount,
    expiresAt: parseMidtransTime(data.expiry_time),
  };

  if (method === "permata_va") {
    out.bank = "permata";
    out.vaNumber = data.permata_va_number || data.va_numbers?.[0]?.va_number;
  } else if (method === "mandiri_bill") {
    out.bank = "mandiri";
    out.billerCode = data.biller_code;
    out.billKey = data.bill_key;
  } else if (method.endsWith("_va")) {
    out.bank = data.va_numbers?.[0]?.bank || method.replace("_va", "");
    out.vaNumber = data.va_numbers?.[0]?.va_number;
  } else if (method === "qris" || method === "gopay") {
    out.qrUrl =
      action("generate-qr-code") ||
      (data.transaction_id
        ? `${apiBase}/v2/${method === "qris" ? "qris" : "gopay"}/${data.transaction_id}/qr-code`
        : undefined);
    if (method === "gopay") out.deeplinkUrl = action("deeplink-redirect");
  } else if (method === "shopeepay") {
    out.deeplinkUrl = action("deeplink-redirect");
  }
  return out;
}

/** True when the instructions contain everything the buyer needs to pay. */
export function instructionsComplete(i: PaymentInstructions): boolean {
  switch (i.method) {
    case "mandiri_bill":
      return Boolean(i.billerCode && i.billKey);
    case "qris":
      return Boolean(i.qrUrl);
    case "gopay":
      return Boolean(i.qrUrl || i.deeplinkUrl);
    case "shopeepay":
      return Boolean(i.deeplinkUrl);
    default:
      return Boolean(i.vaNumber);
  }
}

// ─── Order access ────────────────────────────────────────────────────────────

/**
 * Only the browser that created the order (secret checkout token) or an admin
 * may start or inspect a payment.
 */
export async function canAccessOrderPayment(
  order: { checkoutTokenHash: string | null },
  checkoutToken: unknown
): Promise<boolean> {
  const provided = typeof checkoutToken === "string" ? checkoutToken.trim() : "";
  if (provided && order.checkoutTokenHash) {
    const providedHash = createHash("sha256").update(provided).digest();
    const storedHash = Buffer.from(order.checkoutTokenHash, "hex");
    if (storedHash.length === providedHash.length && timingSafeEqual(storedHash, providedHash)) {
      return true;
    }
  }
  const session = await getServerSession(authOptions).catch(() => null);
  return (session?.user as { role?: string } | undefined)?.role === "ADMIN";
}

/** Next charge id for an order: ZDC-1 -> ZDC-1-2 -> ZDC-1-3 ... */
export function nextMidtransOrderId(orderNumber: string, previous?: string | null): string {
  if (!previous) return orderNumber;
  const m = previous.slice(orderNumber.length).match(/^-(\d+)$/);
  const n = m ? Number(m[1]) + 1 : 2;
  return `${orderNumber}-${n}`;
}
