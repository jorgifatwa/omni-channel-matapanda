import AnnouncementBar from "@/components/AnnouncementBar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductGrid from "@/components/ProductGrid";
import { getNewArrivalProducts } from "@/lib/data-fetcher";

export const dynamic = "force-dynamic";

export default async function NewArrivalsPage() {
  const products = await getNewArrivalProducts();

  return (
    <div className="min-h-dvh flex flex-col bg-[#fafaf8] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans transition-colors duration-200">
      <AnnouncementBar />
      <Navbar />

      <main className="flex-1 w-full">
        <ProductGrid
          title="New Arrivals"
          subtitle={`${products.length} products`}
          products={products}
          itemsPerPage={18}
          showCampaignTiles={true}
          showNewBadge={true}
        />
      </main>

      <Footer />
    </div>
  );
}
