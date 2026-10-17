import AnnouncementBar from "@/components/AnnouncementBar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductGrid from "@/components/ProductGrid";
import { getAllStorefrontProducts } from "@/lib/data-fetcher";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AllProductsPage() {
  const products = await getAllStorefrontProducts();

  return (
    <div className="min-h-dvh flex flex-col bg-[#fafaf8] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans transition-colors duration-200">
      <AnnouncementBar />
      <Navbar />

      <main className="flex-1 w-full">
        <ProductGrid
          title="All Products"
          subtitle={`${products.length} products`}
          description="Eksplorasi seluruh koleksi tas, tote bags, dumpling bags, shoulder bags, ransel, dan aksesoris it's matapanda."
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
