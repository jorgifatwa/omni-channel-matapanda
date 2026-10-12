# it's matapanda E-Commerce & Executive Admin Console

Platform e-commerce fashion streetwear modern untuk brand **it's matapanda**, dibangun menggunakan **Next.js 14 (App Router)**, **TypeScript**, **PostgreSQL + Prisma ORM**, **Cloudflare R2 Object Storage**, **Midtrans Payment Gateway**, sistem pengiriman domestik (**RajaOngkir / JNE**) & internasional (**DHL Express**), serta notifikasi email transaksi otomatis via **Nodemailer (SMTP)**.

---

## 🚀 Ringkasan Fitur Utama

### 🛍️ 1. Storefront Pelanggan & Akun Customer
- **Header & Navigasi**: Brand dropdown, Category/Subcategory megamenu, Cart Drawer, multi-currency switcher (`IDR`, `USD`, `SGD`, `JPY`), dan menu interaktif Akun.
- **Autentikasi Customer Ringkas**:
  - Pendaftaran minimalis (`/account/register`): Hanya Nama Lengkap, Email / No. HP, dan Password (dengan auto-login instan).
  - Login Customer (`/account/login`): Email / No. HP + Password.
  - Dropdown Profil di Navbar dengan status login, riwayat belanja, dan opsi logout.
- **3 Cara Pelacakan Pesanan yang Fleksibel**:
  1. **Lacak Instan di Halaman Selesai Belanja (`/checkout/finish`)**: Langsung melihat ringkasan status pembayaran Lunas, kurir, nomor resi, dan tombol 1-klik lacak paket.
  2. **Dashboard Akun Customer (`/account/orders`)**: Seluruh riwayat pesanan otomatis tertaut ke email customer. Klik pesanan untuk melihat detail tracking 5 tahapan visual progres.
  3. **Lacak Pesanan Publik / Cek Resi Cepat Tanpa Login (`/tracking`)**: Pembeli yang checkout sebagai *Guest* cukup memasukkan Nomor Order ID atau Nomor Resi untuk melacak status paket secara live.
- **Halaman Detail Tracking Visual (`/account/orders/[id]` & `/tracking`)**:
  - Progres Bar 5 Tahapan: *Pesanan Dibuat $\rightarrow$ Pembayaran Lunas $\rightarrow$ Sedang Dikemas $\rightarrow$ Dalam Pengiriman $\rightarrow$ Pesanan Selesai*.
  - Riwayat Checkpoint Kurir Real-Time (JNE / DHL), tombol salin resi (1-Click Copy), dan rincian belanja lengkap.
- **Email Konfirmasi & Invoice Otomatis**: Email bukti pembayaran elegan dikirimkan langsung ke inbox pembeli begitu pembayaran Midtrans terverifikasi.

### 🛡️ 2. Admin Console & Analytics Dashboard
- **Autentikasi Aman**: Login Admin berbasis **NextAuth.js** (JWT session) dengan proteksi middleware pada seluruh route `/admin/*`.
- **Analitik Multi-Mode (3 View Modes)**:
  - **Mode Harian (`daily`)**: Preset Hari Ini, 7 Hari Terakhir, 30 Hari Terakhir, dan Kustom Tanggal (Date Picker).
  - **Mode Bulanan (`monthly`)**: Selector Tahun (2024, 2025, 2026) dengan grafik 12 bulan (Jan–Des).
  - **Mode Tahunan (`yearly`)**: Analisis perbandingan tahun-ke-tahun.
- **Export Laporan PDF**: Unduh laporan penjualan A4 profesional dalam satu klik (ringkasan KPI, tabel breakdown periode, top 5 produk terlaris, dan sampel order) menggunakan `jspdf` & `jspdf-autotable`.
- **Grafik Recharts Adaptif**: Beralih antara Bar & Line chart dengan dukungan Dark/Light mode.
- **Master Data Management**:
  - **Produk & Varian**: Manajemen stok, SKU, harga coret, batas stok menipis (*low-stock threshold*), dan upload gambar.
  - **Brand & Kategori**: CRUD dengan auto-slug generator.
  - **Order & Transaksi**: Pemantauan status bayar Midtrans, input resi, dan riwayat pelacakan kurir.
  - **Pelanggan**: Riwayat transaksi dan total belanja customer.

---

## 📦 Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router, Server & Client Components)
- **Language**: TypeScript
- **Styling**: Tailwind CSS, Shadcn UI primitives, Lucide Icons
- **Database & ORM**: PostgreSQL & Prisma ORM
- **Object Storage**: [Cloudflare R2](https://www.cloudflare.com/developer-platform/r2/) (S3-Compatible, **Zero-Egress Fees / Bebas Biaya Bandwidth**)
- **Payment Gateway**: [Midtrans](https://midtrans.com/) (Snap API & Webhook Notification)
- **Domestic Shipping**: [RajaOngkir Starter API](https://rajaongkir.com/) (JNE Express Real-Time Cost Calculation)
- **International Shipping**: DHL Express Worldwide API
- **Transactional Email**: [Nodemailer](https://nodemailer.com/) (SMTP Gmail / Custom SMTP, **100% Gratis**)
- **Reporting**: jsPDF & jsPDF-AutoTable
- **Charts**: Recharts

---

## ⚙️ 1. Environment Setup

Salin template file `.env.example` ke `.env`:

```bash
cp .env.example .env
```

### Konfigurasi Variabel Lingkungan (`.env`)

```env
# ==========================================
# DATABASE (PostgreSQL + Prisma)
# ==========================================
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/matapanda_db?schema=public"

# ==========================================
# NEXTAUTH CONFIGURATION
# ==========================================
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="matapanda-super-secret-jwt-key-change-in-production-2026"
ADMIN_DEFAULT_EMAIL="jorgifatwaambia@gmail.com"
ADMIN_DEFAULT_PASSWORD="admin123"

# ==========================================
# CLOUDFLARE R2 (Primary Image Storage - S3 Compatible, Zero Egress)
# ==========================================
R2_ACCOUNT_ID="your-cloudflare-account-id"
R2_ACCESS_KEY_ID="your-r2-access-key-id"
R2_SECRET_ACCESS_KEY="your-r2-secret-access-key"
R2_BUCKET_NAME="matapanda-images"
R2_PUBLIC_URL="https://pub-your-bucket-id.r2.dev"

# ==========================================
# RAJAONGKIR (Domestic Indonesia Shipping - JNE Real-Time)
# ==========================================
RAJAONGKIR_API_KEY="your-rajaongkir-api-key"
RAJAONGKIR_ORIGIN_CITY_ID="153" # 153 = Jakarta Selatan (it's matapanda Origin)

# ==========================================
# MIDTRANS PAYMENT GATEWAY (Sandbox / Production)
# ==========================================
MIDTRANS_IS_PRODUCTION="false"
MIDTRANS_MERCHANT_ID="M911212405"
MIDTRANS_SERVER_KEY="Mid-server-xxxxxxxxxxxxxxxxxxxxxxxx"
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY="Mid-client-xxxxxxxxxxxxxxxx"

# ==========================================
# SHIPPING GATEWAY (JNE & DHL)
# ==========================================
JNE_API_BASE_URL="https://apiv2.jne.co.id:10205"
JNE_USERNAME="MATAPANDAJCKT"
JNE_API_KEY="demo-jne-key"
JNE_ORIGIN_CODE="CGK10000"
DHL_API_BASE_URL="https://express.api.dhl.com/mydhlapi/test"
DHL_API_KEY="demo-dhl-key"
DHL_API_SECRET="demo-dhl-secret"
DHL_ACCOUNT_NUMBER="123456789"

# ==========================================
# EMAIL NOTIFICATIONS (Nodemailer SMTP / Gmail)
# ==========================================
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="465"
SMTP_SECURE="true"
SMTP_USER="toko.matapanda@gmail.com"
SMTP_PASSWORD="xxxx xxxx xxxx xxxx" # 16-digit Google App Password
SMTP_FROM="it's matapanda Jakarta <orders@itsmatapanda.com>"
```

---

## 📧 2. Panduan Setup Email Otomatis (Nodemailer + Gmail SMTP Gratis)

Sistem it's matapanda menggunakan **Nodemailer** yang terhubung dengan **Gmail SMTP**. Anda tidak perlu membayar layanan pihak ketiga apa pun (100% Gratis hingga 500–2.000 email per hari).

### Langkah Mendapatkan Google App Password (2 Menit):
1. Buka akun Google / Gmail toko Anda di [myaccount.google.com](https://myaccount.google.com/).
2. Masuk ke menu **Keamanan (Security)**.
3. Pastikan **Verifikasi 2 Langkah (2-Step Verification)** sudah aktif.
4. Pada kotak pencarian di bagian atas, ketik **"Sandi Aplikasi"** atau **"App Passwords"** (atau buka [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)).
5. Masukkan nama aplikasi, contoh: `it's matapanda Storefront`, lalu klik **Buat (Create)**.
6. Google akan memberikan **16 digit kode sandi aplikasi** (contoh: `abcd efgh ijkl mnop`).
7. Masukkan email dan 16 digit kode tersebut ke file `.env`:
   ```env
   SMTP_HOST="smtp.gmail.com"
   SMTP_PORT="465"
   SMTP_SECURE="true"
   SMTP_USER="email.toko.anda@gmail.com"
   SMTP_PASSWORD="abcdefghijklmnop" # 16 karakter tanpa spasi
   SMTP_FROM="it's matapanda Jakarta <orders@itsmatapanda.com>"
   ```
8. **Selesai!** Setiap kali customer menyelesaikan pembayaran Midtrans (Settlement), email invoice dan link tracking pesanan akan otomatis terkirim ke email pembeli.

*(Catatan: Jika variabel `SMTP_USER` / `SMTP_PASSWORD` belum diisi saat proses development lokal, sistem akan menjalankan simulasi pengiriman yang aman tanpa menyebabkan error pada alur checkout).*

---

## 🗄️ 3. Database Setup & Seeding (Prisma)

Pastikan container PostgreSQL berjalan (contoh port 5432):

```bash
docker run --name matapanda-postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=matapanda_db -p 5432:5432 -d postgres:16-alpine
```

Jalankan sinkronisasi skema dan seeder:

```bash
# 1. Sinkronisasi Skema Database
npx prisma db push

# 2. Generate Prisma Client
npx prisma generate

# 3. Seed Data (Admin, Brand, Kategori, Produk, Varian, dan 150+ Order)
npm run seed
```

---

## 🌐 4. Menjalankan Server Development

```bash
npm run dev
```

Buka browser di:
- **Storefront Customer**: [http://localhost:3000](http://localhost:3000)
- **Pelacakan Pesanan Cepat**: [http://localhost:3000/tracking](http://localhost:3000/tracking)
- **Portal Customer Login**: [http://localhost:3000/account/login](http://localhost:3000/account/login)
- **Admin Panel Dashboard**: [http://localhost:3000/admin/dashboard](http://localhost:3000/admin/dashboard)
- **Admin Login**: [http://localhost:3000/admin/login](http://localhost:3000/admin/login)

### Kredensial Akun Default:
- **Admin**: `jorgifatwaambia@gmail.com` / `admin123`
- **Customer Demo**: `customer@itsmatapanda.com` / `customer123`

---

## 🚚 5. Panduan Integrasi RajaOngkir (Cek Ongkir JNE Gratis)

it's matapanda menggunakan **RajaOngkir Starter API (100% Gratis)** untuk menghitung tarif pengiriman JNE ke seluruh kota & kabupaten di Indonesia secara real-time.

1. Buka [rajaongkir.com](https://rajaongkir.com) &rarr; Daftar akun gratis (*Starter Plan*).
2. Buka menu **Panel Pengguna > API Key**.
3. Salin API Key Anda ke `.env`:
   ```env
   RAJAONGKIR_API_KEY="salin_api_key_rajaongkir_anda"
   RAJAONGKIR_ORIGIN_CITY_ID="153" # 153 = Jakarta Selatan (Origin it's matapanda)
   ```

---

## ☁️ 6. Panduan Cloudflare R2 (Image Storage)

1. Buka [Cloudflare Dashboard](https://dash.cloudflare.com) &rarr; **R2 Object Storage**.
2. Buat bucket baru `matapanda-images`.
3. Aktifkan **R2.dev subdomain** atau Custom Domain, lalu masukkan ke `R2_PUBLIC_URL`.
4. Buat **API Token** dengan izin *Object Read & Write*, salin kredensial ke `.env`.

---

## 📁 7. Struktur Direktori Project

```
web-doc/
├── app/
│   ├── (admin)/ or admin/
│   │   ├── (panel)/                  # Admin Layout & Dashboard Shell
│   │   │   ├── dashboard/page.tsx    # Analitik 3 Mode, Recharts, & Export PDF
│   │   │   ├── products/page.tsx     # Master Produk & Varian
│   │   │   ├── brands/page.tsx       # Master Brand & Logo
│   │   │   ├── categories/page.tsx   # Master Kategori
│   │   │   ├── orders/page.tsx       # DataTable Transaksi Masuk
│   │   │   ├── customers/page.tsx    # Manajemen Pelanggan
│   │   │   ├── inquiries/page.tsx    # Pesan Masuk Form Kontak
│   │   │   ├── integrations/
│   │   │   │   ├── page.tsx          # Manajemen Integrasi Marketplace (Shopee & Tokopedia)
│   │   │   │   └── products/page.tsx # Pemetaan Produk, Auto-Match SKU, & Sync Stok Shopee
│   │   │   └── login/page.tsx        # Admin Login Form (NextAuth)
│   ├── account/
│   │   ├── login/page.tsx            # Customer Login Minimalis
│   │   ├── register/page.tsx         # Customer Register Minimalis (Auto-login)
│   │   ├── orders/page.tsx           # List Pesanan Customer
│   │   ├── orders/[id]/page.tsx      # Detail Pesanan & 5 Step Visual Tracking
│   │   └── page.tsx                  # Customer Profile Overview
│   ├── tracking/page.tsx             # Public Guest Order Tracking Lookup
│   ├── api/
│   │   ├── auth/register/route.ts    # Endpoint Registrasi Customer Baru
│   │   ├── account/orders/route.ts   # Endpoint Ambil List Pesanan Customer
│   │   ├── tracking/lookup/route.ts  # Endpoint Cek Status Resi Publik
│   │   ├── payment/send-receipt/     # Endpoint Kirim Invoice Email Nodemailer
│   │   ├── payment/webhook/          # Midtrans Webhook (Auto Email on Settlement)
│   │   ├── shipping/cost/            # Kalkulator Ongkir RajaOngkir (JNE) & DHL
│   │   └── integrations/             # Marketplace OAuth & Token Management
│   │       ├── shopee/connect/       # Redirect ke Shopee Consent Page (HMAC-SHA256)
│   │       ├── shopee/callback/      # Tukar Auth Code Shopee -> Simpan Token Terenkripsi
│   │       ├── tiktokshop/connect/   # Redirect ke TikTok Shop Partner Center Consent
│   │       ├── tiktokshop/callback/  # Tukar Auth Code TikTok -> Simpan Token Terenkripsi
│   │       ├── status/               # Status Akun Terhubung & Disconnect
│   │       ├── refresh-tokens/       # Auto-refresh Token Expired (< 60 mnt) via Cron
│   │       └── products/             # Manajemen Pemetaan Produk & Stok
│   │           ├── mappings/         # Ambil Daftar Produk & Status Mapping
│   │           ├── map/              # Simpan / Hapus Pemetaan Manual
│   │           ├── auto-match/       # Otomatis Mencocokkan Produk via SKU
│   │           └── sync-stock/       # Update Stok ke Shopee (v2.product.update_stock)
│   ├── checkout/page.tsx             # Checkout Form (Guest & Auto-Fill Member)
│   ├── checkout/finish/page.tsx      # Halaman Sukses Bayar + Auto Kirim Email
│   └── page.tsx                      # Customer Homepage
├── lib/
│   ├── mail.ts                       # Nodemailer Service & Template Email Invoice HTML
│   ├── auth.ts                       # NextAuth Provider (Customer & Admin Credentials)
│   ├── marketplace-crypto.ts         # AES-256-GCM Token Encryption / Decryption Helper
│   ├── marketplace-store.ts          # Resilient Storage Helper (Prisma DB + JSON Fallback)
│   ├── shopee-oauth.ts               # Shopee Open Platform V2 OAuth Helper (Sign & Refresh)
│   ├── shopee-products.ts            # Shopee Products & Stock Sync API Helper
│   ├── tiktokshop-oauth.ts           # TikTok Shop / Tokopedia OAuth Helper
│   ├── rajaongkir.ts                 # Helper RajaOngkir Starter
│   ├── r2.ts                         # Cloudflare R2 Upload Helper
│   └── prisma.ts                     # Prisma Singleton Instance
├── components/
│   ├── Navbar.tsx                    # Header Megamenu, Cart & User Account Dropdown
│   ├── admin/AdminLayoutShell.tsx    # Admin Sidebar & Topbar Shell
│   └── providers/                    # AuthProvider (SessionProvider)
├── middleware.ts                     # Proteksi Route /admin/* dan /account/*
└── package.json
```

---

## 🔌 8. Panduan Integrasi Marketplace (Shopee & Tokopedia / TikTok Shop)

it's matapanda dilengkapi modul integrasi marketplace di halaman Admin **`/admin/integrations`**. Tahap awal ini menyiapkan **koneksi autentikasi OAuth 2.0 & manajemen token terenkripsi AES-256-GCM** sebelum masuk ke fase sinkronisasi stok dan pesanan.

---

### A. Shopee Open Platform

Shopee menggunakan protokol **OAuth 2.0 dengan otorisasi HMAC-SHA256 signature**.

#### 1. Pendaftaran Developer / Partner Shopee:
1. Kunjungi [Shopee Open Platform Console](https://open.shopee.com/).
2. Buat akun developer dan pilih tipe: **Third-party Partner Platform (ISV)**.
3. Siapkan dokumen profil badan usaha resmi (CV / PT) serta bukti sistem e-commerce aktif (demo app / trial account).
4. Ajukan permohonan lisensi developer (proses review manual Shopee memerlukan waktu sekitar **10 hari kerja**).
5. Setelah disetujui, buka menu **Console > App Management > App List** untuk mendapatkan:
   - **`Partner ID`** (contoh: `2005432`)
   - **`Partner Key`** (secret key HMAC-SHA256)
6. Masukkan **Redirect URL** di dashboard Shopee:
   - Development: `http://localhost:3000/api/integrations/shopee/callback`
   - Production: `https://domain-anda.com/api/integrations/shopee/callback`

#### 2. Konfigurasi Sandbox Shopee:
- Shopee menyediakan **Sandbox V2** di: `https://openplatform.sandbox.test-stable.shopee.sg/`.
- Di `.env`, atur:
  ```env
  SHOPEE_PARTNER_ID="your_sandbox_partner_id"
  SHOPEE_PARTNER_KEY="your_sandbox_partner_key"
  SHOPEE_REDIRECT_URI="http://localhost:3000/api/integrations/shopee/callback"
  SHOPEE_SANDBOX="true"
  ```

---

### B. Tokopedia & TikTok Shop Partner Center

> 📌 **Catatan Penting Pasca-Merger:** Seluruh integrasi developer pihak ketiga (third-party) Tokopedia saat ini telah **dipusatkan di bawah TikTok Shop Partner Center (TTSPC)** di [partner.tiktokshop.com](https://partner.tiktokshop.com). Anda tidak perlu mendaftar akun Tokopedia Developer lawas yang terpisah.

#### 1. Pendaftaran Developer di TikTok Shop Partner Center:
1. Buka [TikTok Shop Partner Center](https://partner.tiktokshop.com/).
2. Pilih tipe akun: **App Developer (ISV)** untuk integrasi custom / omnichannel multi-toko.
3. Masuk ke menu **App & Service > Create App**.
4. Catat kredensial aplikasi:
   - **`App Key`**
   - **`App Secret`**
5. Daftarkan **Redirect URL** pada setting aplikasi:
   - Development: `http://localhost:3000/api/integrations/tiktokshop/callback`
   - Production: `https://domain-anda.com/api/integrations/tiktokshop/callback`

#### 2. Testing Sandbox via Development Shop:
- Di dashboard Partner Center, buka **Development Kits > Development Shops**.
- Anda dapat membuat **Core Function Development Shop** secara instan **tanpa memerlukan dokumen legalitas/KYC bisnis**, sehingga pengujian integrasi dapat langsung dilakukan.
- Atur pada `.env`:
  ```env
  TIKTOK_SHOP_APP_KEY="your_app_key"
  TIKTOK_SHOP_APP_SECRET="your_app_secret"
  TIKTOK_SHOP_REDIRECT_URI="http://localhost:3000/api/integrations/tiktokshop/callback"
  ```

---

### C. Alur Kerja OAuth di Aplikasi it's matapanda

```
[Admin Klik "Hubungkan"]
         │
         ▼
GET /api/integrations/[platform]/connect
  ├── Validasi Sesi Admin (NextAuth)
  ├── Bangun Authorize URL + Signature (HMAC-SHA256 untuk Shopee)
  └── Redirect browser ke Consent Page Marketplace
         │
         ▼
[Admin Login & Berikan Izin di Shopee / TikTok Shop]
         │
         ▼
Marketplace Redirect ke Callback Aplikasi:
GET /api/integrations/[platform]/callback?code=...
  ├── Pertukaran Authorize Code ➔ Access Token & Refresh Token
  ├── Ambil Informasi Nama Toko (Shop Info)
  ├── Enkripsi Token menggunakan AES-256-GCM (lib/marketplace-crypto.ts)
  └── Upsert ke Database: Model Prisma `MarketplaceAccount`
         │
         ▼
Redirect Kembali ke /admin/integrations (Status: "Terhubung — [Nama Toko]")
```

---

### D. Keamanan Enkripsi Token & Auto-Refresh

1. **Enkripsi Kredensial AES-256-GCM**:
   - `accessToken` dan `refreshToken` **TIDAK PERNAH** disimpan dalam bentuk plain-text di database.
   - Disimpan dengan format `iv:authTag:ciphertext` dalam representasi hexadesimal.
   - Kunci enkripsi 32-byte (64 karakter hex) dikelola via `MARKETPLACE_ENCRYPTION_KEY` di file `.env`.

2. **Endpoint Auto-Refresh Token**:
   - Token Shopee memiliki masa berlaku 4 jam.
   - Panggil endpoint `POST /api/integrations/refresh-tokens` secara berkala (misal via Cron Job setiap 30 menit).
   - Lindungi endpoint dengan header `Authorization: Bearer <CRON_SECRET>`:
     ```bash
     curl -X POST http://localhost:3000/api/integrations/refresh-tokens \
       -H "Authorization: Bearer matapanda-cron-secret-dev-2026"
     ```
   - Sistem secara otomatis mencari semua akun aktif yang tokennya kedaluwarsa dalam 60 menit ke depan, melakukan refresh ke API marketplace, mengenkripsi token baru, dan memperbarui tanggal kedaluwarsa di database.

---

### E. Pemetaan Produk & Sinkronisasi Stok (Omnichannel)

Fitur pemetaan produk dan sinkronisasi stok menghubungkan katalog website it's matapanda (Product & ProductVariant) dengan etalase Shopee (`v2.product.get_item_list`, `v2.product.get_item_base_info`, `v2.product.get_model_list`, dan `v2.product.update_stock`).

#### 1. Arsitektur Pemetaan & Penyimpanan
- **Model Database**: `MarketplaceProductMap` di Prisma mengaitkan `productId` dan `variantId` (opsional jika memiliki variasi ukuran/warna) ke `marketplaceItemId` dan `marketplaceModelId`.
- **Resilient Fallback**: Sistem dilengkapi penyimpanan ganda otomatis. Jika PostgreSQL lokal belum berjalan, pemetaan otomatis disimpan ke `data/marketplace-product-mappings.json` tanpa merusak flow admin.

#### 2. Fitur di Dashboard Admin (`/admin/integrations/products`):
1. **Auto-Match Berdasarkan SKU**:
   - Sistem membandingkan SKU varian website dengan `item_sku` / `model_sku` Shopee.
   - Sekali klik **"⚡ Auto-Match SKU"**, semua produk dengan SKU identik langsung terhubung.
2. **Pemetaan Manual (Modal Dialog)**:
   - Tombol **"Hubungkan"** membuka modal interaktif yang menampilkan daftar produk & variasi Shopee secara live.
   - Admin dapat memilih produk Shopee mana yang sesuai dengan varian website.
3. **Sinkronisasi Stok Real-Time (`v2.product.update_stock`)**:
   - Tombol **"🔄 Sync Stok ke Shopee"** mendorong kuantitas stok fisik website ke Shopee Open API.
   - Mendukung produk tunggal (`item_id`) maupun produk bervariasi (`model_id`).
4. **Indikator Status & KPI Card**:
   - Total Varian Website, Produk Shopee, Sudah Terpetakan, dan Belum Terpetakan.
   - Badge status: `Terhubung & Stok Sinkron`, `Perlu Sinkronisasi`, atau `Belum Terhubung`.

#### 3. Endpoint API Produk & Pemetaan:
- `GET /api/integrations/products/mappings`: Mengambil daftar varian website, produk Shopee, dan status relasi.
- `POST /api/integrations/products/map`: Menyimpan pemetaan produk/varian manual.
- `DELETE /api/integrations/products/map?id=[mappingId]`: Memutuskan relasi pemetaan.
- `POST /api/integrations/products/auto-match`: Mencocokkan seluruh SKU secara otomatis.
- `POST /api/integrations/products/sync-stock`: Mengirimkan update stok website ke Shopee.

---

## 🧪 10. Automated End-to-End Testing (Playwright)

Untuk memastikan seluruh alur belanja pelanggan dan operasional admin berjalan sempurna tanpa regresi, proyek ini dilengkapi suite pengujian otomatis berbasis **Playwright**:

### Menjalankan Testing

```bash
# Menjalankan seluruh test suite secara otomatis di background (headless mode)
npm run test:e2e

# Menjalankan test suite dengan antarmuka visual interaktif (UI mode)
npm run test:e2e:ui
```

> **Catatan:** File `playwright.config.ts` sudah dikonfigurasi dengan `webServer` bawaan (`reuseExistingServer: true`), sehingga server Next.js (`npm run dev`) akan otomatis dijalankan jika belum aktif.

### Cakupan Test Suite (`e2e/`):
1. **`homepage.spec.ts`**: Verifikasi Announcement Bar ticker, Navbar, Hero Banner carousel, 3 Section Banner Berwarna (New In, it's matapanda Bags, Your Favourites), Community Grid ("it's matapanda ON YOU"), Newsletter block, dan Footer 4-kolom.
2. **`navigation.spec.ts`**: Verifikasi navigasi ke `/new-arrivals`, `/brands/[slug]`, `/categories/[slug]`, serta drawer menu layar penuh di perangkat mobile.
3. **`product-card-and-quickadd.spec.ts`**: Verifikasi Add to Bag langsung untuk produk non-varian, modal Quick-Add ("Select Option") untuk produk bervarian, serta validasi tombol ukuran habis stok (*disabled / strikethrough*).
4. **`product-detail.spec.ts`**: Verifikasi galeri foto produk, pembesar kursor (*magnifier*), swatch grup warna, pemilihan ukuran, tab Product Details & Shipping, serta section "You May Also Like" dan "Recently Viewed".
5. **`cart-and-checkout.spec.ts`**: Verifikasi cart drawer, perubahan kuantitas (+/-), pengisian data checkout, hingga penerbitan token transaksi Midtrans via `/api/payment/create-transaction`.
6. **`admin-login.spec.ts`**: Verifikasi autentikasi login administrator dan redirect ke dashboard.
7. **`admin-product-crud.spec.ts`**: Verifikasi penambahan produk baru dengan varian (size, warna, colorGroup, colorHex, SKU, stok), pengeditan produk, dan penghapusan otomatis (*cleanup*).

---

## 📜 11. Lisensi

Hak Cipta &copy; 2026 it's matapanda Jakarta. Seluruh hak cipta dilindungi undang-undang.

