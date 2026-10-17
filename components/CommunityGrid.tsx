"use client";

import * as React from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X, ExternalLink } from "lucide-react";
import {
  type CommunityPost,
  INITIAL_COMMUNITY_POSTS,
} from "@/lib/community-store";

export default function CommunityGrid() {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [posts, setPosts] = React.useState<CommunityPost[]>(INITIAL_COMMUNITY_POSTS);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(true);

  // Modal Lightbox State
  const [selectedPostIndex, setSelectedPostIndex] = React.useState<number | null>(null);

  // Fetch active posts from API
  React.useEffect(() => {
    let isMounted = true;
    fetch("/api/community/active")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data?.posts && Array.isArray(data.posts) && data.posts.length > 0) {
          setPosts(data.posts);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const checkScroll = React.useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 25);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 25);
  }, []);

  React.useEffect(() => {
    const el = containerRef.current;
    if (el) {
      el.scrollLeft = 0;
    }
    checkScroll();
    const timer = setTimeout(checkScroll, 100);
    window.addEventListener("resize", checkScroll);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll]);

  const handleScroll = (dir: "left" | "right") => {
    const el = containerRef.current;
    if (!el) return;
    const amount = Math.max(260, el.clientWidth * 0.7);
    el.scrollBy({
      left: dir === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  // Lightbox Navigation
  const activePosts = posts.filter((p) => p.isActive);
  const currentPost =
    selectedPostIndex !== null && activePosts[selectedPostIndex]
      ? activePosts[selectedPostIndex]
      : null;

  const handlePrevModal = React.useCallback(() => {
    if (selectedPostIndex === null) return;
    setSelectedPostIndex((prev) =>
      prev !== null ? (prev - 1 + activePosts.length) % activePosts.length : 0
    );
  }, [selectedPostIndex, activePosts.length]);

  const handleNextModal = React.useCallback(() => {
    if (selectedPostIndex === null) return;
    setSelectedPostIndex((prev) =>
      prev !== null ? (prev + 1) % activePosts.length : 0
    );
  }, [selectedPostIndex, activePosts.length]);

  // Keyboard navigation for modal
  React.useEffect(() => {
    if (selectedPostIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedPostIndex(null);
      } else if (e.key === "ArrowLeft") {
        handlePrevModal();
      } else if (e.key === "ArrowRight") {
        handleNextModal();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedPostIndex, handlePrevModal, handleNextModal]);

  // Prevent background body scroll when modal is open
  React.useEffect(() => {
    if (selectedPostIndex !== null) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedPostIndex]);

  if (activePosts.length === 0) {
    return null;
  }

  // Format caption mentions and hashtags with styling
  const renderFormattedCaption = (captionText: string) => {
    const parts = captionText.split(/(\s+)/);
    return parts.map((part, i) => {
      if (part.startsWith("@") || part.startsWith("#")) {
        return (
          <span key={i} className="font-semibold text-neutral-900 dark:text-neutral-100">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <section
      aria-label="Community Showcase"
      className="w-full bg-[#fafaf8] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 pt-12 sm:pt-16 pb-8 sm:pb-12 border-t border-neutral-200 dark:border-neutral-800 select-none transition-colors duration-200"
    >
      {/* Header */}
      <div className="text-center max-w-xl mx-auto px-4 mb-8 sm:mb-12 space-y-3">
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold font-heading bg-[#d5c6ff] text-[#396254] dark:bg-[#d5c6ff] dark:text-[#396254] shadow-xs">
          <span>Komunitas Panda</span>
        </span>
        <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-[#d5c6ff] dark:text-[#d5c6ff] font-heading leading-tight">
          it&apos;smatapanda
          <br />
          ON YOU
        </h2>
        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 font-medium">
          See content from it&apos;smatapanda Community. Tag us to get featured on the feed.
        </p>
      </div>

      {/* Horizontal Carousel */}
      <div className="relative group/community">
        {/* Left Arrow */}
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => handleScroll("left")}
            aria-label="Scroll left"
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-white/95 dark:bg-neutral-800/95 text-neutral-900 dark:text-neutral-100 shadow-lg border border-neutral-200 dark:border-neutral-700 flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}

        {/* Right Arrow */}
        {canScrollRight && (
          <button
            type="button"
            onClick={() => handleScroll("right")}
            aria-label="Scroll right"
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-white/95 dark:bg-neutral-800/95 text-neutral-900 dark:text-neutral-100 shadow-lg border border-neutral-200 dark:border-neutral-700 flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}

        {/* Image Row */}
        <div
          ref={containerRef}
          onScroll={checkScroll}
          className="overflow-x-auto scroll-smooth snap-x snap-mandatory scrollbar-none flex gap-3 sm:gap-4 px-4 sm:px-8 scroll-pl-4 sm:scroll-pl-8"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {activePosts.map((item, index) => (
            <div
              key={item.id}
              onClick={() => setSelectedPostIndex(index)}
              className="relative aspect-square w-[200px] sm:w-[240px] md:w-[280px] shrink-0 snap-start overflow-hidden bg-neutral-100 dark:bg-neutral-900 group/item cursor-pointer rounded-3xl border border-neutral-200/60 dark:border-neutral-800 shadow-xs"
              role="button"
              tabIndex={0}
              aria-label={`Open post by @${item.accountHandle}`}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelectedPostIndex(index);
                }
              }}
            >
              <Image
                src={item.image}
                alt={item.caption || `@${item.accountHandle}`}
                fill
                sizes="(max-width: 640px) 200px, 280px"
                className="object-cover transition-transform duration-700 ease-out group-hover/item:scale-105"
              />

              {/* Hover overlay with handle & caption */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/item:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4 text-white">
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                  <span>@{item.accountHandle}</span>
                </div>
                {item.caption && (
                  <p className="text-[11px] text-white/90 line-clamp-2 mt-1 leading-snug">
                    {item.caption}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Beyond The Vines Style Lightbox Modal */}
      {currentPost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-6 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedPostIndex(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Instagram Post Detail"
        >
          {/* Close Button Top Right */}
          <button
            type="button"
            onClick={() => setSelectedPostIndex(null)}
            aria-label="Close modal"
            className="absolute top-4 right-4 sm:top-6 sm:right-6 z-50 text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-6 h-6 sm:w-8 sm:h-8" />
          </button>

          {/* Previous Arrow Button (Floating Left) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePrevModal();
            }}
            aria-label="Previous post"
            className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 z-50 h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition-all backdrop-blur-md"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          {/* Next Arrow Button (Floating Right) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleNextModal();
            }}
            aria-label="Next post"
            className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-50 h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition-all backdrop-blur-md"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          {/* Modal Container */}
          <div
            className="relative w-full max-w-4xl bg-white dark:bg-neutral-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[88vh] z-40 border border-neutral-200 dark:border-neutral-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left Column: Full-height Photo */}
            <div className="relative w-full md:w-[55%] aspect-square md:aspect-auto md:min-h-[460px] bg-neutral-100 dark:bg-neutral-950 shrink-0">
              <Image
                src={currentPost.image}
                alt={currentPost.caption || `@${currentPost.accountHandle}`}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 550px"
                className="object-cover"
              />
            </div>

            {/* Right Column: Instagram Header, Caption, Footer */}
            <div className="w-full md:w-[45%] flex flex-col justify-between p-5 sm:p-7 overflow-y-auto max-h-[45vh] md:max-h-[88vh]">
              {/* Header: Brand Profile */}
              <div>
                <div className="flex items-center gap-3 pb-4 border-b border-neutral-100 dark:border-neutral-800">
                  {/* Brand Avatar Circle */}
                  <div className="w-10 h-10 rounded-full bg-[#396254] text-white dark:bg-[#dcf58d] dark:text-[#233a32] flex items-center justify-center text-[10px] font-black font-heading tracking-tight shrink-0 shadow-sm">
                    IMP
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs sm:text-sm font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                        {currentPost.accountHandle}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Caption Body */}
                <div className="py-5 text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed space-y-3 font-normal">
                  <p className="whitespace-pre-line">
                    {renderFormattedCaption(currentPost.caption)}
                  </p>
                </div>
              </div>

              {/* Footer: Date + View on Instagram link */}
              <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400">
                <span>{currentPost.postDate || "Recently added"}</span>

                {currentPost.instagramUrl ? (
                  <a
                    href={currentPost.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-medium hover:text-black dark:hover:text-white transition-colors"
                  >
                    <span>&bull; View on Instagram</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="text-neutral-400">&bull; it&apos;smatapanda</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
