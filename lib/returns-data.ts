export interface ReturnCard {
  id: string;
  bullet: boolean;
  content: string[];
}

export const RETURNS_POLICY_DATA = {
  returnWindowDays: 7,
  cards: [
    {
      id: "return-window",
      bullet: true,
      content: [
        "Retur dan penukaran ukuran/warna dapat diajukan dalam 7 hari kalender sejak paket it'smatapanda kamu tercatat berhasil diterima oleh kurir.",
      ],
    },
    {
      id: "condition-eligibility",
      bullet: true,
      content: [
        "Barang yang dikembalikan harus dalam kondisi baru seperti semula: belum dipakai, belum dicuci, tidak diubah, serta bebas dari noda, bau, atau bekas pemakaian. Seluruh kemasan asli, tag, dustbag, dan plastik pembungkus harus lengkap dan masih terpasang.",
      ],
    },
    {
      id: "shipping-charges",
      bullet: true,
      content: [
        "Untuk penukaran karena berubah pikiran atau preferensi ukuran, ongkos kirim retur ke studio kami dan ongkos kirim ulang ditanggung pembeli.",
        "Jika retur disebabkan varian yang kami kirim salah atau cacat produksi yang telah diverifikasi, it'smatapanda menanggung 100% ongkos kirim retur dan pengiriman barang pengganti.",
      ],
    },
    {
      id: "refund-processing",
      bullet: true,
      content: [
        "Refund diproses dalam 3–5 hari kerja setelah barang retur kami terima dan lolos pemeriksaan Quality Control. Dana dikembalikan ke metode pembayaran awal atau diberikan sebagai voucher belanja.",
      ],
    },
    {
      id: "how-to-initiate",
      bullet: true,
      content: [
        "Untuk mengajukan retur atau penukaran, kirim email ke tim Customer Care kami di hello@itsmatapanda.com (Senin – Minggu, 09.00 – 21.00 WIB) dengan menyertakan Nomor Pesanan dan foto barang.",
      ],
    },
  ] as ReturnCard[],
};
