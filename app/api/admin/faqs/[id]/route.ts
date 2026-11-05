import { NextResponse } from "next/server";
import {
  getFaqByIdStore,
  updateFaqStore,
  deleteFaqStore,
} from "@/lib/faq-store.server";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const item = await getFaqByIdStore(params.id);
    if (!item) {
      return NextResponse.json({ error: "FAQ tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ faq: item });
  } catch (error) {
    console.error("GET /api/admin/faqs/[id] error:", error);
    return NextResponse.json(
      { error: "Gagal memuat FAQ dari database." },
      { status: 503 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Format data tidak valid." }, { status: 400 });
  }
  const { category, question, answer, sortOrder, isActive } = body ?? {};

  try {
    const existing = await getFaqByIdStore(params.id);
    if (!existing) {
      return NextResponse.json({ error: "FAQ tidak ditemukan" }, { status: 404 });
    }

    const nextQuestion = question !== undefined ? String(question) : existing.question;
    const nextAnswer = answer !== undefined ? String(answer) : existing.answer;
    if (!nextQuestion.trim() || !nextAnswer.trim()) {
      return NextResponse.json({ error: "Pertanyaan dan jawaban FAQ wajib diisi." }, { status: 400 });
    }

    const saved = await updateFaqStore(params.id, {
      category: category !== undefined && String(category).trim() ? String(category) : existing.category,
      question: nextQuestion,
      answer: nextAnswer,
      sortOrder: sortOrder !== undefined ? sortOrder : existing.sortOrder,
      isActive: isActive !== undefined ? isActive : existing.isActive,
    });
    if (!saved) {
      return NextResponse.json({ error: "FAQ tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ faq: saved, success: true });
  } catch (error) {
    console.error(`PUT /api/admin/faqs/${params.id} error:`, error);
    return NextResponse.json(
      { error: "Gagal memperbarui FAQ di database." },
      { status: 503 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const deleted = await deleteFaqStore(params.id);
    if (!deleted) {
      return NextResponse.json({ error: "FAQ tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: "FAQ berhasil dihapus." });
  } catch (error) {
    console.error(`DELETE /api/admin/faqs/${params.id} error:`, error);
    return NextResponse.json(
      { error: "Gagal menghapus FAQ dari database." },
      { status: 503 }
    );
  }
}
