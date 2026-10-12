import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import AnnouncementBar from "@/components/AnnouncementBar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SHIPPING_RATES_DATA } from "@/lib/shipping-data";

export const metadata: Metadata = {
  title: "Shipping & Delivery – it'smatapanda",
  description:
    "Informasi ongkos kirim, gratis ongkir, estimasi waktu pengiriman, dan kebijakan kurir it'smatapanda.",
};

export default function ShippingPage() {
  return (
    <div className="min-h-dvh flex flex-col bg-[#fafaf8] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans">
      {/* Top Bars */}
      <AnnouncementBar />
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-1 w-full pt-12 pb-16 sm:pt-16 sm:pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto space-y-10 sm:space-y-12">
          {/* Header */}
          <div className="flex flex-col items-center justify-center text-center pt-2 space-y-3">
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#d5c6ff]/40 text-[#396254] dark:text-[#d5c6ff] font-bold text-xs tracking-wide shadow-xs">
              <span>Shipping &amp; Delivery</span>
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-[#396254] dark:text-white">
              Tarif &amp; Informasi Pengiriman
            </h1>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 max-w-md leading-relaxed">
              Seluruh pesanan dikemas secara rapi dan terlacak langsung dengan asuransi pengiriman terpercaya.
            </p>
          </div>

          {/* Stack of Rounded Policy Cards */}
          <div className="space-y-4 sm:space-y-5 max-w-2xl mx-auto pt-2">
            {SHIPPING_RATES_DATA.cards.map((card) => (
              <div
                key={card.id}
                className="rounded-3xl border-2 border-[#396254]/15 bg-white dark:bg-neutral-900 p-6 sm:p-8 shadow-sm hover:border-[#396254]/30 hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-3.5">
                  {card.bullet && (
                    <span className="text-[#396254] dark:text-[#dcf58d] text-xl sm:text-2xl leading-none select-none font-black mt-0.5 shrink-0">
                      •
                    </span>
                  )}
                  <div className="space-y-3 flex-1 text-xs sm:text-sm md:text-[15px] text-neutral-700 dark:text-neutral-300 leading-relaxed font-normal">
                    {card.content.map((paragraph, pIdx) => (
                      <p key={pIdx} className="leading-relaxed">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Back Navigation Button */}
          <div className="max-w-2xl mx-auto pt-4 text-center sm:text-left">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#396254] text-[#dcf58d] hover:bg-[#2e5044] font-black text-xs uppercase tracking-wider transition-all shadow-md hover:-translate-y-0.5 active:scale-95 group"
            >
              <ArrowLeft className="h-4 w-4 transform group-hover:-translate-x-1 transition-transform" />
              <span>Kembali ke Beranda</span>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
