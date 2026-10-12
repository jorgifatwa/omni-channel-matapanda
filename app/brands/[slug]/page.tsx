import { notFound } from "next/navigation";
import AnnouncementBar from "@/components/AnnouncementBar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductGrid from "@/components/ProductGrid";
import { getProductsByBrandSlug } from "@/lib/data-fetcher";

export const dynamic = "force-dynamic";

export default async function BrandDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const { brand, products } = await getProductsByBrandSlug(params.slug);

  if (!brand) {
    notFound();
  }

  return (
    <div className="min-h-dvh flex flex-col bg-[#fafaf8] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans transition-colors duration-200">
      <AnnouncementBar />
      <Navbar />

      <main className="flex-1 w-full">
        <ProductGrid
          title={brand.name}
          subtitle={`${products.length} products`}
          logoUrl={brand.logoUrl}
          products={products}
          itemsPerPage={12}
        />
      </main>

      <Footer />
    </div>
  );
}
