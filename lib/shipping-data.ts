export interface ShippingCard {
  id: string;
  bullet: boolean;
  content: string[];
}

export const SHIPPING_RATES_DATA = {
  cards: [
    {
      id: "shipping-cost",
      bullet: true,
      content: [
        "Ongkos kirim dihitung saat checkout berdasarkan kota tujuan, berat paket, dan layanan kurir yang kamu pilih. Besaran ongkir ditampilkan sebelum kamu membayar.",
      ],
    },
    {
      id: "delivery-timeline",
      bullet: true,
      content: [
        "Estimasi pengiriman 1–3 hari kerja untuk Pulau Jawa & Jabodetabek, dan 2–5 hari kerja untuk wilayah lain di Indonesia (4–7 hari kerja saat musim liburan dan periode sale besar).",
      ],
    },
    {
      id: "domestic-only",
      bullet: true,
      content: [
        "Saat ini kami hanya melayani pengiriman di dalam Indonesia. Pesanan dikirim dari studio kami di Kiara Condong, Bandung, menggunakan kurir pilihanmu saat checkout (JNE, J&T, SiCepat, AnterAja, atau POS Indonesia).",
      ],
    },
    {
      id: "liability-disclaimer",
      bullet: true,
      content: [
        "it'smatapanda tidak menanggung ongkos kirim retur maupun biaya pengiriman ulang setelah paket meninggalkan studio kami, termasuk jika penerima tidak dapat dihubungi, alamat yang diberikan salah, atau kurir tidak dapat menyelesaikan pengiriman.",
        "Selama musim sale dan liburan, pengiriman dapat sedikit terlambat karena lonjakan volume di pihak kurir.",
      ],
    },
  ] as ShippingCard[],
};
