import { NextResponse } from "next/server";
import { deleteSubscriber } from "@/lib/newsletter-store";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const result = await deleteSubscriber(id);
    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: result.message });
  } catch (error) {
    console.error(`DELETE /api/admin/subscribers/${id} error:`, error);
    return NextResponse.json(
      { error: "Gagal menghapus subscriber dari database." },
      { status: 503 }
    );
  }
}
