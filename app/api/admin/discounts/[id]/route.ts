import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getDiscountById,
  saveDiscount,
  deleteDiscount,
  toggleDiscountActive,
  type DiscountCampaign,
} from "@/lib/discount-store";

interface Params {
  params: { id: string };
}

/**
 * GET /api/admin/discounts/[id]
 */
export async function GET(request: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const discount = await getDiscountById(params.id);
    if (!discount) {
      return NextResponse.json({ error: "Diskon tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ success: true, discount });
  } catch (error) {
    console.error("[Admin Discounts GET id] Error:", error);
    return NextResponse.json(
      { error: "Gagal memuat data diskon dari database" },
      { status: 503 }
    );
  }
}

/**
 * PUT /api/admin/discounts/[id]
 */
export async function PUT(request: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | (Partial<DiscountCampaign> & { toggleOnly?: boolean })
    | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Data diskon tidak valid" }, { status: 400 });
  }

  try {

    // If quick toggle active state
    if (body.toggleOnly) {
      const toggled = await toggleDiscountActive(params.id, body.isActive);
      if (!toggled) {
        return NextResponse.json({ error: "Diskon tidak ditemukan" }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        message: `Status promo "${toggled.name}" berhasil diubah menjadi ${toggled.isActive ? "Aktif" : "Nonaktif"}.`,
        discount: toggled,
      });
    }

    const existing = await getDiscountById(params.id);
    if (!existing) {
      return NextResponse.json({ error: "Diskon tidak ditemukan" }, { status: 404 });
    }

    const updated = await saveDiscount({
      ...existing,
      ...body,
      id: params.id,
    });
    if (!updated) {
      return NextResponse.json({ error: "Diskon tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Kampanye diskon "${updated.name}" berhasil diperbarui!`,
      discount: updated,
    });
  } catch (error) {
    console.error("[Admin Discounts PUT] Error:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui kampanye diskon: database tidak tersedia" },
      { status: 503 }
    );
  }
}

/**
 * DELETE /api/admin/discounts/[id]
 */
export async function DELETE(request: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const success = await deleteDiscount(params.id);
    if (!success) {
      return NextResponse.json({ error: "Diskon tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Kampanye diskon berhasil dihapus.",
    });
  } catch (error) {
    console.error("[Admin Discounts DELETE] Error:", error);
    return NextResponse.json(
      { error: "Gagal menghapus diskon: database tidak tersedia" },
      { status: 503 }
    );
  }
}
