import nodemailer from "nodemailer";

export interface EmailOrderItem {
  productName: string;
  sku?: string;
  size?: string;
  color?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface OrderConfirmationData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  shippingAddress: {
    recipient: string;
    street: string;
    city: string;
    province: string;
    postalCode?: string;
    country: string;
  };
  courier: string;
  courierService: string;
  trackingNumber?: string | null;
  items: EmailOrderItem[];
  subtotal: number;
  shippingCost: number;
  discountAmount?: number;
  totalAmount: number;
  paymentMethod: string;
  createdAt?: string;
}

export interface ContactInquiryEmailData {
  name: string;
  email: string;
  phone?: string | null;
  message: string;
  createdAt?: string;
}

function getTransporter() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT) || 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!user || !pass) {
    return null;
  }

  // Gmail SMTP specific optimization
  if (host.includes("gmail")) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user,
        pass,
      },
    });
  }

  const secure = process.env.SMTP_SECURE === "true" || port === 465;
  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
}

export function generateOrderReceiptHtml(data: OrderConfirmationData): string {
  const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const trackingLink = `${appUrl}/tracking?orderId=${encodeURIComponent(data.orderNumber)}`;

  const itemsRows = data.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <div style="font-weight: 600; color: #111111; font-size: 14px;">${item.productName}</div>
          <div style="font-size: 12px; color: #737373; margin-top: 2px;">
            Size: ${item.size || "-"} &bull; Warna: ${item.color || "-"} &bull; Qty: ${item.quantity}
          </div>
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; text-align: right; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 600; color: #111111; font-size: 14px;">
          Rp ${item.subtotal.toLocaleString("id-ID")}
        </td>
      </tr>
    `
    )
    .join("");

  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bukti Pembayaran & Konfirmasi Pesanan - ${data.orderNumber}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f7f7f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f7f7f7; padding: 40px 15px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border: 1px solid #eaeaea; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
          
          <!-- Header Logo Bar -->
          <tr>
            <td style="background-color: #000000; padding: 24px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 900; letter-spacing: 4px; color: #ffffff; text-transform: uppercase;">it&apos;smatapanda</h1>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 32px 28px;">
              <!-- Title & Greeting -->
              <div style="text-align: center; margin-bottom: 24px;">
                <span style="display: inline-block; background-color: #ecfdf5; color: #047857; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; border: 1px solid #a7f3d0;">
                  Pembayaran Terverifikasi (Settlement)
                </span>
                <h2 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 800; color: #171717;">
                  Terima Kasih, ${data.customerName}!
                </h2>
                <p style="margin: 0; font-size: 13px; color: #737373; line-height: 1.5;">
                  Pesanan Anda telah kami terima dan sedang disiapkan oleh tim it&apos;smatapanda.
                </p>
              </div>

              <!-- Order & Tracking Meta Box -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #fafafa; border: 1px solid #eeeeee; border-radius: 8px; padding: 16px; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 4px 0; font-size: 12px; color: #737373;">Nomor Order ID</td>
                  <td style="padding: 4px 0; font-size: 13px; font-weight: 700; color: #111111; text-align: right; font-family: monospace;">${data.orderNumber}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-size: 12px; color: #737373;">Metode Pengiriman</td>
                  <td style="padding: 4px 0; font-size: 12px; font-weight: 600; color: #111111; text-align: right;">${data.courier} (${data.courierService})</td>
                </tr>
                ${
                  data.trackingNumber
                    ? `
                <tr>
                  <td style="padding: 4px 0; font-size: 12px; color: #737373;">Nomor Resi</td>
                  <td style="padding: 4px 0; font-size: 13px; font-weight: 700; color: #111111; text-align: right; font-family: monospace;">${data.trackingNumber}</td>
                </tr>
                `
                    : ""
                }
                <tr>
                  <td style="padding: 4px 0; font-size: 12px; color: #737373;">Metode Pembayaran</td>
                  <td style="padding: 4px 0; font-size: 12px; font-weight: 600; color: #111111; text-align: right;">${data.paymentMethod}</td>
                </tr>
              </table>

              <!-- CTA Button: Lacak Pesanan -->
              <div style="text-align: center; margin-bottom: 32px;">
                <a href="${trackingLink}" target="_blank" style="display: inline-block; background-color: #000000; color: #ffffff; font-size: 13px; font-weight: 700; text-decoration: none; padding: 14px 28px; border-radius: 8px; letter-spacing: 1px; text-transform: uppercase;">
                  Lacak Pengiriman Pesanan &rarr;
                </a>
              </div>

              <!-- Product Items Table -->
              <div style="margin-bottom: 24px;">
                <h3 style="margin: 0 0 12px 0; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #525252; border-bottom: 2px solid #111111; padding-bottom: 6px;">
                  Rincian Barang
                </h3>
                <table width="100%" border="0" cellpadding="0" cellspacing="0">
                  ${itemsRows}
                </table>
              </div>

              <!-- Calculation Summary -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 28px; font-size: 13px;">
                <tr>
                  <td style="padding: 4px 0; color: #737373;">Subtotal Produk</td>
                  <td style="padding: 4px 0; color: #111111; text-align: right; font-weight: 500;">Rp ${data.subtotal.toLocaleString("id-ID")}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #737373;">Ongkos Kirim (${data.courier})</td>
                  <td style="padding: 4px 0; color: #111111; text-align: right; font-weight: 500;">Rp ${data.shippingCost.toLocaleString("id-ID")}</td>
                </tr>
                ${
                  data.discountAmount && data.discountAmount > 0
                    ? `
                <tr>
                  <td style="padding: 4px 0; color: #047857;">Diskon</td>
                  <td style="padding: 4px 0; color: #047857; text-align: right; font-weight: 600;">-Rp ${data.discountAmount.toLocaleString("id-ID")}</td>
                </tr>
                `
                    : ""
                }
                <tr>
                  <td style="padding: 12px 0 0 0; font-size: 15px; font-weight: 800; color: #000000; border-top: 1px solid #eeeeee;">Total Pembayaran</td>
                  <td style="padding: 12px 0 0 0; font-size: 16px; font-weight: 800; color: #000000; text-align: right; border-top: 1px solid #eeeeee;">Rp ${data.totalAmount.toLocaleString("id-ID")}</td>
                </tr>
              </table>

              <!-- Shipping Destination Address Box -->
              <div style="background-color: #fafafa; border: 1px solid #eeeeee; border-radius: 8px; padding: 16px; font-size: 12px; color: #525252; line-height: 1.5;">
                <div style="font-weight: 700; color: #111111; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Alamat Pengiriman</div>
                <div><strong>${data.shippingAddress.recipient}</strong> (${data.customerPhone || "-"})</div>
                <div>${data.shippingAddress.street}</div>
                <div>${data.shippingAddress.city}, ${data.shippingAddress.province} ${data.shippingAddress.postalCode || ""}</div>
                <div>${data.shippingAddress.country}</div>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #fbfbfb; border-top: 1px solid #eeeeee; padding: 20px; text-align: center; font-size: 11px; color: #a3a3a3;">
              <p style="margin: 0 0 6px 0;">Butuh bantuan dengan pesanan Anda? Hubungi kami di <a href="mailto:support@zodiacjakarta.com" style="color: #111111; text-decoration: underline;">support@zodiacjakarta.com</a></p>
              <p style="margin: 0;">&copy; 2026 it&apos;smatapanda. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export function generateAdminInquiryHtml(data: ContactInquiryEmailData): string {
  const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pesan Baru dari Form Kontak: ${data.name}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f7f7f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f7f7f7; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border: 1px solid #eaeaea; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
          <tr>
            <td style="background-color: #000000; padding: 20px 24px; text-align: left;">
              <span style="color: #ffffff; font-size: 18px; font-weight: 900; letter-spacing: 2px;">it&apos;smatapanda ADMIN</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 24px;">
              <span style="display: inline-block; background-color: #eff6ff; color: #1d4ed8; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; margin-bottom: 12px;">
                Pesan Kontak Masuk
              </span>
              <h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 800; color: #111111;">
                Pesan Baru dari ${data.name}
              </h2>

              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #fafafa; border: 1px solid #eeeeee; border-radius: 8px; padding: 16px; margin-bottom: 20px; font-size: 13px;">
                <tr>
                  <td style="padding: 4px 0; color: #737373; width: 110px;">Nama Pengirim</td>
                  <td style="padding: 4px 0; font-weight: 700; color: #111111;">${data.name}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #737373;">Email</td>
                  <td style="padding: 4px 0; font-weight: 600; color: #005bd3;">
                    <a href="mailto:${data.email}" style="color: #005bd3; text-decoration: underline;">${data.email}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #737373;">No. Handphone</td>
                  <td style="padding: 4px 0; color: #111111;">${data.phone || "-"}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #737373;">Waktu Kirim</td>
                  <td style="padding: 4px 0; color: #525252;">${new Date().toLocaleString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                </tr>
              </table>

              <div style="margin-bottom: 24px;">
                <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #525252; margin-bottom: 8px;">
                  Isi Pesan:
                </div>
                <div style="background-color: #ffffff; border: 1px solid #e5e5e5; border-radius: 8px; padding: 16px; font-size: 14px; color: #1f2937; line-height: 1.6; white-space: pre-wrap;">
${data.message}
                </div>
              </div>

              <table width="100%" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-right: 8px;">
                    <a href="mailto:${data.email}?subject=Re:%20Inquiry%20it'smatapanda" style="display: block; text-align: center; background-color: #000000; color: #ffffff; font-size: 12px; font-weight: 700; text-decoration: none; padding: 12px 20px; border-radius: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
                      Balas Email Pengirim &rarr;
                    </a>
                  </td>
                  <td style="padding-left: 8px;">
                    <a href="${appUrl}/admin/inquiries" target="_blank" style="display: block; text-align: center; background-color: #f3f4f6; color: #111111; font-size: 12px; font-weight: 700; text-decoration: none; padding: 12px 20px; border-radius: 8px; text-transform: uppercase; border: 1px solid #e5e7eb;">
                      Buka di Admin Panel
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: #fbfbfb; border-top: 1px solid #eeeeee; padding: 16px; text-align: center; font-size: 11px; color: #a3a3a3;">
              Notifikasi otomatis dari Sistem Form Kontak it&apos;smatapanda.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export async function sendOrderConfirmationEmail(
  data: OrderConfirmationData
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const transporter = getTransporter();

    if (!transporter) {
      console.log(
        `[Nodemailer Simulation] SMTP_USER/SMTP_PASSWORD belum dikonfigurasi di .env. Email untuk ${data.customerEmail} (Order ${data.orderNumber}) dicatat secara lokal.`
      );
      return {
        success: true,
        messageId: `simulated-${Date.now()}`,
      };
    }

    const fromAddress =
      process.env.SMTP_FROM ||
      `"it'smatapanda" <${process.env.SMTP_USER || "no-reply@zodiacjakarta.com"}>`;

    const htmlContent = generateOrderReceiptHtml(data);

    const info = await transporter.sendMail({
      from: fromAddress,
      to: data.customerEmail,
      subject: `Konfirmasi Pesanan it'smatapanda: ${data.orderNumber} (Lunas)`,
      html: htmlContent,
    });

    console.log(`[Nodemailer] Email konfirmasi berhasil dikirim ke ${data.customerEmail}. MessageID: ${info.messageId}`);
    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error("[Nodemailer Error] Gagal mengirim email konfirmasi:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal mengirim email",
    };
  }
}

export async function sendAdminInquiryNotification(
  data: ContactInquiryEmailData
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const transporter = getTransporter();
    const adminTargetEmail =
      process.env.ADMIN_DEFAULT_EMAIL ||
      process.env.SMTP_USER ||
      "jorgifatwaambia@gmail.com";

    if (!transporter) {
      console.log(
        `[Nodemailer Simulation] Pesan Kontak Baru dari ${data.name} (${data.email}): "${data.message.slice(0, 60)}..."`
      );
      return {
        success: true,
        messageId: `simulated-contact-${Date.now()}`,
      };
    }

    const fromAddress =
      process.env.SMTP_FROM ||
      `"it'smatapanda Contact Form" <${process.env.SMTP_USER || "no-reply@zodiacjakarta.com"}>`;

    const htmlContent = generateAdminInquiryHtml(data);

    const info = await transporter.sendMail({
      from: fromAddress,
      to: adminTargetEmail,
      replyTo: data.email,
      subject: `[it'smatapanda Inquiry] Pesan Baru dari ${data.name}`,
      html: htmlContent,
    });

    console.log(`[Nodemailer] Notifikasi pesan kontak berhasil dikirim ke Admin (${adminTargetEmail}). MessageID: ${info.messageId}`);
    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error("[Nodemailer Error] Gagal mengirim notifikasi pesan kontak:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal mengirim notifikasi email",
    };
  }
}
