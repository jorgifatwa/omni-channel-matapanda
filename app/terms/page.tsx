import type { Metadata } from "next";
import AnnouncementBar from "@/components/AnnouncementBar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { TERMS_PREAMBLE, TERMS_SECTIONS } from "@/lib/terms-data";

export const metadata: Metadata = {
  title: "Terms of Service – it'smatapanda",
  description:
    "Syarat dan Ketentuan Layanan serta Kebijakan Privasi resmi it'smatapanda Indonesia.",
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-dvh flex flex-col bg-[#fafaf8] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans">
      {/* Top Bars */}
      <AnnouncementBar />
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-1 w-full pt-12 pb-20 sm:pt-16 sm:pb-28 px-6 sm:px-10 lg:px-16">
        <div className="max-w-[1000px] mx-auto space-y-12 sm:space-y-16">
          {/* Header */}
          <header className="space-y-4 text-center sm:text-left">
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#d5c6ff]/40 text-[#396254] dark:text-[#d5c6ff] font-bold text-xs tracking-wide shadow-xs">
              <span>Terms of Service</span>
            </span>

            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-[#396254] dark:text-white">
              Syarat &amp; Ketentuan Layanan
            </h1>

            {/* Introductory Preamble */}
            <div className="space-y-3 pt-2 text-xs sm:text-sm md:text-base text-neutral-600 dark:text-neutral-300 leading-relaxed max-w-3xl font-medium">
              {TERMS_PREAMBLE.intro.map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
              <p className="text-[11px] sm:text-xs text-[#396254] dark:text-[#dcf58d] font-bold font-mono pt-1">
                Terakhir Diperbarui: {TERMS_PREAMBLE.lastUpdated} &bull; {TERMS_PREAMBLE.companyName}
              </p>
            </div>
          </header>

          {/* Structured Legal Sections */}
          <div className="space-y-6 pt-2">
            {TERMS_SECTIONS.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className="rounded-3xl border-2 border-[#396254]/15 bg-white dark:bg-neutral-900 p-6 sm:p-8 space-y-3.5 shadow-sm hover:border-[#396254]/30 transition-all text-left"
              >
                {/* Section Title */}
                <h2 className="text-lg sm:text-xl md:text-2xl font-black tracking-tight text-[#396254] dark:text-[#dcf58d] flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#396254] dark:bg-[#dcf58d]" />
                  <span>{section.title}</span>
                </h2>

                {/* Section Content Paragraphs */}
                <div className="space-y-2.5 text-xs sm:text-sm md:text-[15px] text-neutral-700 dark:text-neutral-300 leading-relaxed font-normal">
                  {section.content.map((paragraph, pIdx) => (
                    <p key={pIdx} className="whitespace-pre-line leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
