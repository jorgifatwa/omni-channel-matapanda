"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

export default function Footer() {
  const [email, setEmail] = React.useState("");
  const [status, setStatus] = React.useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = React.useState("");
  const [categoriesList, setCategoriesList] = React.useState<{ name: string; slug: string }[]>(
    []
  );

  React.useEffect(() => {
    let isMounted = true;
    fetch("/api/menu")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted || !data?.categories) return;
        const catItems = (data.categories || []).map(
          (c: { name: string; slug: string }) => ({
            name: c.name,
            slug: c.slug,
          })
        );
        setCategoriesList(catItems);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setStatus("error");
      setMessage("Silakan masukkan alamat email yang valid.");
      return;
    }

    try {
      setStatus("loading");
      setMessage("");
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatus("success");
        setMessage(data.message || "Terima kasih telah bergabung dengan newsletter kami!");
        setEmail("");
      } else {
        setStatus("error");
        setMessage(data.message || "Gagal berlangganan. Silakan coba lagi.");
      }
    } catch {
      setStatus("error");
      setMessage("Terjadi kesalahan jaringan.");
    }
  };

  const scrollToTop = () => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <footer className="w-full bg-[#fafaf8] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 border-t border-[#396254]/10 dark:border-neutral-800">
      {/* 1. Newsletter Section */}
      <section
        aria-label="Newsletter Subscription"
        className="w-full bg-[#d5c6ff] dark:bg-[#253931] text-[#396254] dark:text-[#dcf58d] py-16 sm:py-24 lg:py-28 px-6 sm:px-10 lg:px-16 flex items-center relative overflow-hidden"
      >
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center w-full relative z-10">
          <div className="lg:col-span-6 space-y-3 sm:space-y-4">
            <span className="inline-flex items-center px-3.5 py-1 rounded-full bg-white/40 dark:bg-white/10 text-xs font-black tracking-wide shadow-xs">
              <span>Panda Club Newsletter</span>
            </span>
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-none text-[#396254] dark:text-white">
              Newsletter Panda
            </h2>
            <p className="text-lg sm:text-2xl font-bold tracking-tight text-[#396254]/90 dark:text-[#dcf58d]">
              Jadilah yang pertama tahu rilis baru!
            </p>
          </div>

          <div className="lg:col-span-6 space-y-4">
            <p className="text-xs sm:text-sm text-[#396254]/90 dark:text-neutral-300 max-w-md leading-relaxed font-medium">
              Dapatkan akses awal ke koleksi terbatas, promo diskon eksklusif, dan gift kejutan member langsung di email kamu.
            </p>

            <form onSubmit={handleSubscribe} className="space-y-3">
              <div className="flex items-center max-w-lg bg-white dark:bg-neutral-900 rounded-full overflow-hidden border-2 border-[#396254]/20 shadow-md p-1.5">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (status !== "idle") setStatus("idle");
                  }}
                  placeholder="Masukkan email kamu..."
                  disabled={status === "loading"}
                  className="flex-1 px-5 py-3 text-xs sm:text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 bg-transparent focus:outline-none rounded-full"
                  required
                />
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="bg-[#396254] text-[#dcf58d] hover:bg-[#2e5044] disabled:opacity-50 px-6 sm:px-8 py-3 rounded-full text-xs sm:text-sm font-black uppercase tracking-wider transition-all inline-flex items-center gap-2 shrink-0 shadow-md hover:-translate-y-0.5 active:scale-95 cursor-pointer"
                >
                  {status === "loading" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <span>Gabung</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>

              {status === "success" && (
                <p className="text-xs sm:text-sm text-[#396254] dark:text-[#dcf58d] font-bold flex items-center gap-1.5 pt-1">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{message}</span>
                </p>
              )}
              {status === "error" && (
                <p className="text-xs sm:text-sm text-rose-700 dark:text-rose-400 font-bold flex items-center gap-1.5 pt-1">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{message}</span>
                </p>
              )}
            </form>
          </div>
        </div>
      </section>

      {/* 2. 3-Column Navigation Links (BTV Minimalist Aesthetic) */}
      <div className="max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-16 pt-14 pb-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 lg:gap-16 text-xs">
          {/* Column 1: About it'smatapanda */}
          <div className="space-y-4">
            <h3 className="font-bold uppercase tracking-wider text-black text-[13px]">
              About it&apos;smatapanda
            </h3>
            <ul className="space-y-2.5 text-neutral-600">
              <li>
                <Link href="/about" className="hover:text-black hover:underline underline-offset-4 transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-black hover:underline underline-offset-4 transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy-policy" className="hover:text-black hover:underline underline-offset-4 transition-colors">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Explore (Dynamically synced with sidebar/database) */}
          <div className="space-y-4">
            <h3 className="font-bold uppercase tracking-wider text-black text-[13px]">
              Explore
            </h3>
            <ul className="space-y-2.5 text-neutral-600">
              <li>
                <Link
                  href="/products"
                  className="hover:text-black hover:underline underline-offset-4 transition-colors font-medium text-black"
                >
                  All Products
                </Link>
              </li>
              <li>
                <Link
                  href="/new-arrivals"
                  className="hover:text-black hover:underline underline-offset-4 transition-colors"
                >
                  New In
                </Link>
              </li>
              {categoriesList.map((cat) => (
                <li key={cat.slug}>
                  <Link
                    href={`/categories/${cat.slug}`}
                    className="hover:text-black hover:underline underline-offset-4 transition-colors"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Support */}
          <div className="space-y-4">
            <h3 className="font-bold uppercase tracking-wider text-black text-[13px]">
              Support
            </h3>
            <ul className="space-y-2.5 text-neutral-600">
              <li>
                <Link href="/faq" className="hover:text-black hover:underline underline-offset-4 transition-colors font-medium text-black">
                  FAQs &amp; Panduan
                </Link>
              </li>
              <li>
                <Link href="/shipping" className="hover:text-black hover:underline underline-offset-4 transition-colors">
                  Shipping &amp; Delivery
                </Link>
              </li>
              <li>
                <Link href="/returns" className="hover:text-black hover:underline underline-offset-4 transition-colors">
                  Return &amp; Exchange Policy
                </Link>
              </li>
              <li>
                <Link href="/tracking" className="hover:text-black hover:underline underline-offset-4 transition-colors font-medium text-black">
                  Lacak Pesanan (Cek Resi)
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-black hover:underline underline-offset-4 transition-colors">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* 3. Bottom Bar: Socials & Copyright */}
        <div className="mt-14 pt-8 border-t border-neutral-200 flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Social Icons */}
          <div className="flex items-center gap-4 text-black">
            <a
              href="https://www.instagram.com/itsmatapanda/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="p-1.5 hover:opacity-70 transition-opacity"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </a>
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="p-1.5 hover:opacity-70 transition-opacity"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </a>
            <a
              href="https://shopee.co.id/itsmatapanda?entryPoint=ShopBySearch&searchKeyword=itsmatapanda"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Shopee"
              className="p-1.5 hover:opacity-70 transition-opacity"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7.2 7.2V6.6a4.8 4.8 0 0 1 9.6 0v.6h3.3a.9.9 0 0 1 .9.96l-.84 12.6A2.4 2.4 0 0 1 17.77 23H6.23a2.4 2.4 0 0 1-2.39-2.24L3 8.16a.9.9 0 0 1 .9-.96h3.3Zm1.8 0h6V6.6a3 3 0 0 0-6 0v.6Z" />
                <text x="12" y="19.2" textAnchor="middle" fontSize="10.5" fontWeight="900" fill="white" fontFamily="Arial, sans-serif">S</text>
              </svg>
            </a>
            <a
              href="https://www.tiktok.com/@matapanda_id"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="TikTok"
              className="p-1.5 hover:opacity-70 transition-opacity"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
              </svg>
            </a>
          </div>

          {/* Copyright & Scroll To Top */}
          <div className="flex items-center gap-4 text-xs text-neutral-500 font-medium">
            <span>&copy; {new Date().getFullYear()} it&apos;smatapanda. Crafted with love</span>
            <button
              type="button"
              onClick={scrollToTop}
              aria-label="Scroll to top"
              className="h-9 w-9 rounded-full bg-[#396254] text-[#dcf58d] hover:bg-[#2e5044] hover:-translate-y-0.5 active:scale-95 flex items-center justify-center transition-all shadow-sm cursor-pointer"
            >
              <ChevronUp className="h-4 w-4 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
