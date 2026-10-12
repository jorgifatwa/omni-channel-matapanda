export interface FaqItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  sortOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const FAQ_CATEGORIES = [
  "Most Asked",
  "Delivery",
  "Orders",
  "Returns",
  "Product & Care",
  "The Panda Club",
  "Promotions & Payments",
  "Store & Contact",
] as const;

export type FaqCategory = (typeof FAQ_CATEGORIES)[number];

export const INITIAL_FAQS: FaqItem[] = [
  // ─── Most Asked ──────────────────────────────────────────────────────────
  {
    id: "faq-most-1",
    category: "Most Asked",
    question: "Apa saja koleksi tas andalan it'smatapanda?",
    answer:
      "Koleksi tas it'smatapanda berfokus pada desain fungsional dan minimalis berjiwa urban. Produk terpopuler kami meliputi Dumpling Bags (Micro, XS, M, XL) dengan material water-resistant nylon, Puffer Shoulder Bags, Canvas Everyday Carryall, Crescent Sling Crossbody, dan City Explorer Backpacks.",
    sortOrder: 1,
    isActive: true,
  },
  {
    id: "faq-most-2",
    category: "Most Asked",
    question: "Apakah tas it'smatapanda tahan air (water-resistant)?",
    answer:
      "Sebagian besar koleksi tas kami—terutama Dumpling Series, Puffer Bags, dan Utility Pouches—menggunakan material Crinkle Nylon berkualitas tinggi dengan lapisan DWR (Durable Water Repellent) yang tahan terhadap percikan air hujan ringan dan tumpahan cairan sehari-hari.",
    sortOrder: 2,
    isActive: true,
  },
  {
    id: "faq-most-3",
    category: "Most Asked",
    question: "Berapa lama estimasi pengiriman pesanan saya?",
    answer:
      "Pesanan diproses dalam 1-2 hari kerja (Senin - Jumat). Estimasi pengiriman reguler (JNE / SiCepat / Anteraja) untuk wilayah Jabodetabek berkisar 1-3 hari kerja, sedangkan untuk kota lain di seluruh Indonesia berkisar 2-5 hari kerja tergantung lokasi pengiriman.",
    sortOrder: 3,
    isActive: true,
  },
  {
    id: "faq-most-4",
    category: "Most Asked",
    question: "Apakah bisa melakukan penukaran barang jika ukuran atau warna tidak sesuai?",
    answer:
      "Ya, kami menerima penukaran ukuran atau warna dalam waktu 7 (tujuh) hari kalender sejak pesanan diterima. Syaratnya adalah produk belum pernah dipakai, hangtag masih terpasang rapi, dan dustbag serta invoice asli disertakan.",
    sortOrder: 4,
    isActive: true,
  },

  // ─── Delivery ────────────────────────────────────────────────────────────
  {
    id: "faq-del-1",
    category: "Delivery",
    question: "Kurir pengiriman apa saja yang digunakan?",
    answer:
      "Kami bermitra dengan kurir terpercaya seperti JNE (REG, YES, OKE), SiCepat, Anteraja, dan layanan Instant/Same-Day (GrabExpress & GoSend) untuk area Jabodetabek. Anda dapat memilih opsi kurir saat checkout.",
    sortOrder: 1,
    isActive: true,
  },
  {
    id: "faq-del-2",
    category: "Delivery",
    question: "Apakah ada promo Gratis Ongkir?",
    answer:
      "Ya! Kami menyediakan promo Gratis Ongkir (Free Shipping) untuk seluruh pesanan dengan nominal minimum belanja tertentu di seluruh Indonesia. Periksa info promo berjalan di banner atas halaman kami.",
    sortOrder: 2,
    isActive: true,
  },
  {
    id: "faq-del-3",
    category: "Delivery",
    question: "Bagaimana cara melacak nomor resi pesanan saya?",
    answer:
      "Setelah pesanan dikirim, nomor resi (tracking number) akan dikirimkan secara otomatis via email dan WhatsApp konfirmasi. Anda juga dapat memeriksa status pelacakan langsung di menu 'Lacak Pesanan (Cek Resi)' pada website kami.",
    sortOrder: 3,
    isActive: true,
  },
  {
    id: "faq-del-4",
    category: "Delivery",
    question: "Apakah it'smatapanda melayani pengiriman internasional?",
    answer:
      "Saat ini kami melayani pengiriman ke negara-negara Asia Tenggara (Singapura, Malaysia, Thailand, Filipina) melalui ekspedisi DHL Express dan EMS. Silakan hubungi layanan pelanggan kami untuk bantuan pesanan internasional.",
    sortOrder: 4,
    isActive: true,
  },

  // ─── Orders ──────────────────────────────────────────────────────────────
  {
    id: "faq-ord-1",
    category: "Orders",
    question: "Bagaimana cara memesan tas di it'smatapanda?",
    answer:
      "Pilih koleksi tas favorit Anda, pilih varian warna & ukuran yang diinginkan, klik 'Add to Bag' / 'Tambah ke Keranjang', lalu lanjutkan ke halaman Checkout. Masukkan detail alamat penerima dan selesaikan pembayaran dengan metode pilihan Anda.",
    sortOrder: 1,
    isActive: true,
  },
  {
    id: "faq-ord-2",
    category: "Orders",
    question: "Bisakah saya mengubah atau membatalkan pesanan setelah pembayaran?",
    answer:
      "Jika pesanan Anda belum memasuki tahap pengemasan/pengiriman oleh tim gudang, Anda dapat segera menghubungi Customer Care kami via WhatsApp untuk perubahan alamat atau varian.",
    sortOrder: 2,
    isActive: true,
  },
  {
    id: "faq-ord-3",
    category: "Orders",
    question: "Apakah saya harus membuat akun untuk berbelanja?",
    answer:
      "Anda dapat berbelanja sebagai Guest (tamu). Namun, kami sangat menyarankan membuat akun untuk menikmati keuntungan The Panda Club, melacak pesanan secara realtime, serta menyimpan riwayat transaksi dan alamat.",
    sortOrder: 3,
    isActive: true,
  },

  // ─── Returns ─────────────────────────────────────────────────────────────
  {
    id: "faq-ret-1",
    category: "Returns",
    question: "Bagaimana syarat dan ketentuan pengembalian barang?",
    answer:
      "Pengembalian atau penukaran dapat diajukan maksimal 7 hari kalender setelah produk diterima. Produk harus dalam kondisi baru (unused, unwashed), bebas noda/bau, dan kelengkapan seperti hangtag, care label, dustbag, dan box harus utuh.",
    sortOrder: 1,
    isActive: true,
  },
  {
    id: "faq-ret-2",
    category: "Returns",
    question: "Siapa yang menanggung biaya ongkos kirim pengembalian?",
    answer:
      "Jika pengembalian disebabkan oleh cacat produksi atau salah pengiriman varian dari pihak kami, seluruh biaya ongkir akan ditanggung penuh oleh it'smatapanda. Untuk penukaran karena perubahan selera pribadi, biaya ongkos kirim ditanggung oleh pembeli.",
    sortOrder: 2,
    isActive: true,
  },
  {
    id: "faq-ret-3",
    category: "Returns",
    question: "Berapa lama proses pengembalian dana (refund)?",
    answer:
      "Setelah barang retur kami terima dan lolos inspeksi Quality Control (1-2 hari kerja), proses pengembalian dana (refund) akan ditransfer kembali dalam 3-5 hari kerja sesuai metode pembayaran awal Anda.",
    sortOrder: 3,
    isActive: true,
  },

  // ─── Product & Care ──────────────────────────────────────────────────────
  {
    id: "faq-prd-1",
    category: "Product & Care",
    question: "Bagaimana cara merawat dan membersihkan tas berbahan Nylon & Puffer?",
    answer:
      "Gunakan kain microfiber lembut yang dibasahi air hangat dan sabun cuci lembut (mild detergent) untuk membersihkan noda pada permukaan tas. Hindari penggunaan mesin cuci, pemutih, atau pengering panas. Keringkan dengan diangin-anginkan di tempat teduh.",
    sortOrder: 1,
    isActive: true,
  },
  {
    id: "faq-prd-2",
    category: "Product & Care",
    question: "Apakah tas it'smatapanda muat untuk laptop / tablet?",
    answer:
      "Untuk laptop hingga 14-16 inch, kami merekomendasikan Dumpling Bag Medium/XL, Everyday Canvas Carryall, atau City Explorer Backpack yang dilengkapi kompartemen busa pelindung khusus. Dumpling Micro & XS cocok untuk esensial sehari-hari (ponsel, dompet, kunci, lipstick, tumbler kecil).",
    sortOrder: 2,
    isActive: true,
  },
  {
    id: "faq-prd-3",
    category: "Product & Care",
    question: "Apakah produk bergaransi?",
    answer:
      "Setiap produk tas it'smatapanda bergaransi kualitas jahitan dan hardware (zipper, buckle, ring logam) selama 30 hari sejak tanggal pembelian.",
    sortOrder: 3,
    isActive: true,
  },

  // ─── The Panda Club ──────────────────────────────────────────────────────
  {
    id: "faq-clb-1",
    category: "The Panda Club",
    question: "Apa itu The Panda Club?",
    answer:
      "The Panda Club adalah program loyalitas eksklusif it'smatapanda. Setiap anggota mendapatkan poin hadiah dari setiap pembelian, voucher ulang tahun, akses prioritas untuk koleksi rilisan terbatas (Early Drop), dan undangan ke acara spesial.",
    sortOrder: 1,
    isActive: true,
  },
  {
    id: "faq-clb-2",
    category: "The Panda Club",
    question: "Bagaimana cara bergabung dengan The Panda Club?",
    answer:
      "Pendaftaran gratis! Cukup buat akun baru di halaman Registrasi kami. Setelah mendaftar, Anda langsung tergabung sebagai member level Explorer dan berhak mendapatkan welcome voucher untuk transaksi pertama.",
    sortOrder: 2,
    isActive: true,
  },

  // ─── Promotions & Payments ───────────────────────────────────────────────
  {
    id: "faq-prm-1",
    category: "Promotions & Payments",
    question: "Metode pembayaran apa saja yang diterima?",
    answer:
      "Kami menerima pembayaran otomatis melalui Midtrans Gateway: QRIS (GoPay, OVO, ShopeePay, Dana), Virtual Account Bank (BCA, Mandiri, BNI, BRI, Permata), Kartu Kredit / Debit (Visa, Mastercard, JCB), serta opsi Cicilan Tanpa Kartu.",
    sortOrder: 1,
    isActive: true,
  },
  {
    id: "faq-prm-2",
    category: "Promotions & Payments",
    question: "Bagaimana cara menggunakan kode kupon atau diskon promo?",
    answer:
      "Pada halaman checkout, masukkan kode voucher pada kolom 'Kode Kupon / Promo' lalu klik tombol 'Gunakan'. Potongan harga akan langsung memotong total pembayaran Anda secara otomatis.",
    sortOrder: 2,
    isActive: true,
  },

  // ─── Store & Contact ─────────────────────────────────────────────────────
  {
    id: "faq-str-1",
    category: "Store & Contact",
    question: "Apakah it'smatapanda memiliki toko fisik (Offline Store)?",
    answer:
      "Saat ini toko fisik dan Pop-up Store kami hadir di lokasi strategis di Jakarta dan Bandung. Anda dapat mencoba langsung seluruh koleksi tas dan berkonsultasi dengan staf kami.",
    sortOrder: 1,
    isActive: true,
  },
  {
    id: "faq-str-2",
    category: "Store & Contact",
    question: "Bagaimana cara menghubungi Customer Service it'smatapanda?",
    answer:
      "Anda dapat menghubungi tim CS kami melalui WhatsApp Official di +62 812-3456-7890 (Senin - Minggu, 09.00 - 21.00 WIB) atau via email ke hello@itsmatapanda.com.",
    sortOrder: 2,
    isActive: true,
  },
];
