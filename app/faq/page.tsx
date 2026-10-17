"use client";

import * as React from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  Minus,
  MessageCircle,
  Mail,
  Truck,
  Sparkles,
  X,
  ChevronRight,
  ShoppingBag,
  Loader2,
  HelpCircle,
} from "lucide-react";
import { FAQ_CATEGORIES, INITIAL_FAQS, type FaqItem } from "@/lib/faq-data";

export default function FaqPage() {
  const [faqs, setFaqs] = React.useState<FaqItem[]>(INITIAL_FAQS);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [activeCategory, setActiveCategory] = React.useState<string>("All");
  const [openFaqIds, setOpenFaqIds] = React.useState<Set<string>>(
    new Set(["faq-most-1", "faq-most-2"])
  );

  React.useEffect(() => {
    async function loadFaqs() {
      try {
        const res = await fetch("/api/faqs");
        if (res.ok) {
          const data = await res.json();
          if (data.faqs && Array.isArray(data.faqs) && data.faqs.length > 0) {
            setFaqs(data.faqs);
          }
        }
      } catch (err) {
        console.warn("Failed to fetch FAQs, using initial data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadFaqs();
  }, []);

  const toggleFaq = (id: string) => {
    setOpenFaqIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    const allIds = filteredFaqs.map((f) => f.id);
    setOpenFaqIds(new Set(allIds));
  };

  const collapseAll = () => {
    setOpenFaqIds(new Set());
  };

  // Filter FAQs based on category & search query
  const filteredFaqs = React.useMemo(() => {
    return faqs.filter((faq) => {
      const matchesCategory =
        activeCategory === "All" ||
        faq.category.toLowerCase() === activeCategory.toLowerCase();

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        faq.question.toLowerCase().includes(q) ||
        faq.answer.toLowerCase().includes(q) ||
        faq.category.toLowerCase().includes(q);

      return matchesCategory && matchesSearch;
    });
  }, [faqs, activeCategory, searchQuery]);

  // Group filtered faqs by category
  const groupedFaqs = React.useMemo(() => {
    const groups: Record<string, FaqItem[]> = {};

    if (activeCategory === "All") {
      // Keep category order from FAQ_CATEGORIES
      FAQ_CATEGORIES.forEach((cat) => {
        const items = filteredFaqs.filter(
          (f) => f.category.toLowerCase() === cat.toLowerCase()
        );
        if (items.length > 0) {
          groups[cat] = items;
        }
      });

      // Catch any custom categories added by admin
      filteredFaqs.forEach((item) => {
        if (!groups[item.category]) {
          const matching = filteredFaqs.filter((f) => f.category === item.category);
          if (matching.length > 0) {
            groups[item.category] = matching;
          }
        }
      });
    } else {
      groups[activeCategory] = filteredFaqs;
    }

    return groups;
  }, [filteredFaqs, activeCategory]);

  return (
    <div className="min-h-screen bg-[#fafaf8] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans">
      {/* 1. Header Section */}
      <section className="relative overflow-hidden pt-12 pb-10 sm:pt-16 sm:pb-14 border-b border-[#396254]/10 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          {/* Breadcrumb */}
          <nav
            aria-label="Breadcrumb"
            className="flex items-center justify-center gap-2 text-xs font-bold text-neutral-500 uppercase tracking-wider"
          >
            <Link href="/" className="hover:text-[#396254] dark:hover:text-white transition-colors">
              Beranda
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-[#396254] dark:text-[#dcf58d] font-bold">Pusat Bantuan &amp; FAQs</span>
          </nav>

          <div className="inline-block relative">
            <span className="inline-flex items-center gap-1.5 text-xs font-black tracking-wide text-[#396254] dark:text-[#d5c6ff] px-3.5 py-1.5 bg-[#d5c6ff]/30 dark:bg-neutral-800 rounded-full shadow-xs">
              <span>it&apos;smatapanda Help Center</span>
            </span>
            <h1 className="mt-3 text-3xl sm:text-4xl md:text-5xl font-black text-[#396254] dark:text-white tracking-tight">
              Pertanyaan yang Sering Diajukan
            </h1>
          </div>

          <p className="max-w-xl mx-auto text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 font-medium leading-relaxed">
            Temukan jawaban lengkap seputar pemesanan tas, opsi pengiriman, material nylon water-resistant, perawatan, hingga penukaran produk.
          </p>

          {/* Quick Search Bar */}
          <div className="max-w-xl mx-auto pt-4">
            <div className="relative flex items-center bg-[#fafaf8] dark:bg-neutral-800 rounded-full border-2 border-[#396254]/20 dark:border-neutral-700 shadow-sm p-1.5 focus-within:ring-2 focus-within:ring-[#d5c6ff] focus-within:border-[#396254] transition-all">
              <Search className="h-5 w-5 text-[#396254] dark:text-[#dcf58d] ml-3.5 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari pertanyaan... (contoh: pengiriman, tukar ukuran, bahan tas)"
                className="w-full px-3 py-2 text-xs sm:text-sm bg-transparent text-neutral-900 dark:text-neutral-50 placeholder:text-neutral-400 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="h-7 w-7 rounded-full bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 flex items-center justify-center mr-1 text-neutral-600 hover:text-black transition-colors"
                  aria-label="Hapus pencarian"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 2. Category Filter Pills */}
      <div className="sticky top-16 z-20 bg-white/90 dark:bg-neutral-900/90 backdrop-blur border-b border-[#396254]/10 dark:border-neutral-800 py-3 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            <button
              type="button"
              onClick={() => setActiveCategory("All")}
              className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all shadow-xs hover:-translate-y-0.5 active:scale-95 ${
                activeCategory === "All"
                  ? "bg-[#396254] text-[#dcf58d] shadow-sm"
                  : "bg-white dark:bg-neutral-800 border-2 border-[#396254]/15 text-neutral-700 dark:text-neutral-300 hover:border-[#396254]/40"
              }`}
            >
              Semua FAQs
            </button>
            {FAQ_CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all shadow-xs hover:-translate-y-0.5 active:scale-95 ${
                    isActive
                      ? "bg-[#396254] text-[#dcf58d] shadow-sm"
                      : "bg-white dark:bg-neutral-800 border-2 border-[#396254]/15 text-neutral-700 dark:text-neutral-300 hover:border-[#396254]/40"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. FAQ Content List */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-12">
        {/* Controls: Count & Expand/Collapse All */}
        <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 pb-2 border-b border-[#396254]/10 dark:border-neutral-800 font-bold">
          <div>
            Menampilkan <span className="text-[#396254] dark:text-[#dcf58d] font-black">{filteredFaqs.length}</span> pertanyaan
            {searchQuery && (
              <span> untuk &ldquo;<span className="font-bold text-[#396254]">{searchQuery}</span>&rdquo;</span>
            )}
          </div>
          <div className="flex items-center gap-3 uppercase tracking-wider text-[11px]">
            <button
              type="button"
              onClick={expandAll}
              className="text-[#396254] dark:text-[#d5c6ff] hover:underline transition-colors"
            >
              Buka Semua
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={collapseAll}
              className="text-[#396254] dark:text-[#d5c6ff] hover:underline transition-colors"
            >
              Tutup Semua
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && faqs.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-7 w-7 animate-spin text-[#396254]" />
            <p className="text-xs text-neutral-500 font-medium">Memuat panduan &amp; FAQs...</p>
          </div>
        ) : filteredFaqs.length === 0 ? (
          <div className="py-16 text-center space-y-4 bg-white dark:bg-neutral-900 rounded-3xl border-2 border-dashed border-[#396254]/20 p-8 shadow-sm">
            <div className="h-16 w-16 rounded-3xl bg-[#d5c6ff]/30 text-[#396254] flex items-center justify-center mx-auto">
              <HelpCircle className="h-8 w-8 text-[#396254]" />
            </div>
            <h3 className="text-base font-black text-[#396254] dark:text-white">
              Tidak ada pertanyaan yang cocok
            </h3>
            <p className="text-xs sm:text-sm text-neutral-500 max-w-sm mx-auto">
              Coba gunakan kata kunci pencarian lain atau pilih kategori yang berbeda.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setActiveCategory("All");
              }}
              className="px-6 py-2.5 bg-[#396254] text-[#dcf58d] rounded-full text-xs font-black uppercase tracking-wider hover:bg-[#2e5044] hover:-translate-y-0.5 active:scale-95 transition-all shadow-sm"
            >
              Reset Filter
            </button>
          </div>
        ) : null}

        {/* Grouped Accordion Sections */}
        {Object.entries(groupedFaqs).map(([categoryName, items]) => (
          <section key={categoryName} aria-labelledby={`faq-cat-${categoryName}`} className="space-y-4">
            {/* Category Section Header */}
            <div className="flex items-center gap-3 pt-2">
              <span className="h-3 w-3 rounded-full bg-[#396254] dark:bg-[#dcf58d]" />
              <h2
                id={`faq-cat-${categoryName}`}
                className="text-lg sm:text-xl font-black tracking-tight text-[#396254] dark:text-white"
              >
                {categoryName}
              </h2>
              <span className="text-xs font-bold text-[#396254] bg-[#d5c6ff]/30 px-3 py-0.5 rounded-full">
                {items.length}
              </span>
            </div>

            {/* Accordion Rows */}
            <div className="space-y-3.5">
              {items.map((faq) => {
                const isOpen = openFaqIds.has(faq.id);
                return (
                  <div
                    key={faq.id}
                    className={`overflow-hidden rounded-3xl transition-all duration-200 border-2 ${
                      isOpen
                        ? "border-[#396254] bg-white dark:bg-neutral-900 shadow-md ring-2 ring-[#d5c6ff]/40"
                        : "border-[#396254]/15 bg-white dark:bg-neutral-900 hover:border-[#396254]/40 shadow-xs"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleFaq(faq.id)}
                      aria-expanded={isOpen}
                      className="w-full flex items-center justify-between gap-4 p-5 sm:p-6 text-left hover:bg-[#396254]/5 transition-colors cursor-pointer"
                    >
                      <span className="text-xs sm:text-sm md:text-[15px] font-black tracking-tight text-neutral-900 dark:text-white leading-snug">
                        {faq.question}
                      </span>
                      <span
                        className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 ${
                          isOpen
                            ? "bg-[#396254] text-[#dcf58d] rotate-90"
                            : "bg-[#d5c6ff]/40 text-[#396254]"
                        }`}
                      >
                        {isOpen ? (
                          <Minus className="h-4 w-4" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                      </span>
                    </button>

                    {isOpen && (
                      <div className="px-5 pb-6 sm:px-6 sm:pb-6 text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed border-t border-[#396254]/10 pt-4 bg-[#fafaf8] dark:bg-neutral-800/40">
                        <p className="font-medium whitespace-pre-line leading-relaxed">{faq.answer}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        {/* 4. Help & Support CTA Box */}
        <section
          aria-label="Customer Care & Support"
          className="mt-16 rounded-3xl bg-[#396254] text-white p-8 sm:p-10 shadow-xl relative overflow-hidden"
        >
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-7 space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-bold text-[#dcf58d]">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Masih Butuh Bantuan?</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-[#dcf58d]">
                Hubungi Tim Care it&apos;smatapanda
              </h3>
              <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
                Tim layanan pelanggan kami siap membantu pertanyaan seputar ukuran, ketersediaan stok, konsultasi produk, hingga pelacakan pengiriman paketmu.
              </p>
            </div>

            <div className="md:col-span-5 flex flex-col sm:flex-row md:flex-col gap-3">
              <a
                href="https://wa.me/6281234567890?text=Halo%20it'smatapanda,%20saya%20ingin%20bertanya%20seputar%20produk%20tas"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-full bg-[#dcf58d] text-[#396254] font-black text-xs hover:bg-[#cbef6f] hover:scale-105 active:scale-95 transition-all shadow-sm"
              >
                <MessageCircle className="h-4 w-4" />
                <span>WhatsApp Support</span>
              </a>

              <Link
                href="/contact"
                className="flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-full bg-white text-[#396254] font-black text-xs hover:bg-neutral-100 hover:scale-105 active:scale-95 transition-all shadow-sm"
              >
                <Mail className="h-4 w-4" />
                <span>Kirim Pesan / Email</span>
              </Link>

              <Link
                href="/tracking"
                className="flex items-center justify-center gap-2.5 px-6 py-3 rounded-full border-2 border-white/30 text-white hover:bg-white/10 font-bold text-xs transition-all text-center"
              >
                <Truck className="h-4 w-4" />
                <span>Lacak Status Resi</span>
              </Link>
            </div>
          </div>
        </section>

        {/* 5. Shop CTA Link */}
        <div className="pt-4 text-center">
          <Link
            href="/new-arrivals"
            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#396254] dark:text-[#dcf58d] hover:underline underline-offset-8 transition-colors"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            <span>Jelajahi Koleksi Produk it&apos;smatapanda</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
