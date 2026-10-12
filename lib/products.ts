export type CurrencyCode = "IDR" | "USD" | "SGD" | "JPY";

export const CURRENCIES: {
  code: CurrencyCode;
  label: string;
  rateFromIDR: number;
}[] = [
  { code: "IDR", label: "IDR", rateFromIDR: 1 },
  { code: "USD", label: "USD", rateFromIDR: 1 / 15800 },
  { code: "SGD", label: "SGD", rateFromIDR: 1 / 11800 },
  { code: "JPY", label: "JPY", rateFromIDR: 1 / 105 },
];

export type Product = {
  id: string;
  name: string;
  price: string;
  priceNumber: number;
  image: string;
  sizes: string[];
  colors: string[];
  description: string;
  soldOut?: boolean;
};

export const NEW_ARRIVAL_PRODUCTS: Product[] = [
  {
    id: "micro-dumpling-bag",
    name: "Micro Dumpling Bag",
    price: "489.000 IDR",
    priceNumber: 489000,
    image:
      "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=1200&q=85",
    sizes: ["Micro"],
    colors: ["Olive Green", "Cobalt Blue", "Charcoal Black"],
    description: "Tas selempang micro ikonik dengan bahan crinkled nylon tahan air dan tali serut elastis.",
  },
  {
    id: "xs-dumpling-bag",
    name: "XS Dumpling Bag",
    price: "589.000 IDR",
    priceNumber: 589000,
    image:
      "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1200&q=85",
    sizes: ["XS"],
    colors: ["Butter Cream", "Charcoal Black"],
    description: "Ukuran favorit sehari-hari. Ringan, fleksibel, dengan kantong saku dalam dan hook kunci.",
  },
  {
    id: "m-dumpling-bag",
    name: "M Dumpling Bag",
    price: "729.000 IDR",
    priceNumber: 729000,
    image:
      "https://images.unsplash.com/photo-1575032617751-6ddec2089882?auto=format&fit=crop&w=1200&q=85",
    sizes: ["Medium"],
    colors: ["Midnight Navy", "Sage Green"],
    description: "Kapasitas lapang untuk kerja & traveling. Muat laptop 13-14 inch dan perlengkapan harian.",
  },
  {
    id: "everyday-canvas-tote",
    name: "Everyday Canvas Tote Bag",
    price: "389.000 IDR",
    priceNumber: 389000,
    image:
      "https://images.unsplash.com/photo-1597484661643-2f5fef640dd1?auto=format&fit=crop&w=1200&q=85",
    sizes: ["Regular"],
    colors: ["Natural Ecru", "Washed Black"],
    description: "Tas tote kanvas 16oz tebal dengan kompartemen botol minum tegak dan saku laptop empuk.",
  },
  {
    id: "reversible-shopper-tote",
    name: "Reversible Nylon Shopper Tote",
    price: "459.000 IDR",
    priceNumber: 459000,
    image:
      "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1200&q=85",
    sizes: ["One Size"],
    colors: ["Cobalt / Lilac", "Olive / Mustard"],
    description: "Tote bag dua sisi dengan kombinasi warna kontras, bahan ripstop nylon ultra-ringan.",
  },
  {
    id: "puffer-cloud-shoulder-bag",
    name: "Puffer Cloud Shoulder Bag",
    price: "549.000 IDR",
    priceNumber: 549000,
    image:
      "https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&w=1200&q=85",
    sizes: ["Medium"],
    colors: ["Cloud White", "Jet Black"],
    description: "Tas bahu empuk bertekstur quilted awan yang sangat lembut dan nyaman dipakai.",
  },
  {
    id: "mini-crescent-sling-bag",
    name: "Mini Crescent Sling Bag",
    price: "429.000 IDR",
    priceNumber: 429000,
    image:
      "https://images.unsplash.com/photo-1575032617751-6ddec2089882?auto=format&fit=crop&w=1200&q=85",
    sizes: ["Mini"],
    colors: ["Matcha Green", "Terracotta"],
    description: "Siluet bulan sabit ergonomis yang mengikuti bentuk tubuh. Praktis dan fit untuk daily commute.",
  },
  {
    id: "city-explorer-backpack",
    name: "City Explorer Backpack",
    price: "859.000 IDR",
    priceNumber: 859000,
    image:
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1200&q=85",
    sizes: ["22L"],
    colors: ["Matte Black", "Deep Olive"],
    description: "Ransel modern dengan kompartemen laptop 16 inch terpisah dan bahan waterproof coated nylon.",
  },
];

export function getProductById(id: string): Product | undefined {
  return NEW_ARRIVAL_PRODUCTS.find((p) => p.id === id);
}

export function formatIDR(amount: number): string {
  return `${amount.toLocaleString("id-ID")} IDR`;
}

export function formatPriceByCurrency(
  amountInIDR: number,
  currency: CurrencyCode
): string {
  switch (currency) {
    case "USD": {
      const converted = amountInIDR / 15800;
      return `$${converted.toFixed(2)} USD`;
    }
    case "SGD": {
      const converted = amountInIDR / 11800;
      return `S$${converted.toFixed(2)} SGD`;
    }
    case "JPY": {
      const converted = Math.round(amountInIDR / 105);
      return `¥${converted.toLocaleString("en-US")} JPY`;
    }
    case "IDR":
    default:
      return `${amountInIDR.toLocaleString("id-ID")} IDR`;
  }
}
