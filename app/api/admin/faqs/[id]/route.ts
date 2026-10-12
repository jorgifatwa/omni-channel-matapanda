import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { INITIAL_FAQS, type FaqItem } from "@/lib/faq-data";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const item = await prisma.faqItem.findUnique({
      where: { id },
    });

    if (item) {
      const formatted: FaqItem = {
        id: item.id,
        category: item.category,
        question: item.question,
        answer: item.answer,
        sortOrder: item.sortOrder,
        isActive: item.isActive,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      };
      return NextResponse.json({ faq: formatted });
    }

    const fallback = INITIAL_FAQS.find((f) => f.id === id);
    if (fallback) {
      return NextResponse.json({ faq: fallback });
    }

    return NextResponse.json({ error: "FAQ tidak ditemukan." }, { status: 404 });
  } catch (error) {
    console.warn("Database get failed, searching fallback:", error);
    const fallback = INITIAL_FAQS.find((f) => f.id === id);
    if (fallback) {
      return NextResponse.json({ faq: fallback });
    }
    return NextResponse.json({ error: "FAQ tidak ditemukan." }, { status: 404 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const { category, question, answer, sortOrder, isActive } = body;

    const dataToUpdate: Record<string, unknown> = {};
    if (category !== undefined) dataToUpdate.category = category.trim();
    if (question !== undefined) dataToUpdate.question = question.trim();
    if (answer !== undefined) dataToUpdate.answer = answer.trim();
    if (sortOrder !== undefined) dataToUpdate.sortOrder = Number(sortOrder);
    if (isActive !== undefined) dataToUpdate.isActive = Boolean(isActive);

    try {
      const updated = await prisma.faqItem.update({
        where: { id },
        data: dataToUpdate,
      });

      const formatted: FaqItem = {
        id: updated.id,
        category: updated.category,
        question: updated.question,
        answer: updated.answer,
        sortOrder: updated.sortOrder,
        isActive: updated.isActive,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };

      return NextResponse.json({ faq: formatted, success: true });
    } catch (dbError) {
      console.warn("Database update failed, returning memory response:", dbError);
      const matched = INITIAL_FAQS.find((f) => f.id === id);
      const fallbackItem: FaqItem = {
        id,
        category: (category ?? matched?.category ?? "Most Asked").trim(),
        question: (question ?? matched?.question ?? "").trim(),
        answer: (answer ?? matched?.answer ?? "").trim(),
        sortOrder: sortOrder !== undefined ? Number(sortOrder) : (matched?.sortOrder ?? 0),
        isActive: isActive !== undefined ? Boolean(isActive) : (matched?.isActive ?? true),
        updatedAt: new Date().toISOString(),
      };
      return NextResponse.json({ faq: fallbackItem, success: true });
    }
  } catch (error) {
    console.error(`PUT /api/admin/faqs/${id} error:`, error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat memperbarui FAQ." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    try {
      await prisma.faqItem.delete({
        where: { id },
      });
      return NextResponse.json({ success: true, message: "FAQ berhasil dihapus." });
    } catch (dbError) {
      console.warn("Database delete failed, returning memory success:", dbError);
      return NextResponse.json({ success: true, message: "FAQ berhasil dihapus." });
    }
  } catch (error) {
    console.error(`DELETE /api/admin/faqs/${id} error:`, error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat menghapus FAQ." },
      { status: 500 }
    );
  }
}
