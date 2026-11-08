/**
 * Hosts next/image may load. Keep in sync with `images.remotePatterns` in
 * next.config.mjs — a URL outside this list makes <Image> throw and crashes
 * the page that renders it (admin preview and the storefront).
 */
const ALLOWED_IMAGE_HOSTS = [
  "images.unsplash.com",
  "cf.shopee.co.id",
  "**.shopee.co.id",
  "**.shopee.sg",
  "**.susercontent.com",
  "**.shopeemobile.com",
  "**.tiktokcdn.com",
  "**.tokopedia.net",
];

function hostAllowed(hostname: string): boolean {
  return ALLOWED_IMAGE_HOSTS.some((pattern) =>
    pattern.startsWith("**.")
      ? hostname.endsWith(pattern.slice(2)) && hostname.length > pattern.length - 2
      : hostname === pattern
  );
}

/** True when next/image can render `value` (same-site path or allowed https host). */
export function isRenderableImageUrl(value: string | null | undefined): boolean {
  const url = (value ?? "").trim();
  if (!url) return false;
  if (url.startsWith("/")) return !url.startsWith("//") && !/\s/.test(url);
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && hostAllowed(parsed.hostname);
  } catch {
    return false;
  }
}

export const IMAGE_URL_HINT =
  "Gunakan gambar hasil upload, path lokal (/...), atau URL https dari host yang diizinkan (mis. images.unsplash.com).";
