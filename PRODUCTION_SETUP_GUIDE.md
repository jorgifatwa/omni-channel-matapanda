# Panduan Lengkap Konfigurasi API Key & Deployment Production

Dokumen ini berisi panduan teknis langkah demi langkah untuk melakukan konfigurasi seluruh API Key pihak ketiga (Shopee, TikTok Shop / Tokopedia, Midtrans, RajaOngkir, Cloudflare R2, dan SMTP Email) serta langkah deployment ke server production.

---

## Daftar Isi
1. [Tools Utilitas Kesiapan Production](#1-tools-utilitas-kesiapan-production)
2. [Integrasi Shopee Open Platform](#2-integrasi-shopee-open-platform)
3. [Integrasi TikTok Shop Partner Center (Tokopedia)](#3-integrasi-tiktok-shop-partner-center-tokopedia)
4. [Integrasi Payment Gateway Midtrans](#4-integrasi-payment-gateway-midtrans)
5. [Integrasi Ongkos Kirim (RajaOngkir)](#5-integrasi-ongkos-kirim-rajaongkir)
6. [Integrasi Media Storage (Cloudflare R2)](#6-integrasi-media-storage-cloudflare-r2)
7. [Integrasi Email Transaksional (SMTP)](#7-integrasi-email-transaksional-smtp)
8. [Database PostgreSQL Production](#8-database-postgresql-production)
9. [Checklist Environment Variables (.env)](#9-checklist-environment-variables-env)
10. [Langkah Deployment Production (VPS / Vercel)](#10-langkah-deployment-production-vps--vercel)

---

## 1. Tools Utilitas Kesiapan Production

Di dalam project ini telah disediakan dua script otomatis:

### A. Generate Secret Keys
Jalankan perintah ini di terminal untuk menghasilkan key kriptografi yang aman:
```bash
npm run generate:keys
# atau
node scripts/generate-keys.js
```
Script ini akan menghasilkan:
- `NEXTAUTH_SECRET` (JWT session key)
- `MARKETPLACE_ENCRYPTION_KEY` (AES-256 64-karakter hex key untuk enkripsi token toko di database)
- `CRON_SECRET` (Kunci rahasia untuk endpoint refresh token otomatis)

### B. Audit Environment Pre-Flight
Sebelum menjalankan server di production, jalankan audit untuk memastikan tidak ada key yang tertinggal atau masih bernilai dummy:
```bash
npm run validate:env
# atau
node scripts/check-env.js
```

---

## 2. Integrasi Shopee Open Platform

Integrasi Shopee memungkinkan sinkronisasi stok otomatis 3 arah (Website <-> Shopee <-> TikTok Shop).

### Langkah-langkah Pendaftaran & API Key:
1. **Daftar Akun Developer**:
   - Kunjungi [Shopee Open Platform](https://open.shopee.com/).
   - Buat akun Developer (bisa menggunakan akun Shopee Anda).
2. **Buat Aplikasi (Create App)**:
   - Masuk ke Console -> **App Management** -> **Create App**.
   - Pilih jenis aplikasi: **Custom / In-House App** (jika untuk toko Anda sendiri) atau **Partner App**.
   - Nama Aplikasi: misal `it'smatapanda Omnichannel`.
3. **Dapatkan Credentials**:
   - Di halaman detail aplikasi, Anda akan mendapatkan:
     - **Partner ID** (Angka numerik, contoh: `1232806`)
     - **Partner Key** (String rahasia hex, contoh: `shpk6e76...`)
4. **Setting Redirect URL (Callback OAuth)**:
   - Di tab **App Settings** -> **Redirect URL**, masukkan URL callback production Anda:
     ```
     https://domain-anda.com/api/integrations/shopee/callback
     ```
   - *Catatan: Shopee mewajibkan protokol HTTPS.*
5. **Setting Push Mechanism (Webhook Real-Time)**:
   - Di menu **Push Mechanism / Webhook**, aktifkan notifikasi untuk:
     - `Order Status Update` (Code 3)
     - `Tracking No Update` (Code 4)
   - Masukkan Callback URL Webhook:
     ```
     https://domain-anda.com/api/integrations/shopee/webhook
     ```
6. **Konfigurasi di `.env` Production**:
   ```env
   SHOPEE_PARTNER_ID="partner-id-anda"
   SHOPEE_PARTNER_KEY="partner-key-rahasia-anda"
   SHOPEE_REDIRECT_URI="https://domain-anda.com/api/integrations/shopee/callback"
   SHOPEE_SANDBOX="false"
   ```
7. **Hubungkan Toko Live**:
   - Buka Admin Dashboard Anda di `https://domain-anda.com/admin/integrations`.
   - Klik **Hubungkan Shopee** (atau buka `/api/integrations/shopee/connect`).
   - Login dengan akun Penjual Shopee Anda dan klik **Authorize**.
   - Toko akan langsung terhubung, token terenkripsi di database, dan produk siap di-mapping.

---

## 3. Integrasi TikTok Shop Partner Center (Tokopedia)

Pasca merger TikTok Shop dan Tokopedia, integrasi API penjual dikelola secara terpusat melalui TikTok Shop Partner Center.

### Langkah-langkah Pendaftaran & API Key:
1. **Daftar Akun Partner**:
   - Kunjungi [TikTok Shop Partner Center](https://partner.tiktokshop.com/).
   - Login / Registrasi akun pengembang.
2. **Buat Aplikasi (Create App)**:
   - Pilih tipe aplikasi: **Custom App (In-house)** jika mengintegrasikan toko sendiri, atau **Public App**.
   - Target Region: Pilih **Indonesia**.
3. **Dapatkan Credentials**:
   - Di halaman aplikasi:
     - **App Key**: contoh `6jcrkfuoe2doq`
     - **App Secret**: contoh `5b85eef23d6...`
     - **Service ID**: ID layanan aplikasi Anda
4. **Setting Redirect URL (OAuth Callback)**:
   - Daftarkan URL redirect di dashboard TikTok Shop:
     ```
     https://domain-anda.com/api/integrations/tiktokshop/callback
     ```
5. **Setting Webhook Event**:
   - Pada menu **Webhooks**:
     - Masukkan Endpoint: `https://domain-anda.com/api/integrations/tiktokshop/webhook`
     - Subscribe event: `Order Status Change`, `Package Status Change`.
     - Sistem webhooks kami telah mendukung verification handshake (`hub.challenge` / `challenge`).
6. **Konfigurasi di `.env` Production**:
   ```env
   TIKTOK_SHOP_APP_KEY="app-key-anda"
   TIKTOK_SHOP_APP_SECRET="app-secret-anda"
   TIKTOK_SHOP_SERVICE_ID="service-id-anda"
   TIKTOK_SHOP_REDIRECT_URI="https://domain-anda.com/api/integrations/tiktokshop/callback"
   ```
7. **Hubungkan Toko**:
   - Masuk ke Admin Dashboard `https://domain-anda.com/admin/integrations`.
   - Klik **Hubungkan TikTok Shop / Tokopedia**.
   - Lakukan otorisasi dan toko berhasil tersinkronisasi.

---

## 4. Integrasi Payment Gateway Midtrans

Midtrans memproses pembayaran otomatis di Indonesia melalui QRIS (GoPay, OVO, ShopeePay), Virtual Account BCA/Mandiri/BRI/BNI, dan Kartu Kredit.

### Langkah-langkah Konfigurasi:
1. **Pendaftaran Akun**:
   - Buat akun di [Midtrans Dashboard](https://dashboard.midtrans.com/).
   - Selesaikan proses KYC & aktivasi toko (Production Approval).
2. **Ambil Access Keys**:
   - Di dashboard Midtrans, pastikan toggle di pojok kiri atas berada pada mode **Production** (bukan Sandbox).
   - Masuk ke menu **Settings** -> **Access Keys**.
   - Salin:
     - **Merchant ID**
     - **Client Key**
     - **Server Key**
3. **Setting Notification / Webhook URL**:
   - Masuk ke menu **Settings** -> **Configuration**.
   - Di kolom **Payment Notification URL**, isi:
     ```
     https://domain-anda.com/api/payment/webhook
     ```
   - Di kolom **Finish Redirect URL**, isi:
     ```
     https://domain-anda.com/checkout/finish
     ```
   - Di kolom **Unfinish Redirect URL** & **Error Redirect URL**, isi URL checkout Anda.
4. **Konfigurasi di `.env` Production**:
   ```env
   MIDTRANS_IS_PRODUCTION="true"
   MIDTRANS_MERCHANT_ID="Mxxxxxxxx"
   MIDTRANS_SERVER_KEY="Mid-server-xxxxxxxxxxxxxxxxxxxxxxxx"
   NEXT_PUBLIC_MIDTRANS_CLIENT_KEY="Mid-client-xxxxxxxxxxxxxxxx"
   ```

---

## 5. Integrasi Ongkos Kirim (RajaOngkir)

Digunakan untuk menghitung ongkos kirim real-time JNE, TIKI, dan POS Indonesia ke seluruh kota/kabupaten di Indonesia.

### Langkah-langkah:
1. Daftar akun di [RajaOngkir](https://rajaongkir.com/).
2. Masuk ke panel akun Anda dan salin **API Key**.
3. Tentukan Kota Asal Pengiriman Toko (**Origin City ID**):
   - Contoh: Jakarta Selatan = `153`, Jakarta Pusat = `152`, Bandung = `23`, Surabaya = `444`.
4. **Konfigurasi di `.env` Production**:
   ```env
   RAJAONGKIR_API_KEY="api-key-rajaongkir-anda"
   RAJAONGKIR_ORIGIN_CITY_ID="153"
   ```

---

## 6. Integrasi Media Storage (Cloudflare R2)

Cloudflare R2 adalah penyimpanan objek (kompatibel AWS S3) berkinerja tinggi dengan **biaya bandwidth egress Rp 0 (Zero Egress)**.

### Langkah-langkah:
1. Login ke [Cloudflare Dashboard](https://dash.cloudflare.com/) -> **R2 Object Storage**.
2. Klik **Create Bucket**: Beri nama bucket, contoh: `matapanda-images`.
3. Buat API Token:
   - Klik **Manage R2 API Tokens** -> **Create API Token**.
   - Berikan izin: **Object Read & Write**.
   - Salin:
     - **Account ID** (ada di sidebar kanan dashboard R2)
     - **Access Key ID**
     - **Secret Access Key**
4. Aktifkan Public Access:
   - Di halaman setting bucket, klik **Connect Domain** (custom domain Anda seperti `assets.domain-anda.com`) atau aktifkan **R2.dev subdomain**.
5. **Konfigurasi di `.env` Production**:
   ```env
   R2_ACCOUNT_ID="account-id-cloudflare"
   R2_ACCESS_KEY_ID="access-key-id"
   R2_SECRET_ACCESS_KEY="secret-access-key"
   R2_BUCKET_NAME="matapanda-images"
   R2_PUBLIC_URL="https://assets.domain-anda.com"
   ```

---

## 7. Integrasi Email Transaksional (SMTP)

Digunakan untuk mengirimkan resi invoice, konfirmasi pesanan, dan notifikasi kontak masuk ke pelanggan.

### Rekomendasi 1: Google Workspace / Gmail
1. Aktifkan **2-Step Verification** pada akun Google toko.
2. Buat **App Password** di [Google Account Security](https://myaccount.google.com/apppasswords).
3. Masukkan nama aplikasi `E-Commerce Store` dan salin 16-karakter password yang diberikan.
4. **Konfigurasi di `.env` Production**:
   ```env
   SMTP_HOST="smtp.gmail.com"
   SMTP_PORT="465"
   SMTP_SECURE="true"
   SMTP_USER="toko@gmail.com"
   SMTP_PASSWORD="xxxx xxxx xxxx xxxx"
   SMTP_FROM="it'smatapanda <toko@gmail.com>"
   ```

### Rekomendasi 2: Brevo / Resend / Amazon SES
Gunakan host dan port yang sesuai (misal port 587 dengan secure false) sesuai provider email pilihan Anda.

---

## 8. Database PostgreSQL Production

Project ini menggunakan Prisma ORM dengan PostgreSQL.

### Pilihan Managed PostgreSQL Terbaik:
1. **Supabase** (Free / Pro tier, performa sangat cepat).
2. **Neon.tech** (Serverless PostgreSQL).
3. **Railway / Render / AWS RDS**.

### Langkah Menyiapkan Database di Production:
1. Buat database baru di provider pilihan Anda.
2. Salin connection string PostgreSQL (gunakan connection pooling `pgbouncer` jika di serverless, atau direct string jika di VPS).
3. Jalankan migrasi Prisma dan seed data awal:
   ```bash
   npx prisma migrate deploy
   # Jika pertama kali dan ingin mengisi kategori & data default:
   npm run seed
   ```

---

## 9. Checklist Environment Variables (.env)

Berikut template lengkap file `.env` untuk server production:

```env
# DATABASE
DATABASE_URL="postgresql://user:password@db-host:5432/dbname?sslmode=require"

# NEXTAUTH & DOMAIN
NEXTAUTH_URL="https://domain-anda.com"
NEXTAUTH_SECRET="hasil-dari-generate-keys"
ADMIN_DEFAULT_EMAIL="admin@domain-anda.com"
ADMIN_DEFAULT_PASSWORD="PasswordKuatSuperAdmin123!"

# STORAGE (CLOUDFLARE R2)
R2_ACCOUNT_ID="cloudflare-account-id"
R2_ACCESS_KEY_ID="r2-access-key-id"
R2_SECRET_ACCESS_KEY="r2-secret-access-key"
R2_BUCKET_NAME="nama-bucket-anda"
R2_PUBLIC_URL="https://assets.domain-anda.com"

# LOGISTIK (RAJAONGKIR)
RAJAONGKIR_API_KEY="api-key-rajaongkir"
RAJAONGKIR_ORIGIN_CITY_ID="153"

# PAYMENT GATEWAY (MIDTRANS)
MIDTRANS_IS_PRODUCTION="true"
MIDTRANS_MERCHANT_ID="Gxxxxxxxxx"
MIDTRANS_SERVER_KEY="Mid-server-xxxxxxxxxxxxxx"
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY="Mid-client-xxxxxxxxxxxxxx"

# SHOPEE OPEN PLATFORM
SHOPEE_PARTNER_ID="1234567"
SHOPEE_PARTNER_KEY="shpkxxxxxxxxxxxxxxxxxxxxxxx"
SHOPEE_REDIRECT_URI="https://domain-anda.com/api/integrations/shopee/callback"
SHOPEE_SANDBOX="false"

# TIKTOK SHOP PARTNER CENTER (TOKOPEDIA)
TIKTOK_SHOP_APP_KEY="xxxxxxxx"
TIKTOK_SHOP_APP_SECRET="xxxxxxxx"
TIKTOK_SHOP_SERVICE_ID="xxxxxxxx"
TIKTOK_SHOP_REDIRECT_URI="https://domain-anda.com/api/integrations/tiktokshop/callback"

# KEAMANAN & AUTOMATION
MARKETPLACE_ENCRYPTION_KEY="hasil-dari-generate-keys"
CRON_SECRET="hasil-dari-generate-keys"

# EMAIL NOTIFIKASI
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="465"
SMTP_SECURE="true"
SMTP_USER="toko@domain-anda.com"
SMTP_PASSWORD="app-password-16-karakter"
SMTP_FROM="it'smatapanda <toko@domain-anda.com>"
```

---

## 10. Langkah Deployment Production (VPS / Vercel)

### Opsi A: Deployment ke Vercel
1. Hubungkan repository GitHub ke [Vercel](https://vercel.com).
2. Di halaman **Environment Variables**, paste semua variabel dari checklist di atas.
3. Build Command: `prisma generate && next build`
4. Deploy!

### Opsi B: Deployment ke VPS Ubuntu (Nginx + PM2)
1. **Clone project dan install dependencies**:
   ```bash
   git clone <repo-url>
   cd web-doc
   npm install --production=false
   ```
2. **Siapkan file .env dan jalankan audit**:
   ```bash
   nano .env
   npm run validate:env
   ```
3. **Build aplikasi**:
   ```bash
   npx prisma generate
   npx prisma migrate deploy
   npm run build
   ```
4. **Jalankan dengan PM2**:
   ```bash
   pm2 start npm --name "matapanda-web" -- start
   pm2 save
   pm2 startup
   ```
5. **Konfigurasi Otomatisasi Refresh Token (Cron Job)**:
   Agar token marketplace otomatis ter-refresh sebelum kadaluarsa, tambahkan cronjob di server:
   ```bash
   crontab -e
   ```
   Tambahkan baris berikut (dijalankan setiap 6 jam):
   ```cron
   0 */6 * * * curl -X POST https://domain-anda.com/api/integrations/refresh-tokens -H "Authorization: Bearer CRON_SECRET_ANDA" > /dev/null 2>&1
   ```
