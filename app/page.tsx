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
          shopMoreHref="/categories/bags-totes"
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
          shopMoreHref="/categories/shoulder-bags"
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
