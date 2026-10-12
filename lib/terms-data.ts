export interface TermsSection {
  id: string;
  title: string;
  content: string[];
}

export const TERMS_PREAMBLE = {
  lastUpdated: "October 2026",
  companyName: "it'smatapanda Indonesia",
  websiteUrl: "www.itsmatapanda.com",
  intro: [
    "Selamat datang di website resmi it'smatapanda (selanjutnya disebut 'kami', 'website kami', atau 'it'smatapanda'). Dengan mengakses, menjelajah, membuat akun, atau melakukan transaksi di website ini, Anda menyatakan bahwa Anda telah membaca, memahami, dan menyetujui untuk terikat dengan Syarat & Ketentuan Layanan (Terms of Service) serta Kebijakan Privasi kami.",
    "Ketentuan ini berlaku untuk semua pengunjung, pengguna, member The Panda Club, dan pihak lain yang mengakses atau menggunakan layanan kami.",
  ],
};

export const TERMS_SECTIONS: TermsSection[] = [
  {
    id: "visitor-information",
    title: "Information collected from all visitors to our website",
    content: [
      "Kami dapat mengumpulkan informasi non-pribadi yang dapat diidentifikasi secara teknis dari semua pengunjung website kami, seperti alamat IP (Internet Protocol), jenis browser, sistem operasi, preferensi bahasa, halaman rujukan/keluar, stempel waktu kunjungan, dan data navigasi klik (clickstream data).",
      "Informasi ini kami gunakan semata-mata untuk tujuan analisis statistik lalu lintas situs, memantau tren performa server, mendeteksi potensi ancaman keamanan, serta meningkatkan kenyamanan dan kecepatan pengalaman berbelanja Anda di website it'smatapanda.",
    ],
  },
  {
    id: "registered-users",
    title: "Information collected from users who register their emails with us",
    content: [
      "Ketika Anda mendaftar akun, bergabung dengan The Panda Club, berlangganan newsletter, atau melakukan checkout pesanan, kami akan meminta informasi pribadi tertentu yang diperlukan, meliputi: nama lengkap, alamat email aktif, nomor telepon/WhatsApp, alamat pengiriman dan penagihan, serta detail pembayaran yang diproses secara aman oleh gateway pembayaran berlisensi kami (Midtrans).",
      "Informasi ini digunakan untuk memproses dan mengirimkan pesanan tas Anda, mengirimkan notifikasi pembaruan status pengiriman resi, menyediakan layanan purnajual dan garansi, serta memberikan penawaran eksklusif, rilis koleksi baru, dan promo khusus member jika Anda telah memberikan persetujuan.",
    ],
  },
  {
    id: "cookies",
    title: "Our use of cookies",
    content: [
      "Website it'smatapanda menggunakan teknologi 'cookies' dan mekanisme penyimpanan lokal (local storage) serupa untuk membedakan Anda dari pengguna lain, mengingat preferensi tas favorit di keranjang belanja (cart), memelihara sesi login yang aman, dan menganalisis efektivitas promosi kami.",
      "Anda memiliki kendali penuh untuk menolak atau menghapus cookies melalui pengaturan browser internet Anda. Namun, harap dicatat bahwa menonaktifkan cookies tertentu dapat memengaruhi fungsionalitas keranjang belanja dan fitur interaktif pada situs kami.",
    ],
  },
  {
    id: "access-and-correction",
    title: "Access to your information and updating and correcting your information",
    content: [
      "Kami berkomitmen menjamin akurasi data Anda. Anda berhak untuk mengakses, meninjau, memperbarui, atau memperbaiki data pribadi Anda kapan saja dengan masuk ke menu 'Account Profile' pada website kami.",
      "Jika Anda ingin meminta penghapusan akun atau data pribadi Anda dari sistem kami, Anda dapat menghubungi tim perlindungan data kami melalui email hello@itsmatapanda.com. Kami akan memproses permintaan Anda sesuai dengan ketentuan perundang-undangan perlindungan data pribadi yang berlaku di Republik Indonesia.",
    ],
  },
  {
    id: "non-disclosure",
    title: "Non-disclosure",
    content: [
      "it'smatapanda tidak akan pernah menjual, menyewakan, memperdagangkan, atau menyebarluaskan data pribadi Anda kepada pihak ketiga mana pun untuk tujuan komersial mereka tanpa persetujuan eksplisit dari Anda.",
      "Data Anda hanya dibagikan kepada mitra pihak ketiga terpercaya yang secara langsung mendukung operasional pesanan Anda (seperti penyedia jasa kurir logistik JNE/DHL/SiCepat untuk pengiriman paket, dan payment gateway Midtrans untuk pemrosesan transaksi yang dienkripsi secara ketat).",
    ],
  },
  {
    id: "sale-of-business",
    title: "Sale of business",
    content: [
      "Dalam peristiwa di mana bisnis atau aset it'smatapanda mengalami restrukturisasi, merger, akuisisi, atau penjualan aset kepada entitas lain, data pelanggan yang relevan dapat menjadi bagian dari aset yang dialihkan.",
      "Pihak pengakuisisi akan tetap terikat oleh standar komitmen privasi dan perlindungan data yang sama seperti yang tercantum dalam Syarat & Ketentuan ini.",
    ],
  },
  {
    id: "privacy-changes",
    title: "Changes to Privacy Policy",
    content: [
      "Kami berhak memperbarui atau memodifikasi Syarat & Ketentuan dan Kebijakan Privasi ini sewaktu-waktu untuk mencerminkan perubahan praktik bisnis, fitur website baru, atau kepatuhan terhadap regulasi hukum yang berlaku.",
      "Setiap perubahan material akan diberitahukan melalui pembaruan tanggal 'Last Updated' di bagian atas halaman ini atau melalui pengumuman di banner website. Kami menyarankan Anda untuk memeriksa halaman ini secara berkala.",
    ],
  },
  {
    id: "how-to-contact-us",
    title: "How to contact us",
    content: [
      "Jika Anda memiliki pertanyaan, saran, keluhan, atau memerlukan klarifikasi lebih lanjut mengenai Syarat & Ketentuan Layanan maupun Kebijakan Privasi kami, silakan hubungi tim kami melalui:",
      "• WhatsApp Official: +62 812-3456-7890 (Senin – Minggu, 09.00 – 21.00 WIB)\n• Email Layanan Pelanggan: hello@itsmatapanda.com\n• Alamat Kantor & Studio Kreatif: it'smatapanda Design Studio, Jakarta Selatan, DKI Jakarta, Indonesia.",
    ],
  },
];
