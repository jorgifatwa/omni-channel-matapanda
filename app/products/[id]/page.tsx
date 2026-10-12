import { notFound } from "next/navigation";
import AnnouncementBar from "@/components/AnnouncementBar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductDetailView from "@/components/ProductDetailView";
import {
  getProductBySlugOrId,
  getProductsByCategorySlug,
  getNewArrivalProducts,
} from "@/lib/data-fetcher";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const product = await getProductBySlugOrId(params.id);

  if (!product) {
    notFound();
  }

  // Fetch recommendations for "You May Also Like" from database
  let relatedProducts: typeof product[] = [];
  try {
    const { products: catProducts } = await getProductsByCategorySlug(
      product.category.slug
    );
    relatedProducts = catProducts.filter((p) => p.id !== product.id);

    if (relatedProducts.length < 4) {
      const newInProducts = await getNewArrivalProducts();
      const existingIds = new Set(relatedProducts.map((p) => p.id));
      existingIds.add(product.id);
      const additional = newInProducts.filter((p) => !existingIds.has(p.id));
      relatedProducts = [...relatedProducts, ...additional];
    }
  } catch (err) {
    console.warn("Could not fetch related products:", err);
  }

  return (
    <div className="min-h-dvh flex flex-col bg-[#fafaf8] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans transition-colors duration-200">
      <AnnouncementBar />
      <Navbar />
      <main className="flex-1 w-full">
        <ProductDetailView
          product={product}
          relatedProducts={relatedProducts.slice(0, 8)}
        />
      </main>
      <Footer />
    </div>
  );
}
