import { notFound } from "next/navigation";
import AnnouncementBar from "@/components/AnnouncementBar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductGrid from "@/components/ProductGrid";
import { getProductsByCategorySlug } from "@/lib/data-fetcher";

export const dynamic = "force-dynamic";

export default async function CategoryDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const { category, products } = await getProductsByCategorySlug(params.slug);

  if (!category) {
    notFound();
  }

  return (
    <div className="min-h-dvh flex flex-col bg-[#fafaf8] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans transition-colors duration-200">
      <AnnouncementBar />
      <Navbar />

      <main className="flex-1 w-full">
        <ProductGrid
          title={category.name}
          subtitle={`${products.length} products`}
          description={
            category.parentName
              ? `Subkategori dari ${category.parentName}`
              : undefined
          }
          products={products}
          itemsPerPage={12}
        />
      </main>

      <Footer />
    </div>
  );
}
