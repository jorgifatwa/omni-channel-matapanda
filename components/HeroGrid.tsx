import Image from "next/image";
import Link from "next/link";

const LOOKBOOK_IMAGES = [
  {
    src: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80",
    alt: "Lookbook look 1",
  },
  {
    src: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=600&q=80",
    alt: "Lookbook look 2",
  },
  {
    src: "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=600&q=80",
    alt: "Lookbook look 3",
  },
  {
    src: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=600&q=80",
    alt: "Lookbook look 4",
  },
  {
    src: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=600&q=80",
    alt: "Lookbook look 5",
  },
  {
    src: "https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?auto=format&fit=crop&w=600&q=80",
    alt: "Lookbook look 6",
  },
  {
    src: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=600&q=80",
    alt: "Lookbook look 7",
  },
  {
    src: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=600&q=80",
    alt: "Lookbook look 8",
  },
  {
    src: "https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?auto=format&fit=crop&w=600&q=80",
    alt: "Lookbook look 9",
  },
];

export default function HeroGrid() {
  return (
    <section
      aria-label="Featured Collections"
      className="w-full bg-white px-1 grid grid-cols-1 md:grid-cols-3 gap-1 border-0"
    >
      {/* Cell 1 (Top Left): Full-bleed bag image + large bold white stacked overlay */}
      <Link
        href="/categories/tote-bags"
        className="group relative aspect-[3/4] w-full overflow-hidden bg-neutral-900 block"
      >
        <Image
          src="https://images.unsplash.com/photo-1508427953056-b00b8d78ebf5?auto=format&fit=crop&w=1200&q=80"
          alt="Tote Bags Collection"
          fill
          priority
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-black/25 group-hover:bg-black/35 transition-colors duration-300" />
        <div className="absolute inset-0 z-10 flex items-center justify-center pt-16 p-6">
          <h2 className="text-white text-5xl sm:text-6xl lg:text-7xl font-black uppercase tracking-tighter text-center leading-[0.88] drop-shadow-md select-none">
            TOTE
            <br />
            BAGS
          </h2>
        </div>
      </Link>

      {/* Cell 2 (Top Center): Editorial backdrop */}
      <Link
        href="/categories/shoulder-bags"
        className="group relative aspect-[3/4] w-full overflow-hidden bg-red-950 block"
      >
        <Image
          src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=80"
          alt="it's matapanda Sweatshirt Editorial"
          fill
          priority
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-red-950/20 group-hover:bg-red-950/30 transition-colors duration-300" />
      </Link>

      {/* Cell 3 (Top Right): 3x3 Lookbook Sub-Grid inside a single cell */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-sky-100 grid grid-cols-3 grid-rows-3 gap-0 border-0">
        {LOOKBOOK_IMAGES.map((item) => (
          <Link
            key={item.src}
            href="/new-arrivals"
            className="group relative w-full h-full overflow-hidden block"
          >
            <Image
              src={item.src}
              alt={item.alt}
              fill
              sizes="(max-width: 768px) 33vw, 11vw"
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            />
          </Link>
        ))}
      </div>

      {/* Cell 4 (Bottom Left): Full-body colorful streetwear editorial */}
      <Link
        href="/new-arrivals"
        className="group relative aspect-[3/4] w-full overflow-hidden bg-neutral-900 block"
      >
        <Image
          src="https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=1200&q=80"
          alt="Dawn Gong Streetwear Editorial"
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-black/5 group-hover:bg-black/15 transition-colors duration-300" />
      </Link>

      {/* Cell 5 (Bottom Center): Architectural interior streetwear editorial + cursive "Eleven" overlay */}
      <Link
        href="/new-arrivals"
        className="group relative aspect-[3/4] w-full overflow-hidden bg-neutral-900 block"
      >
        <Image
          src="https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?auto=format&fit=crop&w=1200&q=80"
          alt="Eleven Capsule Editorial"
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-black/15 group-hover:bg-black/25 transition-colors duration-300" />
        <div className="absolute bottom-8 left-0 z-10 select-none">
          <span className="font-serif italic text-4xl sm:text-5xl text-white/90 tracking-wide drop-shadow-sm -ml-2">
            Eleven
          </span>
        </div>
      </Link>

      {/* Cell 6 (Bottom Right): Warm moody bag portrait + small "it'smatapanda™" label at bottom center */}
      <Link
        href="/new-arrivals"
        className="group relative aspect-[3/4] w-full overflow-hidden bg-neutral-900 block"
      >
        <Image
          src="https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=80"
          alt="it'smatapanda Bag Collection"
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors duration-300" />
        <div className="absolute bottom-4 inset-x-0 z-10 flex justify-center text-white select-none">
          <span className="font-sans text-xs sm:text-sm font-black uppercase tracking-widest text-white/95 drop-shadow">
            it&apos;smatapanda<sup className="text-[8px] font-sans ml-0.5">TM</sup>
          </span>
        </div>
      </Link>
    </section>
  );
}
