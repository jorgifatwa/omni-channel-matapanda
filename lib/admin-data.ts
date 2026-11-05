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
  /** Uppercase courier code, e.g. "JNE", "JNT", "SICEPAT", "DHL" */
  courier: string;
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

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
