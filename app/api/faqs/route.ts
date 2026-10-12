import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { INITIAL_FAQS, type FaqItem } from "@/lib/faq-data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const search = searchParams.get("search")?.toLowerCase().trim();

  try {
    const whereClause: {
      isActive: boolean;
      category?: string;
      OR?: Array<{ question?: { contains: string; mode: "insensitive" }; answer?: { contains: string; mode: "insensitive" } }>;
    } = {
      isActive: true,
    };

    if (category && category !== "All" && category !== "Semua") {
      whereClause.category = category;
    }

    if (search) {
      whereClause.OR = [
        { question: { contains: search, mode: "insensitive" } },
        { answer: { contains: search, mode: "insensitive" } },
      ];
    }

    const items = await prisma.faqItem.findMany({
      where: whereClause,
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
    });

    if (items.length > 0) {
      const formatted: FaqItem[] = items.map((item) => ({
        id: item.id,
        category: item.category,
        question: item.question,
        answer: item.answer,
        sortOrder: item.sortOrder,
        isActive: item.isActive,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      }));

      return NextResponse.json({ faqs: formatted, source: "database" });
    }

    // Fallback if db table is empty
    let filtered = INITIAL_FAQS.filter((f) => f.isActive);
    if (category && category !== "All" && category !== "Semua") {
      filtered = filtered.filter((f) => f.category.toLowerCase() === category.toLowerCase());
    }
    if (search) {
      filtered = filtered.filter(
        (f) =>
          f.question.toLowerCase().includes(search) ||
          f.answer.toLowerCase().includes(search) ||
          f.category.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({ faqs: filtered, source: "defaults" });
  } catch (error) {
    console.warn("Database unavailable for FAQs, using fallback:", error);
    let filtered = INITIAL_FAQS.filter((f) => f.isActive);
    if (category && category !== "All" && category !== "Semua") {
      filtered = filtered.filter((f) => f.category.toLowerCase() === category.toLowerCase());
    }
    if (search) {
      filtered = filtered.filter(
        (f) =>
          f.question.toLowerCase().includes(search) ||
          f.answer.toLowerCase().includes(search) ||
          f.category.toLowerCase().includes(search)
      );
    }
    return NextResponse.json({ faqs: filtered, source: "fallback" });
  }
}
