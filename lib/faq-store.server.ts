import { revalidatePath } from "next/cache";
import type { Prisma, FaqItem as FaqItemRow } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { type FaqItem, type FaqCategory, FAQ_CATEGORIES } from "@/lib/faq-data";

export type { FaqItem, FaqCategory };
export { FAQ_CATEGORIES };

/**
 * FAQ store backed purely by PostgreSQL (Prisma). No file cache and no
 * auto-seeding: an empty table yields an empty list, and database errors are
 * thrown so API routes can respond with an error status.
 */

function isUuid(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

function toFaqItem(f: FaqItemRow): FaqItem {
  return {
    id: f.id,
    category: f.category,
    question: f.question,
    answer: f.answer,
    sortOrder: f.sortOrder,
    isActive: f.isActive,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
  };
}

function revalidateFaqPaths() {
  try {
    revalidatePath("/faq");
    revalidatePath("/admin/faqs");
  } catch {}
}

/** All FAQs for the admin panel (optionally filtered). Throws on database error. */
export async function getAllFaqsStore(params?: {
  status?: "active" | "inactive";
  category?: string;
  search?: string;
}): Promise<FaqItem[]> {
  const where: Prisma.FaqItemWhereInput = {};

  if (params?.status === "active") where.isActive = true;
  if (params?.status === "inactive") where.isActive = false;

  if (params?.category && params.category !== "All" && params.category !== "Semua") {
    where.category = { equals: params.category, mode: "insensitive" };
  }

  if (params?.search) {
    where.OR = [
      { question: { contains: params.search, mode: "insensitive" } },
      { answer: { contains: params.search, mode: "insensitive" } },
      { category: { contains: params.search, mode: "insensitive" } },
    ];
  }

  const rows = await prisma.faqItem.findMany({
    where,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  return rows.map(toFaqItem);
}

/** Active FAQs for the public storefront. Throws on database error. */
export async function getActiveFaqsStore(params?: {
  category?: string;
  search?: string;
}): Promise<FaqItem[]> {
  return getAllFaqsStore({
    status: "active",
    category: params?.category,
    search: params?.search,
  });
}

/** Single FAQ by id, or null. Throws on database error. */
export async function getFaqByIdStore(id: string): Promise<FaqItem | null> {
  if (!isUuid(id)) return null;
  const row = await prisma.faqItem.findUnique({ where: { id } });
  return row ? toFaqItem(row) : null;
}

export interface FaqInput {
  category: string;
  question: string;
  answer: string;
  sortOrder?: number;
  isActive?: boolean;
}

function toFaqData(data: FaqInput) {
  return {
    category: data.category.trim(),
    question: data.question.trim(),
    answer: data.answer.trim(),
    sortOrder: Number(data.sortOrder) || 0,
    isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
  };
}

/** Create a FAQ. Throws on database error. */
export async function createFaqStore(data: FaqInput): Promise<FaqItem> {
  const row = await prisma.faqItem.create({ data: toFaqData(data) });
  revalidateFaqPaths();
  return toFaqItem(row);
}

/** Update a FAQ. Returns null when it does not exist. Throws on database error. */
export async function updateFaqStore(id: string, data: FaqInput): Promise<FaqItem | null> {
  if (!isUuid(id)) return null;
  const existing = await prisma.faqItem.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return null;
  const row = await prisma.faqItem.update({ where: { id }, data: toFaqData(data) });
  revalidateFaqPaths();
  return toFaqItem(row);
}

/** Delete a FAQ. Returns false when it does not exist. Throws on database error. */
export async function deleteFaqStore(id: string): Promise<boolean> {
  if (!isUuid(id)) return false;
  const result = await prisma.faqItem.deleteMany({ where: { id } });
  revalidateFaqPaths();
  return result.count > 0;
}
