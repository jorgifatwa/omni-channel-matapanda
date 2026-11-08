/**
 * Returns `target` only when it is a same-origin relative path ("/foo?x=1").
 * Anything else — absolute URLs, protocol-relative "//evil.com", backslash
 * tricks ("/\\evil.com"), "javascript:" — falls back, so a crafted
 * ?callbackUrl=... can't send users off-site after login or registration.
 */
export function safeRedirectPath(target: string | null | undefined, fallback: string): string {
  if (!target) return fallback;
  const value = target.trim();
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }
  // Reject control characters and backslashes anywhere (browsers normalise "\" to "/").
  if (/[\u0000-\u001f\\]/.test(value)) return fallback;
  try {
    const base = "http://same-origin.invalid";
    const url = new URL(value, base);
    if (url.origin !== base) return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}
