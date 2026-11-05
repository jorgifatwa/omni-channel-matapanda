import { NextResponse } from "next/server";
import { getStorageClient, uploadToStorage } from "@/lib/storage";

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

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = file.type || "image/jpeg";
    const fileName = file.name || "upload.jpg";

    // 1. Primary: S3-compatible object storage (Backblaze B2, private bucket
    //    served through /api/media)
    if (getStorageClient()) {
      try {
        const result = await uploadToStorage(buffer, fileName, mimeType, folder);
        return NextResponse.json({
          url: result.url,
          publicId: result.key,
          provider: "backblaze_b2",
        });
      } catch (storageError) {
        console.error("Object storage upload error:", storageError);
        // If storage fails, proceed to fallback options below
      }
    }

    // 2. Secondary: Cloudinary REST API fallback
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset =
      process.env.CLOUDINARY_UPLOAD_PRESET || "matapanda_unsigned";

    if (cloudName && cloudName !== "demo" && cloudName !== "your-cloud-name") {
      const cloudinaryForm = new FormData();
      cloudinaryForm.append("file", file);
      cloudinaryForm.append("upload_preset", uploadPreset);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: "POST",
          body: cloudinaryForm,
        }
      );

      if (response.ok) {
        const result = await response.json();
        return NextResponse.json({
          url: result.secure_url,
          publicId: result.public_id,
          provider: "cloudinary",
        });
      }
    }

    // 3. Sandbox Development Fallback: Base64 data URI
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64}`;

    return NextResponse.json({
      url: dataUrl,
      publicId: `local_${Date.now()}`,
      provider: "local_sandbox",
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Gagal mengunggah gambar" },
      { status: 500 }
    );
  }
}
