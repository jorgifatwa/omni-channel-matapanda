import { NextResponse } from "next/server";
import { getAllFaqsStore, createFaqStore } from "@/lib/faq-store.server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get("status");
  const category = searchParams.get("category") || undefined;
  const search = searchParams.get("search")?.toLowerCase().trim() || undefined;

  try {
    const faqs = await getAllFaqsStore({
      status: statusFilter === "active" || statusFilter === "inactive" ? statusFilter : undefined,
      category,
      search,
    });
    return NextResponse.json({ faqs, source: "database" });
  } catch (error) {
    console.error("GET /api/admin/faqs error:", error);
    return NextResponse.json(
      { faqs: [], error: "Gagal memuat FAQ dari database." },
      { status: 503 }
    );
  }
}

export async function POST(request: Request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Format data tidak valid." }, { status: 400 });
  }
  const { category, question, answer, sortOrder = 0, isActive = true } = body ?? {};

  if (typeof question !== "string" || !question.trim()) {
    return NextResponse.json({ error: "Pertanyaan FAQ wajib diisi." }, { status: 400 });
  }
  if (typeof answer !== "string" || !answer.trim()) {
    return NextResponse.json({ error: "Jawaban FAQ wajib diisi." }, { status: 400 });
  }

  try {
    const saved = await createFaqStore({
      category: typeof category === "string" && category.trim() ? category.trim() : "Most Asked",
      question,
      answer,
      sortOrder,
      isActive,
    });
    return NextResponse.json({ faq: saved, success: true }, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/faqs error:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan FAQ ke database." },
      { status: 503 }
    );
  }
}
