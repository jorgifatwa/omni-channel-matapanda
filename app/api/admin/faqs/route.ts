import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { INITIAL_FAQS, type FaqItem } from "@/lib/faq-data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get("status"); // "active" | "inactive" | null
  const category = searchParams.get("category");
  const search = searchParams.get("search")?.toLowerCase().trim();

  try {
    const whereClause: {
      isActive?: boolean;
      category?: string;
      OR?: Array<{ question?: { contains: string; mode: "insensitive" }; answer?: { contains: string; mode: "insensitive" } }>;
    } = {};

    if (statusFilter === "active") whereClause.isActive = true;
    if (statusFilter === "inactive") whereClause.isActive = false;

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
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    if (items.length > 0) {
      const formatted: FaqItem[] = items.map((f) => ({
        id: f.id,
        category: f.category,
        question: f.question,
        answer: f.answer,
        sortOrder: f.sortOrder,
        isActive: f.isActive,
        createdAt: f.createdAt.toISOString(),
        updatedAt: f.updatedAt.toISOString(),
      }));

      return NextResponse.json({ faqs: formatted, source: "database" });
    }

    // Fallback if db table is empty
    let list = [...INITIAL_FAQS];
    if (statusFilter === "active") {
      list = list.filter((f) => f.isActive);
    } else if (statusFilter === "inactive") {
      list = list.filter((f) => !f.isActive);
    }
    if (category && category !== "All" && category !== "Semua") {
      list = list.filter((f) => f.category.toLowerCase() === category.toLowerCase());
    }
    if (search) {
      list = list.filter(
        (f) =>
          f.question.toLowerCase().includes(search) ||
          f.answer.toLowerCase().includes(search) ||
          f.category.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({ faqs: list, source: "defaults" });
  } catch (error) {
    console.warn("Database unavailable for admin faqs, using fallback:", error);
    let list = [...INITIAL_FAQS];
    if (statusFilter === "active") {
      list = list.filter((f) => f.isActive);
    } else if (statusFilter === "inactive") {
      list = list.filter((f) => !f.isActive);
    }
    if (category && category !== "All" && category !== "Semua") {
      list = list.filter((f) => f.category.toLowerCase() === category.toLowerCase());
    }
    if (search) {
      list = list.filter(
        (f) =>
          f.question.toLowerCase().includes(search) ||
          f.answer.toLowerCase().includes(search) ||
          f.category.toLowerCase().includes(search)
      );
    }
    return NextResponse.json({ faqs: list, source: "fallback" });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      category,
      question,
      answer,
      sortOrder = 0,
      isActive = true,
    } = body;

    if (!category || !category.trim()) {
      return NextResponse.json(
        { error: "Kategori FAQ wajib dipilih atau diisi." },
        { status: 400 }
      );
    }

    if (!question || !question.trim()) {
      return NextResponse.json(
        { error: "Pertanyaan FAQ wajib diisi." },
        { status: 400 }
      );
    }

    if (!answer || !answer.trim()) {
      return NextResponse.json(
        { error: "Jawaban FAQ wajib diisi." },
        { status: 400 }
      );
    }

    try {
      const created = await prisma.faqItem.create({
        data: {
          category: category.trim(),
          question: question.trim(),
          answer: answer.trim(),
          sortOrder: Number(sortOrder) || 0,
          isActive: Boolean(isActive),
        },
      });

      const formatted: FaqItem = {
        id: created.id,
        category: created.category,
        question: created.question,
        answer: created.answer,
        sortOrder: created.sortOrder,
        isActive: created.isActive,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      };

      return NextResponse.json({ faq: formatted, success: true }, { status: 201 });
    } catch (dbError) {
      console.warn("Database create failed, returning memory fallback:", dbError);
      const fallbackItem: FaqItem = {
        id: `faq-${Date.now()}`,
        category: category.trim(),
        question: question.trim(),
        answer: answer.trim(),
        sortOrder: Number(sortOrder) || 0,
        isActive: Boolean(isActive),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return NextResponse.json({ faq: fallbackItem, success: true }, { status: 201 });
    }
  } catch (error) {
    console.error("POST /api/admin/faqs error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server saat membuat FAQ." },
      { status: 500 }
    );
  }
}
