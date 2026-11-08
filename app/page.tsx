import Link from "next/link";
import AnnouncementBar from "@/components/AnnouncementBar";
import Navbar from "@/components/Navbar";
import HeroBanner from "@/components/HeroBanner";
import SecondaryBanner from "@/components/SecondaryBanner";
import HomeProductSection from "@/components/HomeProductSection";
import CommunityGrid from "@/components/CommunityGrid";
import Footer from "@/components/Footer";
import {
  getNewArrivalProducts,
  getProductsByCategorySlug,
  getStorefrontBanners,
} from "@/lib/data-fetcher";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  // 0. Fetch dynamic banners for Hero (Banner Kesatu) & Secondary Promo (Banner Kedua)
  const { heroBanners, secondaryBanners } = await getStorefrontBanners();

  // 1. Fetch real products for "New In" from database / fetcher
  const newInProducts = await getNewArrivalProducts();

  // 2. Fetch real bag products for "it's matapanda Bags"
  const { products: rawBagProducts } = await getProductsByCategorySlug("bags-totes");
  let bagProducts = rawBagProducts;
  if (bagProducts.length < 4) {
    // If dedicated bags are fewer than 4, supplement with accessories to ensure rich horizontal scroll
    const { products: accProducts } = await getProductsByCategorySlug("accessories-objects");
    const existingIds = new Set(bagProducts.map((p) => p.id));
    const additional = accProducts.filter((p) => !existingIds.has(p.id));
    bagProducts = [...bagProducts, ...additional];
  }

  // 3. Fetch real favourite products (Shoulder Bags / Best sellers)
  const { products: shoulderProducts } = await getProductsByCategorySlug("shoulder-bags");
  let favouriteProducts = shoulderProducts;
  if (favouriteProducts.length < 4) {
    const { products: slingProducts } = await getProductsByCategorySlug("sling-crossbody");
    const existingFavIds = new Set(favouriteProducts.map((p) => p.id));
    const extra = slingProducts.filter((p) => !existingFavIds.has(p.id));
    favouriteProducts = [...favouriteProducts, ...extra];
  }
  if (favouriteProducts.length === 0) {
    favouriteProducts = newInProducts;
  }

  const hasAnyProducts =
    newInProducts.length > 0 || bagProducts.length > 0 || favouriteProducts.length > 0;

  return (
    <div className="min-h-dvh flex flex-col bg-[#fafaf8] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans transition-colors duration-200 max-w-full overflow-x-clip">
      {/* Top Announcement Bar */}
      <AnnouncementBar />

      {/* Main Navigation */}
      <Navbar />

      <main className="flex-1 w-full max-w-full overflow-x-clip">
        {/* 1. Hero Section: Full-width lifestyle carousel with dynamic/8 categories */}
        <HeroBanner banners={heroBanners} />

        {/* 2. Secondary Promo Banner: Dynamic promotional slides directly beneath with no gap */}
        <SecondaryBanner banners={secondaryBanners} />

        {/* Empty catalog: friendly placeholder instead of empty product rows */}
        {!hasAnyProducts && (
          <section className="w-full bg-[#d5c6ff]/40 dark:bg-neutral-900 px-6 py-16 sm:py-20 text-center">
            <div className="mx-auto max-w-xl flex flex-col items-center gap-4">
              <span className="inline-flex items-center rounded-full bg-[#dcf58d] px-4 py-1.5 text-xs font-black uppercase tracking-wider text-[#396254]">
                Segera Hadir
              </span>
              <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-[#396254] dark:text-[#dcf58d] font-heading">
                Koleksi baru sedang disiapkan
              </h2>
              <p className="text-sm sm:text-base text-neutral-700 dark:text-neutral-300">
                Produk it&apos;smatapanda akan segera tersedia di sini. Hubungi kami
                kalau ada pertanyaan atau ingin pesan lebih dulu.
              </p>
              <Link
                href="/contact"
                className="mt-2 inline-flex items-center rounded-full bg-[#396254] px-7 py-3 text-sm font-bold uppercase tracking-wider text-white hover:opacity-90 transition-opacity"
              >
                Hubungi Kami
              </Link>
            </div>
          </section>
        )}

        {/* 3. Lavender Purple Section Banner ("New Arrivals") */}
        <HomeProductSection
          title="New Arrivals"
          bannerBg="#d5c6ff"
          bannerTextColor="text-[#396254]"
          shopMoreHref="/new-arrivals"
          shopMoreBg="bg-[#396254]"
          shopMoreTextColor="text-white"
          products={newInProducts}
          showNewBadge={true}
        />

        {/* 4. Lavender Purple Section Banner ("it'smatapanda Bags") */}
        <HomeProductSection
          title="it'smatapanda Bags"
          bannerBg="#d5c6ff"
          bannerTextColor="text-[#396254]"
          shopMoreHref={rawBagProducts.length > 0 ? "/categories/bags-totes" : "/products"}
          shopMoreBg="bg-[#396254]"
          shopMoreTextColor="text-white"
          products={bagProducts}
          showNewBadge={false}
        />

        {/* 5. Lavender Section Banner ("All-Time Favourites") */}
        <HomeProductSection
          title="All-Time Favourites"
          bannerBg="#d5c6ff"
          bannerTextColor="text-[#396254]"
          shopMoreHref={shoulderProducts.length > 0 ? "/categories/shoulder-bags" : "/products"}
          shopMoreBg="bg-[#396254]"
          shopMoreTextColor="text-white"
          products={favouriteProducts}
          showNewBadge={false}
        />

        {/* 5. Community Showcase ("it's matapanda ON YOU") */}
        <CommunityGrid />
      </main>

      {/* 6. Footer: Newsletter Banner + 4-column Links */}
      <Footer />
    </div>
  );
}
