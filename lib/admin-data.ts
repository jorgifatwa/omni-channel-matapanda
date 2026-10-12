export type AdminBrand = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string;
  productCount: number;
  isActive: boolean;
  createdAt: string;
};

export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  parentName: string | null;
  productCount: number;
  isActive: boolean;
  createdAt: string;
};

export type AdminProductVariant = {
  id: string;
  size: string;
  color: string;
  colorGroup?: string | null;
  colorHex?: string | null;
  image?: string | null;
  stock: number;
  lowStockThreshold?: number;
  sku: string;
};

export type AdminProductSeries = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  productCount?: number;
  isActive?: boolean;
  createdAt?: string;
};

export type AdminProduct = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description: string;
  brandId: string;
  brandName: string;
  categoryId: string;
  categoryName: string;
  price: number;
  discountPrice: number | null;
  stock: number;
  lowStockThreshold?: number;
  weightGrams?: number;
  dimensions?: string | null;
  capacityNote?: string | null;
  productSeriesId?: string | null;
  productSeriesName?: string | null;
  isNewArrival?: boolean;
  isActive: boolean;
  images: string[];
  variants: AdminProductVariant[];
  createdAt: string;
};

export type AdminOrderItem = {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  image: string;
  size: string;
  color: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
};

export type AdminOrder = {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: {
    recipient: string;
    phone: string;
    street: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
  };
  subtotal: number;
  shippingCost: number;
  discountAmount: number;
  totalAmount: number;
  paymentMethod: string;
  midtransTransactionId: string;
  paymentStatus: "PENDING" | "SETTLEMENT" | "EXPIRE" | "CANCEL";
  orderStatus: "PENDING" | "PAID" | "SHIPPED" | "COMPLETED" | "CANCELLED";
  shipmentStatus:
    | "PENDING"
    | "PICKED_UP"
    | "IN_TRANSIT"
    | "OUT_FOR_DELIVERY"
    | "DELIVERED";
  courier: "JNE" | "DHL";
  courierService: string;
  trackingNumber: string;
  items: AdminOrderItem[];
  trackingHistory: {
    timestamp: string;
    status: string;
    description: string;
    location: string;
  }[];
  createdAt: string;
};

export type AdminCustomer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  totalOrders: number;
  totalSpent: number;
  registeredAt: string;
};

export const INITIAL_BRANDS: AdminBrand[] = [
  {
    id: "b1a8f701-1111-4111-8111-000000000001",
    name: "it'smatapanda",
    slug: "itsmatapanda",
    logoUrl: "/matapanda-logo.png",
    productCount: 8,
    isActive: true,
    createdAt: "2026-01-15",
  },
];

export const INITIAL_CATEGORIES: AdminCategory[] = [
  {
    id: "c2b9e802-2222-4222-8222-000000000001",
    name: "Tote Bags",
    slug: "tote-bags",
    parentId: null,
    parentName: null,
    productCount: 2,
    isActive: true,
    createdAt: "2026-01-10",
  },
  {
    id: "c2b9e802-2222-4222-8222-000000000002",
    name: "Sling & Crossbody",
    slug: "sling-crossbody",
    parentId: null,
    parentName: null,
    productCount: 4,
    isActive: true,
    createdAt: "2026-01-12",
  },
  {
    id: "c2b9e802-2222-4222-8222-000000000003",
    name: "Shoulder Bags",
    slug: "shoulder-bags",
    parentId: null,
    parentName: null,
    productCount: 1,
    isActive: true,
    createdAt: "2026-01-14",
  },
  {
    id: "c2b9e802-2222-4222-8222-000000000004",
    name: "Backpacks",
    slug: "backpacks",
    parentId: null,
    parentName: null,
    productCount: 1,
    isActive: true,
    createdAt: "2026-01-20",
  },
  {
    id: "c2b9e802-2222-4222-8222-000000000005",
    name: "Pouches & Small Goods",
    slug: "pouches-small-goods",
    parentId: null,
    parentName: null,
    productCount: 1,
    isActive: true,
    createdAt: "2026-01-21",
  },
];

export const INITIAL_SERIES: AdminProductSeries[] = [
  {
    id: "series-dumpling-line",
    name: "Dumpling Series",
    slug: "dumpling-series",
    description: "Koleksi tas dumpling ikonik dengan bahan nylon tahan air dan siluet gathered pouch khas it'smatapanda.",
    productCount: 3,
    isActive: true,
    createdAt: "2026-02-01",
  },
  {
    id: "series-canvas-carryall",
    name: "Canvas Carryall Series",
    slug: "canvas-carryall-series",
    description: "Koleksi tas tote kanvas premium dengan struktur kokoh dan kapasitas muatan besar.",
    productCount: 1,
    isActive: true,
    createdAt: "2026-02-01",
  },
];

export const INITIAL_PRODUCTS: AdminProduct[] = [
  {
    id: "micro-dumpling-bag",
    name: "Micro Dumpling Bag",
    slug: "micro-dumpling-bag",
    sku: "IMP-DUMP-MIC",
    description: "Tas selempang micro ikonik dengan bahan crinkled nylon tahan air, penutup elastis gathered cord, dan strap yang dapat disesuaikan.",
    brandId: "b1a8f701-1111-4111-8111-000000000001",
    brandName: "it'smatapanda",
    categoryId: "c2b9e802-2222-4222-8222-000000000002",
    categoryName: "Sling & Crossbody",
    productSeriesId: "series-dumpling-line",
    productSeriesName: "Dumpling Series",
    dimensions: "H14 x W16 x D10 cm",
    weightGrams: 140,
    capacityNote: "Muat smartphone, cardholder, kunci, dan lipstik",
    price: 489000,
    discountPrice: null,
    stock: 45,
    lowStockThreshold: 5,
    isNewArrival: true,
    isActive: true,
    images: [
      "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?auto=format&fit=crop&w=1200&q=85",
    ],
    variants: [
      { id: "v-dmic-1", size: "Micro", color: "Olive Green", colorGroup: "Seasonal", colorHex: "#556B2F", image: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=1200&q=85", stock: 12, sku: "IMP-DUMP-MIC-OLV", lowStockThreshold: 5 },
      { id: "v-dmic-2", size: "Micro", color: "Cobalt Blue", colorGroup: "Signature", colorHex: "#002FA7", image: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1200&q=85", stock: 15, sku: "IMP-DUMP-MIC-BLU", lowStockThreshold: 5 },
      { id: "v-dmic-3", size: "Micro", color: "Charcoal Black", colorGroup: "Classic", colorHex: "#1C1C1C", image: "https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?auto=format&fit=crop&w=1200&q=85", stock: 18, sku: "IMP-DUMP-MIC-BLK", lowStockThreshold: 5 },
    ],
    createdAt: "2026-09-01",
  },
  {
    id: "xs-dumpling-bag",
    name: "XS Dumpling Bag",
    slug: "xs-dumpling-bag",
    sku: "IMP-DUMP-XS",
    description: "Ukuran favorit sehari-hari. Ringan, fleksibel, dengan kantong saku dalam dan hook kunci fungsional.",
    brandId: "b1a8f701-1111-4111-8111-000000000001",
    brandName: "it'smatapanda",
    categoryId: "c2b9e802-2222-4222-8222-000000000002",
    categoryName: "Sling & Crossbody",
    productSeriesId: "series-dumpling-line",
    productSeriesName: "Dumpling Series",
    dimensions: "H20 x W24 x D12 cm",
    weightGrams: 210,
    capacityNote: "Muat dompet panjang, iPad mini, botol minum 500ml",
    price: 589000,
    discountPrice: null,
    stock: 38,
    lowStockThreshold: 5,
    isNewArrival: true,
    isActive: true,
    images: [
      "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1200&q=85",
    ],
    variants: [
      { id: "v-dxs-1", size: "XS", color: "Butter Cream", colorGroup: "Pastel", colorHex: "#FFFDD0", image: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1200&q=85", stock: 14, sku: "IMP-DUMP-XS-CRM", lowStockThreshold: 5 },
      { id: "v-dxs-2", size: "XS", color: "Charcoal Black", colorGroup: "Classic", colorHex: "#1C1C1C", image: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=1200&q=85", stock: 24, sku: "IMP-DUMP-XS-BLK", lowStockThreshold: 5 },
    ],
    createdAt: "2026-09-02",
  },
  {
    id: "m-dumpling-bag",
    name: "M Dumpling Bag",
    slug: "m-dumpling-bag",
    sku: "IMP-DUMP-M",
    description: "Kapasitas lapang untuk kerja & traveling. Muat laptop 13-14 inch, payung lipat, dan perlengkapan harian.",
    brandId: "b1a8f701-1111-4111-8111-000000000001",
    brandName: "it'smatapanda",
    categoryId: "c2b9e802-2222-4222-8222-000000000002",
    categoryName: "Sling & Crossbody",
    productSeriesId: "series-dumpling-line",
    productSeriesName: "Dumpling Series",
    dimensions: "H32 x W38 x D15 cm",
    weightGrams: 320,
    capacityNote: "Muat laptop 13-14 inch, botol minum 1L, payung, buku",
    price: 729000,
    discountPrice: 659000,
    stock: 26,
    lowStockThreshold: 5,
    isNewArrival: true,
    isActive: true,
    images: [
      "https://images.unsplash.com/photo-1575032617751-6ddec2089882?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1200&q=85",
    ],
    variants: [
      { id: "v-dm-1", size: "M", color: "Midnight Navy", colorGroup: "Classic", colorHex: "#191970", image: "https://images.unsplash.com/photo-1575032617751-6ddec2089882?auto=format&fit=crop&w=1200&q=85", stock: 16, sku: "IMP-DUMP-M-NVY", lowStockThreshold: 5 },
      { id: "v-dm-2", size: "M", color: "Sage Green", colorGroup: "Seasonal", colorHex: "#87A96B", image: "https://images.unsplash.com/photo-1575032617751-6ddec2089882?auto=format&fit=crop&w=1200&q=85", stock: 10, sku: "IMP-DUMP-M-SGE", lowStockThreshold: 5 },
    ],
    createdAt: "2026-09-03",
  },
  {
    id: "everyday-canvas-tote",
    name: "Everyday Canvas Tote Bag",
    slug: "everyday-canvas-tote",
    sku: "IMP-TOTE-CANV",
    description: "Tas tote kanvas 16oz tebal dengan kompartemen botol minum tegak, saku laptop empuk, dan saku ritsleting rahasia.",
    brandId: "b1a8f701-1111-4111-8111-000000000001",
    brandName: "it'smatapanda",
    categoryId: "c2b9e802-2222-4222-8222-000000000001",
    categoryName: "Tote Bags",
    productSeriesId: "series-canvas-carryall",
    productSeriesName: "Canvas Carryall Series",
    dimensions: "H38 x W42 x D12 cm",
    weightGrams: 420,
    capacityNote: "Muat laptop hingga 15.6 inch, map berkas A4, buku",
    price: 389000,
    discountPrice: null,
    stock: 35,
    lowStockThreshold: 5,
    isNewArrival: true,
    isActive: true,
    images: [
      "https://images.unsplash.com/photo-1597484661643-2f5fef640dd1?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?auto=format&fit=crop&w=1200&q=85",
    ],
    variants: [
      { id: "v-tote-1", size: "Regular", color: "Natural Ecru", colorGroup: "Classic", colorHex: "#F5F5DC", image: "https://images.unsplash.com/photo-1597484661643-2f5fef640dd1?auto=format&fit=crop&w=1200&q=85", stock: 20, sku: "IMP-TOTE-ECR", lowStockThreshold: 5 },
      { id: "v-tote-2", size: "Regular", color: "Washed Black", colorGroup: "Classic", colorHex: "#222222", image: "https://images.unsplash.com/photo-1597484661643-2f5fef640dd1?auto=format&fit=crop&w=1200&q=85", stock: 15, sku: "IMP-TOTE-BLK", lowStockThreshold: 5 },
    ],
    createdAt: "2026-09-04",
  },
  {
    id: "reversible-shopper-tote",
    name: "Reversible Nylon Shopper Tote",
    slug: "reversible-shopper-tote",
    sku: "IMP-TOTE-REV",
    description: "Tote bag dua sisi dengan kombinasi warna kontras, bahan ripstop nylon ultra-ringan yang dapat dilipat jadi kantong kecil.",
    brandId: "b1a8f701-1111-4111-8111-000000000001",
    brandName: "it'smatapanda",
    categoryId: "c2b9e802-2222-4222-8222-000000000001",
    categoryName: "Tote Bags",
    dimensions: "H40 x W44 x D14 cm",
    weightGrams: 160,
    capacityNote: "Kapasitas muatan hingga 12kg",
    price: 459000,
    discountPrice: null,
    stock: 28,
    lowStockThreshold: 5,
    isNewArrival: true,
    isActive: true,
    images: [
      "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1575032617751-6ddec2089882?auto=format&fit=crop&w=1200&q=85",
    ],
    variants: [
      { id: "v-rev-1", size: "One Size", color: "Cobalt / Lilac", colorGroup: "Duo Tone", colorHex: "#002FA7", image: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1200&q=85", stock: 18, sku: "IMP-REV-CBLT", lowStockThreshold: 5 },
    ],
    createdAt: "2026-09-05",
  },
  {
    id: "puffer-cloud-shoulder-bag",
    name: "Puffer Cloud Shoulder Bag",
    slug: "puffer-cloud-shoulder-bag",
    sku: "IMP-SHLD-PUF",
    description: "Tas bahu empuk bertekstur quilted awan yang sangat lembut dan nyaman dipakai sepanjang hari.",
    brandId: "b1a8f701-1111-4111-8111-000000000001",
    brandName: "it'smatapanda",
    categoryId: "c2b9e802-2222-4222-8222-000000000003",
    categoryName: "Shoulder Bags",
    dimensions: "H22 x W30 x D10 cm",
    weightGrams: 230,
    capacityNote: "Muat iPad, makeup pouch, dompet, kacamata",
    price: 549000,
    discountPrice: null,
    stock: 22,
    lowStockThreshold: 5,
    isNewArrival: true,
    isActive: true,
    images: [
      "https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1200&q=85",
    ],
    variants: [
      { id: "v-puf-1", size: "Medium", color: "Cloud White", colorGroup: "Pastel", colorHex: "#FFFFFF", image: "https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&w=1200&q=85", stock: 12, sku: "IMP-PUF-WHT", lowStockThreshold: 5 },
      { id: "v-puf-2", size: "Medium", color: "Jet Black", colorGroup: "Classic", colorHex: "#000000", image: "https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&w=1200&q=85", stock: 10, sku: "IMP-PUF-BLK", lowStockThreshold: 5 },
    ],
    createdAt: "2026-09-06",
  },
  {
    id: "mini-crescent-sling-bag",
    name: "Mini Crescent Sling Bag",
    slug: "mini-crescent-sling-bag",
    sku: "IMP-SLNG-CRES",
    description: "Siluet bulan sabit ergonomis yang mengikuti bentuk tubuh. Praktis dan fit untuk daily commute.",
    brandId: "b1a8f701-1111-4111-8111-000000000001",
    brandName: "it'smatapanda",
    categoryId: "c2b9e802-2222-4222-8222-000000000002",
    categoryName: "Sling & Crossbody",
    dimensions: "H16 x W28 x D8 cm",
    weightGrams: 180,
    capacityNote: "Muat smartphone, dompet, kunci, sanitizer",
    price: 429000,
    discountPrice: null,
    stock: 30,
    lowStockThreshold: 5,
    isNewArrival: true,
    isActive: true,
    images: [
      "https://images.unsplash.com/photo-1575032617751-6ddec2089882?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1200&q=85",
    ],
    variants: [
      { id: "v-cres-1", size: "Mini", color: "Matcha Green", colorGroup: "Seasonal", colorHex: "#78866B", image: "https://images.unsplash.com/photo-1575032617751-6ddec2089882?auto=format&fit=crop&w=1200&q=85", stock: 15, sku: "IMP-CRES-MTC", lowStockThreshold: 5 },
      { id: "v-cres-2", size: "Mini", color: "Terracotta", colorGroup: "Earth", colorHex: "#E2725B", image: "https://images.unsplash.com/photo-1575032617751-6ddec2089882?auto=format&fit=crop&w=1200&q=85", stock: 15, sku: "IMP-CRES-TER", lowStockThreshold: 5 },
    ],
    createdAt: "2026-09-07",
  },
  {
    id: "city-explorer-backpack",
    name: "City Explorer Backpack",
    slug: "city-explorer-backpack",
    sku: "IMP-BKPK-EXP",
    description: "Ransel modern dengan kompartemen laptop 16 inch terpisah, strap pundak ergonomis busa berpori, dan bahan waterproof coated nylon.",
    brandId: "b1a8f701-1111-4111-8111-000000000001",
    brandName: "it'smatapanda",
    categoryId: "c2b9e802-2222-4222-8222-000000000004",
    categoryName: "Backpacks",
    dimensions: "H44 x W32 x D16 cm",
    weightGrams: 680,
    capacityNote: "Kapasitas 22 Liter, muat laptop 16 inch",
    price: 859000,
    discountPrice: null,
    stock: 20,
    lowStockThreshold: 5,
    isNewArrival: true,
    isActive: true,
    images: [
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1200&q=85",
    ],
    variants: [
      { id: "v-bkpk-1", size: "22L", color: "Matte Black", colorGroup: "Classic", colorHex: "#111111", image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1200&q=85", stock: 12, sku: "IMP-BKPK-BLK", lowStockThreshold: 5 },
      { id: "v-bkpk-2", size: "22L", color: "Deep Olive", colorGroup: "Seasonal", colorHex: "#4B5320", image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1200&q=85", stock: 8, sku: "IMP-BKPK-OLV", lowStockThreshold: 5 },
    ],
    createdAt: "2026-09-08",
  },
  {
    id: "boxy-utility-mini-pouch",
    name: "Boxy Utility Mini Pouch",
    slug: "boxy-utility-mini-pouch",
    sku: "IMP-PCH-BOX",
    description: "Pouch mini multifungsi untuk charger, TWS earphone, kunci, dan koin. Dilengkapi karabiner pengait ke tas utama.",
    brandId: "b1a8f701-1111-4111-8111-000000000001",
    brandName: "it'smatapanda",
    categoryId: "c2b9e802-2222-4222-8222-000000000005",
    categoryName: "Pouches & Small Goods",
    dimensions: "H10 x W14 x D6 cm",
    weightGrams: 85,
    capacityNote: "Muat TWS, kabel data, flashdisk, kartu",
    price: 199000,
    discountPrice: null,
    stock: 50,
    lowStockThreshold: 10,
    isNewArrival: false,
    isActive: true,
    images: [
      "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1575032617751-6ddec2089882?auto=format&fit=crop&w=1200&q=85",
    ],
    variants: [
      { id: "v-pch-1", size: "One Size", color: "Signal Orange", colorGroup: "Pop", colorHex: "#FF5F1F", image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1200&q=85", stock: 25, sku: "IMP-PCH-ORG", lowStockThreshold: 5 },
      { id: "v-pch-2", size: "One Size", color: "Stealth Black", colorGroup: "Classic", colorHex: "#111111", image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1200&q=85", stock: 25, sku: "IMP-PCH-BLK", lowStockThreshold: 5 },
    ],
    createdAt: "2026-09-09",
  },
];

export const INITIAL_CUSTOMERS: AdminCustomer[] = [
  {
    id: "u4d1a004-4444-4444-8444-000000000001",
    name: "Raya Putra",
    email: "raya.putra@gmail.com",
    phone: "+62 811-8889-900",
    city: "Jakarta Selatan",
    country: "Indonesia",
    totalOrders: 4,
    totalSpent: 3427000,
    registeredAt: "2026-03-14",
  },
  {
    id: "u4d1a004-4444-4444-8444-000000000002",
    name: "Nadia Kusuma",
    email: "nadia.kusuma@yahoo.com",
    phone: "+62 812-3456-7890",
    city: "Bandung",
    country: "Indonesia",
    totalOrders: 3,
    totalSpent: 2150000,
    registeredAt: "2026-04-22",
  },
  {
    id: "u4d1a004-4444-4444-8444-000000000003",
    name: "Kenji Takahashi",
    email: "kenji.t@tokyo-studio.jp",
    phone: "+81 90-4421-8891",
    city: "Tokyo",
    country: "Japan",
    totalOrders: 2,
    totalSpent: 2890000,
    registeredAt: "2026-06-05",
  },
  {
    id: "u4d1a004-4444-4444-8444-000000000004",
    name: "Marcus Lim",
    email: "marcus.lim@singnet.com.sg",
    phone: "+65 9123-4567",
    city: "Singapore",
    country: "Singapore",
    totalOrders: 2,
    totalSpent: 1980000,
    registeredAt: "2026-07-19",
  },
  {
    id: "u4d1a004-4444-4444-8444-000000000005",
    name: "Dimas Pratama",
    email: "dimas.pratama@outlook.com",
    phone: "+62 813-9988-7766",
    city: "Surabaya",
    country: "Indonesia",
    totalOrders: 1,
    totalSpent: 525000,
    registeredAt: "2026-08-30",
  },
];

export const INITIAL_ORDERS: AdminOrder[] = [
  {
    id: "o5e2b105-5555-4555-8555-000000000001",
    orderNumber: "IMP-20260929-001",
    customerId: "u4d1a004-4444-4444-8444-000000000001",
    customerName: "Raya Putra",
    customerEmail: "raya.putra@gmail.com",
    customerPhone: "+62 811-8889-900",
    shippingAddress: {
      recipient: "Raya Putra",
      phone: "+62 811-8889-900",
      street: "Jl. Senopati No. 64, Kebayoran Baru",
      city: "Jakarta Selatan",
      province: "Jakarta",
      postalCode: "12190",
      country: "Indonesia",
    },
    subtotal: 978000,
    shippingCost: 15000,
    discountAmount: 0,
    totalAmount: 993000,
    paymentMethod: "Midtrans BCA VA",
    midtransTransactionId: "MT-TRX-992817261",
    paymentStatus: "SETTLEMENT",
    orderStatus: "SHIPPED",
    shipmentStatus: "IN_TRANSIT",
    courier: "JNE",
    courierService: "JNE REG",
    trackingNumber: "JNE009823718291",
    items: [
      {
        id: "oi-1",
        productId: "micro-dumpling-bag",
        productName: "Micro Dumpling Bag",
        sku: "IMP-DUMP-MIC-OLV",
        image: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=400&q=80",
        size: "Micro",
        color: "Olive Green",
        unitPrice: 489000,
        quantity: 2,
        subtotal: 978000,
      },
    ],
    trackingHistory: [
      {
        timestamp: "2026-09-29 09:15",
        status: "PICKED_UP",
        description: "Shipment picked up by JNE courier at Senopati Drop Point",
        location: "Jakarta Selatan",
      },
      {
        timestamp: "2026-09-29 11:30",
        status: "IN_TRANSIT",
        description: "Processed at JNE Sorting Hub Tomang",
        location: "Jakarta Barat",
      },
    ],
    createdAt: "2026-09-29",
  },
];

export const SALES_30_DAYS_DATA = Array.from({ length: 30 }, (_, idx) => {
  const day = idx + 1;
  const dateLabel = `Sep ${String(day).padStart(2, "0")}`;
  const wave = Math.sin(idx * 0.45) * 1200000 + Math.cos(idx * 0.2) * 800000;
  const revenue = Math.max(
    650000,
    Math.round((2400000 + wave + (idx % 5) * 350000) / 10000) * 10000
  );
  const orders = Math.max(1, Math.round(revenue / 520000));
  return {
    date: dateLabel,
    revenue,
    orders,
  };
});

export const TOP_SELLING_PRODUCTS = [
  {
    id: "micro-dumpling-bag",
    name: "Micro Dumpling Bag",
    sku: "IMP-DUMP-MIC",
    sold: 84,
    revenue: 41076000,
  },
  {
    id: "xs-dumpling-bag",
    name: "XS Dumpling Bag",
    sku: "IMP-DUMP-XS",
    sold: 62,
    revenue: 36518000,
  },
  {
    id: "everyday-canvas-tote",
    name: "Everyday Canvas Tote Bag",
    sku: "IMP-TOTE-CANV",
    sold: 55,
    revenue: 21395000,
  },
  {
    id: "puffer-cloud-shoulder-bag",
    name: "Puffer Cloud Shoulder Bag",
    sku: "IMP-SHLD-PUF",
    sold: 40,
    revenue: 21960000,
  },
];

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
