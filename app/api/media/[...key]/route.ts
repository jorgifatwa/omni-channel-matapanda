import { NextResponse } from "next/server";
import { getStorageObject } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public read-only proxy for the private storage bucket.
 * Uploaded keys contain a timestamp, so they never change: cache forever
 * at the Vercel CDN so the bucket is only hit once per file.
 */
export async function GET(
  _request: Request,
  { params }: { params: { key: string[] } }
) {
  const segments = params.key ?? [];
  if (
    segments.length === 0 ||
    segments.some((s) => !s || s === "." || s === ".." || s.includes("\\"))
  ) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }
  const key = segments.join("/");

  try {
    const object = await getStorageObject(key);
    if (!object?.Body) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const contentType = object.ContentType || "application/octet-stream";
    const isSafeImage = /^image\/(jpeg|png|webp|gif|avif)$/.test(contentType);
    const headers = new Headers({
      "Content-Type": isSafeImage ? contentType : "application/octet-stream",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
      "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    });
    if (!isSafeImage) headers.set("Content-Disposition", "attachment");
    if (object.ContentLength != null) {
      headers.set("Content-Length", String(object.ContentLength));
    }
    if (object.ETag) headers.set("ETag", object.ETag);

    return new Response(object.Body.transformToWebStream(), { headers });
  } catch (error) {
    console.error("Media proxy error:", error);
    return NextResponse.json({ error: "Failed to load file" }, { status: 502 });
  }
}
