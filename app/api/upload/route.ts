import { NextResponse } from "next/server";
import { getStorageClient, uploadToStorage } from "@/lib/storage";

/**
 * Admin image upload. Files go ONLY to Backblaze B2 (private bucket,
 * served via /api/media). There is no fallback provider.
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "products";

    if (!file) {
      return NextResponse.json(
        { error: "File gambar wajib disertakan" },
        { status: 400 }
      );
    }

    if (!getStorageClient()) {
      console.error("Upload rejected: STORAGE_* env vars are not configured");
      return NextResponse.json(
        { error: "Penyimpanan gambar (Backblaze B2) belum dikonfigurasi" },
        { status: 500 }
      );
    }

    // Only raster images: anything else (HTML, SVG...) would be served from
    // our own domain and could run scripts.
    const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
    const MAX_BYTES = 10 * 1024 * 1024;
    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json(
        { error: "Format file tidak didukung. Gunakan JPG, PNG, WEBP, GIF, atau AVIF." },
        { status: 400 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Ukuran file maksimal 10 MB." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type;
    const fileName = file.name || "upload.jpg";

    const result = await uploadToStorage(buffer, fileName, mimeType, folder);
    return NextResponse.json({
      url: result.url,
      publicId: result.key,
      provider: "backblaze_b2",
    });
  } catch (error) {
    console.error("Backblaze B2 upload error:", error);
    return NextResponse.json(
      { error: "Gagal mengunggah gambar ke Backblaze B2" },
      { status: 500 }
    );
  }
}
