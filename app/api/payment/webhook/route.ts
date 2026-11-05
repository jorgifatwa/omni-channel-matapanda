import { NextResponse } from "next/server";
import crypto from "crypto";
import { applyMidtransStatus } from "@/lib/midtrans-payment";
import type { MidtransResponse } from "@/lib/midtrans";

/**
 * Midtrans HTTP notification (webhook) handler.
 *
 * Signature per Midtrans docs (https://docs.midtrans.com/docs/https-notification-webhooks):
 *   signature_key = SHA512(order_id + status_code + gross_amount + ServerKey)
 *
 * Response codes: 2xx = processed (no retry); 401 bad signature; 503 server key missing;
 * 500 database failure (Midtrans retries).
 */

function verifySignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  signatureKey: string,
  serverKey: string
): boolean {
  const expected = crypto
    .createHash("sha512")
    .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
    .digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signatureKey.trim().toLowerCase(), "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const str = (v: unknown): string => (typeof v === "string" ? v : v == null ? "" : String(v));

export async function POST(request: Request) {
  let notification: MidtransResponse;
  try {
    notification = await request.json();
  } catch {
    return NextResponse.json({ error: "Body notifikasi tidak valid." }, { status: 400 });
  }

  const orderId = str(notification.order_id);
  const signatureKey = str(notification.signature_key);

  const serverKey = process.env.MIDTRANS_SERVER_KEY?.trim();
  if (!serverKey) {
    console.error("[Midtrans Webhook] MIDTRANS_SERVER_KEY belum dikonfigurasi; notifikasi ditolak.");
    return NextResponse.json({ error: "Kunci server Midtrans belum dikonfigurasi." }, { status: 503 });
  }
  if (
    !orderId ||
    !signatureKey ||
    !verifySignature(orderId, str(notification.status_code), str(notification.gross_amount), signatureKey, serverKey)
  ) {
    console.warn(`[Midtrans Webhook] Signature tidak valid atau tidak ada (order_id=${orderId || "-"}).`);
    return NextResponse.json({ error: "Signature tidak valid." }, { status: 401 });
  }

  try {
    const result = await applyMidtransStatus(notification);
    switch (result.kind) {
      case "not_found":
        console.warn(`[Midtrans Webhook] Pesanan ${orderId} tidak ditemukan.`);
        return NextResponse.json({ status: "ignored", reason: "order not found" });
      case "amount_mismatch":
        // Logged for review; acknowledged so Midtrans stops retrying
        return NextResponse.json({ status: "ignored", reason: "amount mismatch" });
      case "ignored":
        console.info(`[Midtrans Webhook] Diabaikan: ${result.reason}`);
        return NextResponse.json({ status: "ignored", order_id: orderId });
      case "ok":
        return NextResponse.json({
          status: "ok",
          order_id: orderId,
          payment_status: result.paymentStatus,
        });
    }
  } catch (dbErr) {
    console.error(`[Midtrans Webhook] Gagal memperbarui database untuk ${orderId}:`, dbErr);
    return NextResponse.json({ error: "Gagal memperbarui database." }, { status: 500 });
  }
}
