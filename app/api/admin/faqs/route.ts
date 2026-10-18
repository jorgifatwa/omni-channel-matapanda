import { NextResponse } from "next/server";
import {
  getAllFaqsStore,
  saveFaqStore,
} from "@/lib/faq-store.server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get("status") as "active" | "inactive" | null;
  const category = searchParams.get("category") || undefined;
  const search = searchParams.get("search")?.toLowerCase().trim() || undefined;

  try {
    const { faqs, source } = await getAllFaqsStore({
      status: statusFilter === "active" || statusFilter === "inactive" ? statusFilter : undefined,
      category,
      search,
    });
    return NextResponse.json({ faqs, source });
  } catch (error) {
    console.error("GET /api/admin/faqs error:", error);
    return NextResponse.json(
      { error: "Gagal memuat FAQs." },
      { status: 500 }
    );
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

    const saved = await saveFaqStore({
      category: category ? category.trim() : "Most Asked",
      question,
      answer,
      sortOrder,
      isActive,
    });

    return NextResponse.json({ faq: saved, success: true }, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/faqs error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server saat menambahkan FAQ." },
      { status: 500 }
    );
  }
}
