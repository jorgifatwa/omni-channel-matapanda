import { type CouponInput } from "@/lib/coupon-store";

/** Validates an admin coupon payload. Shared by POST and PUT handlers. */
export function validateCouponBody(
  body: unknown
): { input: Omit<CouponInput, "id"> } | { error: string } {
  if (!body || typeof body !== "object") {
    return { error: "Data kupon tidak valid" };
  }
  const b = body as Record<string, unknown>;

  const code = typeof b.code === "string" ? b.code.trim().toUpperCase() : "";
  if (!code) return { error: "Kode kupon wajib diisi" };
  if (!/^[A-Z0-9_-]{2,40}$/.test(code)) {
    return { error: "Kode kupon hanya boleh berisi huruf, angka, '-' atau '_' (2-40 karakter)" };
  }

  const name = typeof b.name === "string" ? b.name.trim() : "";
  if (!name) return { error: "Nama kupon / influencer wajib diisi" };

  if (b.discountType !== "PERCENTAGE" && b.discountType !== "FIXED_AMOUNT") {
    return { error: "Tipe diskon harus PERCENTAGE atau FIXED_AMOUNT" };
  }

  const discountValue = Number(b.discountValue);
  if (!Number.isFinite(discountValue) || discountValue <= 0) {
    return { error: "Nilai diskon harus lebih besar dari 0" };
  }
  if (b.discountType === "PERCENTAGE" && discountValue > 100) {
    return { error: "Diskon persentase tidak boleh lebih dari 100%" };
  }

  const minSpend = Number(b.minSpend) || 0;
  if (minSpend < 0) return { error: "Minimal belanja tidak boleh negatif" };

  const startDate = typeof b.startDate === "string" ? b.startDate : "";
  const endDate = typeof b.endDate === "string" ? b.endDate : "";
  if (startDate && Number.isNaN(new Date(startDate).getTime())) {
    return { error: "Tanggal mulai tidak valid" };
  }
  if (endDate && Number.isNaN(new Date(endDate).getTime())) {
    return { error: "Tanggal berakhir tidak valid" };
  }
  if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
    return { error: "Tanggal berakhir harus setelah tanggal mulai" };
  }

  return {
    input: {
      code,
      name,
      description: typeof b.description === "string" ? b.description : "",
      discountType: b.discountType,
      discountValue,
      minSpend,
      maxDiscount: b.maxDiscount ? Number(b.maxDiscount) : null,
      usageLimit: b.usageLimit ? Number(b.usageLimit) : null,
      startDate,
      endDate,
      isActive: b.isActive !== undefined ? Boolean(b.isActive) : true,
    },
  };
}
