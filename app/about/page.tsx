import { Metadata } from "next";
import Link from "next/link";
import { Sparkles, Heart, Globe, ArrowRight } from "lucide-react";
import AnnouncementBar from "@/components/AnnouncementBar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "About – it'smatapanda",
  description: "it'smatapanda is a creative space with a wider cultural reach.",
};

export default function AboutPage() {
  return (
    <div className="min-h-dvh flex flex-col bg-[#fafaf8] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans">
      <AnnouncementBar />
      <Navbar />

      <main className="flex-1 w-full max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-16 pt-12 pb-24">
        <div className="max-w-[1100px] mx-auto space-y-16">
          {/* Hero Header */}
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#d5c6ff]/40 text-[#396254] dark:text-[#d5c6ff] font-bold text-xs tracking-wide shadow-xs">
              <span>About it&apos;smatapanda</span>
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#396254] dark:text-white tracking-tight">
              Ruang Eksplorasi Kreatif &amp; Budaya Panda
            </h1>
            <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-300 leading-relaxed">
              Sebuah platform di mana streetwear, objek bermain, seni kontemporer, dan ide-ide segar bertemu secara bebas dan penuh makna.
            </p>
          </div>

          {/* Core Story Banner */}
          <div className="rounded-3xl border-2 border-[#396254]/15 bg-white dark:bg-neutral-900 p-8 sm:p-12 shadow-xl space-y-6 relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-[#dcf58d]/30 blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-[#d5c6ff]/30 blur-2xl pointer-events-none" />

            <div className="relative z-10 space-y-6 text-base sm:text-lg font-normal text-neutral-800 dark:text-neutral-200 leading-[1.85]">
              <p>
                <strong className="text-[#396254] dark:text-[#dcf58d] font-black">it&apos;smatapanda</strong> is a creative space with a wider cultural reach.
                Rooted in thoughtful design, it was created as a space where streetwear and culture are experienced with intention.
                Beyond that, it&apos;smatapanda extends into a permanent retail and exhibition platform – a flexible environment for ideas, objects, and collaborations to take shape.
              </p>

              <p>
                From fashion pop-ups and capsule launches to artist showcases and community takeovers, the space is constantly in motion.
                it&apos;smatapanda actively invites both local and international communities to engage, collaborate, and reinterpret the space in their own way.
              </p>

              <p className="text-lg sm:text-xl font-bold text-[#396254] dark:text-[#dcf58d]">
                &ldquo;A place where music, fashion, and art naturally converge. And continuously evolve.&rdquo;
              </p>
            </div>
          </div>

          {/* Three Playful Value Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-3xl border-2 border-[#396254]/15 bg-white dark:bg-neutral-900 p-7 space-y-4 shadow-sm hover:border-[#396254]/40 hover:-translate-y-1 transition-all">
              <div className="w-14 h-14 rounded-2xl bg-[#dcf58d] text-[#396254] flex items-center justify-center text-2xl rotate-[-3deg] shadow-xs">
                <Sparkles className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-black text-[#396254] dark:text-white">
                Thoughtful Design
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Setiap tas, apparel, dan aksesoris didesain dengan ketelitian tinggi, siluet fungsional, serta material yang nyaman untuk keseharianmu.
              </p>
            </div>

            <div className="rounded-3xl border-2 border-[#396254]/15 bg-white dark:bg-neutral-900 p-7 space-y-4 shadow-sm hover:border-[#396254]/40 hover:-translate-y-1 transition-all">
              <div className="w-14 h-14 rounded-2xl bg-[#d5c6ff] text-[#396254] flex items-center justify-center text-2xl rotate-[3deg] shadow-xs">
                <Heart className="h-7 w-7 fill-[#396254]" />
              </div>
              <h3 className="text-lg font-black text-[#396254] dark:text-white">
                Playful Community
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Menghubungkan para kreator, penikmat estetika, dan pecinta gaya urban dalam atmosfer yang hangat, ramah, dan menyenangkan.
              </p>
            </div>

            <div className="rounded-3xl border-2 border-[#396254]/15 bg-white dark:bg-neutral-900 p-7 space-y-4 shadow-sm hover:border-[#396254]/40 hover:-translate-y-1 transition-all">
              <div className="w-14 h-14 rounded-2xl bg-[#ED96D7]/40 text-[#396254] flex items-center justify-center text-2xl rotate-[-2deg] shadow-xs">
                <Globe className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-black text-[#396254] dark:text-white">
                Creative Space
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Eksibisi seni rupa, rilis kolaborasi eksklusif, hingga live session musik yang memberi panggung bagi ide-ide baru untuk bertumbuh.
              </p>
            </div>
          </div>

          {/* Interactive CTA Banner */}
          <div className="rounded-3xl bg-[#396254] p-8 sm:p-12 text-center text-white space-y-6 shadow-xl relative overflow-hidden">
            <div className="space-y-2 max-w-lg mx-auto">
              <h2 className="text-2xl sm:text-3xl font-black text-[#dcf58d]">
                Temukan Koleksi Favoritmu
              </h2>
              <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
                Dari Dumpling Bag yang ikonik hingga apparel oversized dengan sentuhan grafis orisinal it&apos;smatapanda.
              </p>
            </div>

            <div>
              <Link
                href="/new-arrivals"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#dcf58d] text-[#396254] font-black text-sm hover:bg-[#cbef6f] hover:scale-105 active:scale-95 transition-all shadow-md"
              >
                <span>Lihat Semua Produk</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
