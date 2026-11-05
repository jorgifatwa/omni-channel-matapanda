export interface FaqItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  sortOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const FAQ_CATEGORIES = [
  "Most Asked",
  "Delivery",
  "Orders",
  "Returns",
  "Product & Care",
  "The Panda Club",
  "Promotions & Payments",
  "Store & Contact",
] as const;

export type FaqCategory = (typeof FAQ_CATEGORIES)[number];
