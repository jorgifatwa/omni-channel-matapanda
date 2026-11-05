/**
 * Normalizes a link entered by an admin (banner CTA, etc.) so it always works:
 * - "/categories/bags"        -> unchanged (internal)
 * - "categories/bags"         -> "/categories/bags" (missing leading slash)
 * - "https://instagram.com/x" -> unchanged (external)
 * - "instagram.com/x"         -> "https://instagram.com/x"
 * - empty                     -> fallback
 */
export function normalizeLink(raw: string | null | undefined, fallback = "/new-arrivals"): string {
  const link = (raw || "").trim();
  if (!link) return fallback;
  if (/^(https?:|mailto:|tel:|#)/i.test(link)) return link;
  if (link.startsWith("/")) return link;
  if (/^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+(\/|$|\?)/i.test(link)) return `https://${link}`;
  return `/${link}`;
}

export function isExternalLink(href: string): boolean {
  return /^https?:\/\//i.test(href);
}
