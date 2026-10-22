#!/usr/bin/env node

/**
 * Pre-flight production environment validator.
 * Checks for required, optional, and security-critical environment variables.
 *
 * Usage:
 *   node scripts/check-env.js
 */

const fs = require("fs");
const path = require("path");

// Load .env if running locally
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
  content.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  });
}

const CHECKS = [
  {
    category: "1. Core & Database",
    items: [
      {
        key: "DATABASE_URL",
        required: true,
        validator: (v) => v && !v.includes("localhost"),
        desc: "PostgreSQL Production Connection URL",
      },
      {
        key: "NEXTAUTH_URL",
        required: true,
        validator: (v) => v && v.startsWith("https://"),
        desc: "Production URL (wajib https:// di production)",
      },
      {
        key: "NEXTAUTH_SECRET",
        required: true,
        validator: (v) => v && v.length >= 32 && !v.includes("super-secret-jwt-key"),
        desc: "Secret token JWT NextAuth (minimal 32 karakter)",
      },
      {
        key: "ADMIN_DEFAULT_EMAIL",
        required: true,
        validator: (v) => v && v.includes("@"),
        desc: "Email Super Admin",
      },
      {
        key: "ADMIN_DEFAULT_PASSWORD",
        required: true,
        validator: (v) => v && v.length >= 8 && v !== "admin123" && v !== "admin-password-change-me",
        desc: "Password Super Admin (wajib diganti dari default)",
      },
    ],
  },
  {
    category: "2. Payment Gateway (Midtrans)",
    items: [
      {
        key: "MIDTRANS_IS_PRODUCTION",
        required: true,
        validator: (v) => v === "true",
        desc: "Mode Midtrans (wajib 'true' untuk production)",
      },
      {
        key: "MIDTRANS_SERVER_KEY",
        required: true,
        validator: (v) => v && !v.startsWith("SB-Mid-server") && !v.includes("demo"),
        desc: "Midtrans Production Server Key (diawali Mid-server-)",
      },
      {
        key: "NEXT_PUBLIC_MIDTRANS_CLIENT_KEY",
        required: true,
        validator: (v) => v && !v.startsWith("SB-Mid-client") && !v.includes("demo"),
        desc: "Midtrans Production Client Key (diawali Mid-client-)",
      },
      {
        key: "MIDTRANS_MERCHANT_ID",
        required: true,
        validator: (v) => Boolean(v),
        desc: "Midtrans Merchant ID",
      },
    ],
  },
  {
    category: "3. Media Storage (Cloudflare R2 / Cloudinary)",
    items: [
      {
        key: "R2_ACCOUNT_ID",
        required: true,
        validator: (v) => v && v !== "your-cloudflare-account-id",
        desc: "Cloudflare R2 Account ID",
      },
      {
        key: "R2_ACCESS_KEY_ID",
        required: true,
        validator: (v) => v && v !== "your-r2-access-key-id",
        desc: "Cloudflare R2 Access Key ID",
      },
      {
        key: "R2_SECRET_ACCESS_KEY",
        required: true,
        validator: (v) => v && v !== "your-r2-secret-access-key",
        desc: "Cloudflare R2 Secret Access Key",
      },
      {
        key: "R2_BUCKET_NAME",
        required: true,
        validator: (v) => Boolean(v),
        desc: "Cloudflare R2 Bucket Name",
      },
      {
        key: "R2_PUBLIC_URL",
        required: true,
        validator: (v) => v && v.startsWith("https://") && !v.includes("your-bucket-id"),
        desc: "Public URL atau Custom Domain R2",
      },
    ],
  },
  {
    category: "4. Shipping & Logistics (RajaOngkir)",
    items: [
      {
        key: "RAJAONGKIR_API_KEY",
        required: true,
        validator: (v) => v && v !== "your-rajaongkir-api-key",
        desc: "API Key RajaOngkir (Starter/Basic/Pro)",
      },
      {
        key: "RAJAONGKIR_ORIGIN_CITY_ID",
        required: true,
        validator: (v) => Boolean(v),
        desc: "City ID Origin pengiriman (23 = Kota Bandung)",
      },
    ],
  },
  {
    category: "5. Marketplace Integration (Shopee & TikTok Shop)",
    items: [
      {
        key: "MARKETPLACE_ENCRYPTION_KEY",
        required: true,
        validator: (v) => v && v.length === 64 && /^[0-9a-fA-F]{64}$/.test(v),
        desc: "AES-256 64-char Hex Key untuk enkripsi token toko",
      },
      {
        key: "SHOPEE_PARTNER_ID",
        required: false,
        validator: (v) => v && v !== "your-shopee-partner-id",
        desc: "Shopee Open Platform Partner ID",
      },
      {
        key: "SHOPEE_PARTNER_KEY",
        required: false,
        validator: (v) => v && v !== "your-shopee-partner-key",
        desc: "Shopee Open Platform Partner Key",
      },
      {
        key: "SHOPEE_REDIRECT_URI",
        required: false,
        validator: (v) => v && v.startsWith("https://") && !v.includes("localhost") && !v.includes("ngrok"),
        desc: "Shopee OAuth Callback (harus domain production HTTPS)",
      },
      {
        key: "SHOPEE_SANDBOX",
        required: false,
        validator: (v) => v === "false",
        desc: "Shopee Sandbox Mode ('false' untuk toko live)",
      },
      {
        key: "TIKTOK_SHOP_APP_KEY",
        required: false,
        validator: (v) => v && v !== "your-tiktok-shop-app-key",
        desc: "TikTok Shop Partner Center App Key",
      },
      {
        key: "TIKTOK_SHOP_APP_SECRET",
        required: false,
        validator: (v) => v && v !== "your-tiktok-shop-app-secret",
        desc: "TikTok Shop Partner Center App Secret",
      },
      {
        key: "TIKTOK_SHOP_REDIRECT_URI",
        required: false,
        validator: (v) => v && v.startsWith("https://") && !v.includes("localhost") && !v.includes("ngrok"),
        desc: "TikTok Shop OAuth Callback (harus domain production HTTPS)",
      },
      {
        key: "CRON_SECRET",
        required: true,
        validator: (v) => v && v !== "your-secure-random-cron-secret",
        desc: "Secret Key untuk endpoint otomatisasi /api/integrations/refresh-tokens",
      },
    ],
  },
  {
    category: "6. Email Notification (SMTP)",
    items: [
      {
        key: "SMTP_HOST",
        required: true,
        validator: (v) => Boolean(v),
        desc: "Host SMTP (e.g. smtp.gmail.com)",
      },
      {
        key: "SMTP_USER",
        required: true,
        validator: (v) => v && v.includes("@"),
        desc: "Email pengirim SMTP",
      },
      {
        key: "SMTP_PASSWORD",
        required: true,
        validator: (v) => v && !v.includes("xxxx"),
        desc: "Password / App Password email pengirim",
      },
      {
        key: "SMTP_FROM",
        required: true,
        validator: (v) => Boolean(v),
        desc: "Nama pengirim email header",
      },
    ],
  },
];

console.log("\n=======================================================");
console.log("  AUDIT KESIAPAN PRODUCTION ENVIRONMENT (.env)");
console.log("=======================================================\n");

let totalIssues = 0;
let totalWarnings = 0;

CHECKS.forEach((group) => {
  console.log(`\n\x1b[1m${group.category}\x1b[0m`);
  console.log("-".repeat(55));

  group.items.forEach((item) => {
    const val = process.env[item.key];
    const isSet = typeof val === "string" && val.trim().length > 0;
    const isValid = isSet && (item.validator ? item.validator(val) : true);

    if (isValid) {
      console.log(`  \x1b[32m[OK]\x1b[0m     ${item.key.padEnd(30)} : Valid`);
    } else if (item.required) {
      totalIssues++;
      const reason = !isSet ? "Belum diisi / kosong" : "Format masih development/placeholder";
      console.log(
        `  \x1b[31m[FAIL]\x1b[0m   ${item.key.padEnd(30)} : ${reason} (${item.desc})`
      );
    } else {
      totalWarnings++;
      const reason = !isSet ? "Belum diisi" : "Masih format dev/staging";
      console.log(
        `  \x1b[33m[WARN]\x1b[0m   ${item.key.padEnd(30)} : ${reason} (Opsional: ${item.desc})`
      );
    }
  });
});

console.log("\n=======================================================");
if (totalIssues === 0 && totalWarnings === 0) {
  console.log("\x1b[32mHASIL: SEMUA VARIABEL PRODUCTION SUDAH VALID & SIAP LAUNCH!\x1b[0m");
} else if (totalIssues === 0) {
  console.log(`\x1b[33mHASIL: SIAP LAUNCH DENGAN ${totalWarnings} PERINGATAN OPSIONAL.\x1b[0m`);
} else {
  console.log(`\x1b[31mHASIL: TERDAPAT ${totalIssues} VARIABEL KRITIS YANG HARUS DIPERBAIKI SEBELUM LAUNCH.\x1b[0m`);
}
console.log("=======================================================\n");

if (totalIssues > 0 && process.argv.includes("--strict")) {
  process.exit(1);
}
