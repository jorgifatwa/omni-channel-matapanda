import fs from "fs";
import path from "path";
import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  INITIAL_FAQS,
  type FaqItem,
  type FaqCategory,
  FAQ_CATEGORIES,
} from "@/lib/faq-data";

export type { FaqItem, FaqCategory };
export { INITIAL_FAQS, FAQ_CATEGORIES };

const DATA_DIR = path.join(process.cwd(), "data");
const FAQS_FILE = path.join(DATA_DIR, "faqs.json");

function isUuid(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

function ensureDataDir(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn("[faq-store.server] Could not create data dir:", err);
  }
}

function normalizeFaq(faq: FaqItem): FaqItem {
  if (isUuid(faq.id)) return faq;
  return {
    ...faq,
    id: crypto.randomUUID(),
  };
}

export function readFaqsFromFile(): FaqItem[] {
  ensureDataDir();
  try {
    if (fs.existsSync(FAQS_FILE)) {
      const raw = fs.readFileSync(FAQS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("[faq-store.server] Error reading faqs.json:", err);
  }

  const initialWithUuids = INITIAL_FAQS.map((f) => normalizeFaq(f));
  writeFaqsToFile(initialWithUuids);
  return initialWithUuids;
}

export function writeFaqsToFile(faqs: FaqItem[]): void {
  ensureDataDir();
  try {
    fs.writeFileSync(FAQS_FILE, JSON.stringify(faqs, null, 2), "utf-8");
  } catch (err) {
    console.warn("[faq-store.server] Error writing faqs.json:", err);
  }
}

/**
 * Get all FAQs for Admin API with DB + File dual persistence
 */
export async function getAllFaqsStore(params?: {
  status?: "active" | "inactive";
  category?: string;
  search?: string;
}): Promise<{
  faqs: FaqItem[];
  source: "database" | "file-cache";
}> {
  try {
    const whereClause: {
      isActive?: boolean;
      category?: string;
      OR?: Array<{
        question?: { contains: string; mode: "insensitive" };
        answer?: { contains: string; mode: "insensitive" };
      }>;
    } = {};

    if (params?.status === "active") whereClause.isActive = true;
    if (params?.status === "inactive") whereClause.isActive = false;

    if (params?.category && params.category !== "All" && params.category !== "Semua") {
      whereClause.category = params.category;
    }

    if (params?.search) {
      whereClause.OR = [
        { question: { contains: params.search, mode: "insensitive" } },
        { answer: { contains: params.search, mode: "insensitive" } },
      ];
    }

    const dbItems = await prisma.faqItem.findMany({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    if (dbItems && dbItems.length > 0) {
      const formatted: FaqItem[] = dbItems.map((f) => ({
        id: f.id,
        category: f.category,
        question: f.question,
        answer: f.answer,
        sortOrder: f.sortOrder,
        isActive: f.isActive,
        createdAt: f.createdAt.toISOString(),
        updatedAt: f.updatedAt.toISOString(),
      }));

      if (!params?.status && !params?.category && !params?.search) {
        writeFaqsToFile(formatted);
      }

      return { faqs: formatted, source: "database" };
    }

    // Auto-seed if empty
    const seededList = readFaqsFromFile();
    try {
      for (const item of seededList) {
        await prisma.faqItem.create({
          data: {
            id: isUuid(item.id) ? item.id : undefined,
            category: item.category,
            question: item.question,
            answer: item.answer,
            sortOrder: item.sortOrder,
            isActive: item.isActive,
          },
        });
      }
    } catch (seedErr) {
      console.warn("[faq-store.server] Auto-seed DB failed:", seedErr);
    }
  } catch (dbError) {
    console.warn("[faq-store.server] Database unavailable, reading file cache:", dbError);
  }

  let fileFaqs = readFaqsFromFile();
  if (params?.status === "active") {
    fileFaqs = fileFaqs.filter((f) => f.isActive);
  } else if (params?.status === "inactive") {
    fileFaqs = fileFaqs.filter((f) => !f.isActive);
  }

  if (params?.category && params.category !== "All" && params.category !== "Semua") {
    fileFaqs = fileFaqs.filter((f) => f.category.toLowerCase() === params.category!.toLowerCase());
  }

  if (params?.search) {
    const s = params.search.toLowerCase();
    fileFaqs = fileFaqs.filter(
      (f) =>
        f.question.toLowerCase().includes(s) ||
        f.answer.toLowerCase().includes(s) ||
        f.category.toLowerCase().includes(s)
    );
  }

  return { faqs: fileFaqs, source: "file-cache" };
}

/**
 * Get active FAQs for Public Storefront
 */
export async function getActiveFaqsStore(params?: {
  category?: string;
  search?: string;
}): Promise<{
  faqs: FaqItem[];
  source: "database" | "file-cache";
}> {
  return getAllFaqsStore({
    status: "active",
    category: params?.category,
    search: params?.search,
  });
}

/**
 * Save FAQ (create / update) with DB + file dual persistence
 */
export async function saveFaqStore(data: {
  id?: string;
  category: string;
  question: string;
  answer: string;
  sortOrder?: number;
  isActive?: boolean;
}): Promise<FaqItem> {
  const currentFaqs = readFaqsFromFile();
  const id = data.id && isUuid(data.id) ? data.id : crypto.randomUUID();
  const now = new Date().toISOString();

  const newOrUpdated: FaqItem = {
    id,
    category: data.category.trim(),
    question: data.question.trim(),
    answer: data.answer.trim(),
    sortOrder: Number(data.sortOrder) || 0,
    isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
    createdAt: now,
    updatedAt: now,
  };

  // 1. File cache
  const existingIdx = currentFaqs.findIndex((f) => f.id === (data.id || id));
  let updatedList: FaqItem[];
  if (existingIdx >= 0) {
    newOrUpdated.createdAt = currentFaqs[existingIdx].createdAt || now;
    updatedList = [...currentFaqs];
    updatedList[existingIdx] = newOrUpdated;
  } else {
    updatedList = [...currentFaqs, newOrUpdated];
  }
  writeFaqsToFile(updatedList);

  // 2. Sync to PostgreSQL
  try {
    await prisma.faqItem.upsert({
      where: { id },
      create: {
        id,
        category: newOrUpdated.category,
        question: newOrUpdated.question,
        answer: newOrUpdated.answer,
        sortOrder: newOrUpdated.sortOrder,
        isActive: newOrUpdated.isActive,
      },
      update: {
        category: newOrUpdated.category,
        question: newOrUpdated.question,
        answer: newOrUpdated.answer,
        sortOrder: newOrUpdated.sortOrder,
        isActive: newOrUpdated.isActive,
      },
    });
  } catch (err) {
    console.warn("[faq-store.server] PostgreSQL sync skipped:", err);
  }

  // 3. Invalidate paths
  try {
    revalidatePath("/faq");
    revalidatePath("/admin/faqs");
  } catch {}

  return newOrUpdated;
}

/**
 * Delete FAQ
 */
export async function deleteFaqStore(id: string): Promise<boolean> {
  const currentFaqs = readFaqsFromFile();
  const updatedList = currentFaqs.filter((f) => f.id !== id);
  writeFaqsToFile(updatedList);

  try {
    if (isUuid(id)) {
      await prisma.faqItem.delete({ where: { id } }).catch(() => {});
    } else {
      await prisma.faqItem.deleteMany({
        where: { id },
      }).catch(() => {});
    }
  } catch (err) {
    console.warn("[faq-store.server] PostgreSQL delete skipped:", err);
  }

  try {
    revalidatePath("/faq");
    revalidatePath("/admin/faqs");
  } catch {}

  return true;
}
