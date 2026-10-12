"use client";

import * as React from "react";
import { Loader2, CheckCircle2, AlertCircle, Mail, MessageCircle, MapPin, FileEdit, Truck, CreditCard, RotateCcw, Tag } from "lucide-react";
import AnnouncementBar from "@/components/AnnouncementBar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function ContactPage() {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          message: message.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Gagal mengirim pesan. Silakan coba lagi.");
        setLoading(false);
        return;
      }

      setSubmitted(true);
      setName("");
      setEmail("");
      setPhone("");
      setMessage("");
    } catch {
      setError("Terjadi gangguan koneksi. Silakan periksa jaringan Anda.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col bg-[#fafaf8] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans">
      <AnnouncementBar />
      <Navbar />

      <main className="flex-1 w-full max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-16 pt-12 pb-24">
        <div className="max-w-[1100px] mx-auto space-y-14">
          {/* Header */}
          <div className="text-center space-y-4 max-w-xl mx-auto">
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#d5c6ff]/40 text-[#396254] dark:text-[#d5c6ff] font-bold text-xs tracking-wide shadow-xs">
              <MessageCircle className="h-3.5 w-3.5" />
              <span>Hubungi Kami</span>
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#396254] dark:text-white tracking-tight">
              Tanya Panda &amp; Ngobrol Bareng
            </h1>
            <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-300 leading-relaxed">
              Ada pertanyaan seputar pesanan, kolaborasi desain, atau produk favoritmu? Tim it&apos;smatapanda siap membantumu!
            </p>
          </div>

          {/* Quick Contact Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="rounded-3xl border-2 border-[#396254]/15 bg-white dark:bg-neutral-900 p-6 space-y-2.5 text-center shadow-sm hover:border-[#396254]/40 hover:-translate-y-1 transition-all">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-[#dcf58d] text-[#396254] flex items-center justify-center shadow-xs">
                <Mail className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-black text-[#396254] dark:text-white">Email Resmi</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Respon maksimal 24 jam kerja
              </p>
              <a
                href="mailto:hello@itsmatapanda.com"
                className="inline-block text-xs font-bold text-[#396254] dark:text-[#dcf58d] hover:underline"
              >
                hello@itsmatapanda.com
              </a>
            </div>

            <div className="rounded-3xl border-2 border-[#396254]/15 bg-white dark:bg-neutral-900 p-6 space-y-2.5 text-center shadow-sm hover:border-[#396254]/40 hover:-translate-y-1 transition-all">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-[#d5c6ff] text-[#396254] flex items-center justify-center shadow-xs">
                <MessageCircle className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-black text-[#396254] dark:text-white">Chat &amp; Support</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Senin - Jumat (09:00 - 18:00 WIB)
              </p>
              <span className="text-xs font-bold text-[#396254] dark:text-[#dcf58d]">
                +62 812-3456-7890
              </span>
            </div>

            <div className="rounded-3xl border-2 border-[#396254]/15 bg-white dark:bg-neutral-900 p-6 space-y-2.5 text-center shadow-sm hover:border-[#396254]/40 hover:-translate-y-1 transition-all">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-[#ED96D7]/40 text-[#396254] flex items-center justify-center shadow-xs">
                <MapPin className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-black text-[#396254] dark:text-white">Creative Studio</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Pop-up retail &amp; exhibition
              </p>
              <span className="text-xs font-bold text-[#396254] dark:text-[#dcf58d]">
                Jakarta Selatan, Indonesia
              </span>
            </div>
          </div>

          {/* Form & Policy Split Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            {/* Left Column: Playful Form */}
            <div className="lg:col-span-7 rounded-3xl border-2 border-[#396254]/15 bg-white dark:bg-neutral-900 p-7 sm:p-10 shadow-xl space-y-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-[#396254] dark:text-white flex items-center gap-2">
                  <FileEdit className="h-5 w-5" />
                  <span>Kirim Pesan Langsung</span>
                </h2>
                <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                  Isi formulir di bawah ini dan kami akan membalas ke email Anda secepatnya.
                </p>
              </div>

              {submitted && (
                <div className="border-2 border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 p-5 text-sm text-emerald-900 dark:text-emerald-200 rounded-2xl flex items-start gap-3 shadow-xs">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Pesan berhasil terkirim!</p>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                      Terima kasih sudah menghubungi kami. Tim kami akan membalas pesanmu segera.
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <div className="border-2 border-rose-300 bg-rose-50 dark:bg-rose-950/30 p-4 text-xs sm:text-sm text-rose-700 dark:text-rose-300 rounded-2xl flex items-center gap-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span className="font-bold">{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="contact-name"
                      className="block text-xs font-bold text-[#396254] dark:text-neutral-300 mb-1.5"
                    >
                      Nama Lengkap *
                    </label>
                    <input
                      id="contact-name"
                      name="name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nama kamu"
                      className="w-full h-12 px-4 rounded-2xl border-2 border-neutral-200 dark:border-neutral-700 bg-[#fafaf8] dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-[#396254] focus:ring-2 focus:ring-[#d5c6ff]/50 transition-all shadow-xs"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="contact-email"
                      className="block text-xs font-bold text-[#396254] dark:text-neutral-300 mb-1.5"
                    >
                      Email Aktif *
                    </label>
                    <input
                      id="contact-email"
                      name="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@kamu.com"
                      className="w-full h-12 px-4 rounded-2xl border-2 border-neutral-200 dark:border-neutral-700 bg-[#fafaf8] dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-[#396254] focus:ring-2 focus:ring-[#d5c6ff]/50 transition-all shadow-xs"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="contact-phone"
                    className="block text-xs font-bold text-[#396254] dark:text-neutral-300 mb-1.5"
                  >
                    Nomor WhatsApp (Opsional)
                  </label>
                  <input
                    id="contact-phone"
                    name="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0812xxxxxxx"
                    className="w-full h-12 px-4 rounded-2xl border-2 border-neutral-200 dark:border-neutral-700 bg-[#fafaf8] dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-[#396254] focus:ring-2 focus:ring-[#d5c6ff]/50 transition-all shadow-xs"
                  />
                </div>

                <div>
                  <label
                    htmlFor="contact-message"
                    className="block text-xs font-bold text-[#396254] dark:text-neutral-300 mb-1.5"
                  >
                    Pesan Pertanyaan *
                  </label>
                  <textarea
                    id="contact-message"
                    name="message"
                    required
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tuliskan pertanyaan atau kebutuhanmu di sini..."
                    className="w-full p-4 rounded-2xl border-2 border-neutral-200 dark:border-neutral-700 bg-[#fafaf8] dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-[#396254] focus:ring-2 focus:ring-[#d5c6ff]/50 transition-all resize-y shadow-xs"
                  />
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[#396254] hover:bg-[#2e5044] text-[#dcf58d] font-black text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    <span>{loading ? "MENGIRIM PESAN..." : "Kirim Pesan Sekarang"}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Right Column: Policy Cards */}
            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-3xl border border-[#396254]/15 bg-white dark:bg-neutral-900 p-6 space-y-2.5 shadow-sm">
                <h3 className="font-black text-[#396254] dark:text-[#dcf58d] text-base flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  <span>Pengiriman &amp; Ekspedisi</span>
                </h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                  Pesanan dikirim pada hari Senin &ndash; Jumat menggunakan JNE Express (domestik) dan DHL Express (internasional). Resi otomatis dikirimkan ke email terdaftar setelah order berstatus lunas.
                </p>
              </div>

              <div className="rounded-3xl border border-[#396254]/15 bg-white dark:bg-neutral-900 p-6 space-y-2.5 shadow-sm">
                <h3 className="font-black text-[#396254] dark:text-[#dcf58d] text-base flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  <span>Metode Pembayaran</span>
                </h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                  Seluruh transaksi terenkripsi aman via Midtrans Snap. Kami menerima QRIS, Virtual Account BCA/Mandiri/BRI/BNI, GoPay, dan Kartu Kredit.
                </p>
              </div>

              <div className="rounded-3xl border border-[#396254]/15 bg-white dark:bg-neutral-900 p-6 space-y-2.5 shadow-sm">
                <h3 className="font-black text-[#396254] dark:text-[#dcf58d] text-base flex items-center gap-2">
                  <RotateCcw className="h-4 w-4" />
                  <span>Kebijakan Retur &amp; Penukaran</span>
                </h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                  Jika terdapat cacat produksi pada barang yang Anda terima, penukaran dapat diajukan maksimal 3 hari sejak paket diterima. Hubungi kami beserta bukti foto/video unboxing.
                </p>
              </div>

              <div className="rounded-3xl border border-[#396254]/15 bg-white dark:bg-neutral-900 p-6 space-y-2.5 shadow-sm">
                <h3 className="font-black text-[#396254] dark:text-[#dcf58d] text-base flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  <span>Item SALE / Diskon</span>
                </h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                  Produk yang dibeli pada program promo diskon khusus (Sale Items) bersifat final dan tidak dapat ditukar atau dikembalikan.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
