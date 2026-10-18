import { NextResponse } from "next/server";
import {
  saveFaqStore,
  deleteFaqStore,
  getAllFaqsStore,
} from "@/lib/faq-store.server";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { faqs } = await getAllFaqsStore();
    const item = faqs.find((f) => f.id === params.id);

    if (!item) {
      return NextResponse.json({ error: "FAQ tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ faq: item });
  } catch (error) {
    console.error("GET /api/admin/faqs/[id] error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data FAQ." },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { category, question, answer, sortOrder, isActive } = body;

    const { faqs } = await getAllFaqsStore();
    const existing = faqs.find((f) => f.id === params.id);

    const saved = await saveFaqStore({
      id: params.id,
      category: category !== undefined ? category : existing?.category || "Most Asked",
      question: question !== undefined ? question : existing?.question || "",
      answer: answer !== undefined ? answer : existing?.answer || "",
      sortOrder: sortOrder !== undefined ? sortOrder : existing?.sortOrder ?? 0,
      isActive: isActive !== undefined ? isActive : existing?.isActive ?? true,
    });

    return NextResponse.json({ faq: saved, success: true });
  } catch (error) {
    console.error(`PUT /api/admin/faqs/${params.id} error:`, error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat memperbarui FAQ." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await deleteFaqStore(params.id);
    return NextResponse.json({ success: true, message: "FAQ berhasil dihapus." });
  } catch (error) {
    console.error(`DELETE /api/admin/faqs/${params.id} error:`, error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat menghapus FAQ." },
      { status: 500 }
    );
  }
}
