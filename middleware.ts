import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { getAuthSecret } from "@/lib/auth-secret";

/**
 * Confirms with the database (via an internal Node route) that the session's
 * user still exists, is active and still has the role in the JWT, so revoking
 * access takes effect within a minute instead of when the 7-day token expires.
 * Results are cached per user for 60s in this instance.
 */
const SESSION_CACHE_MS = 60_000;
const sessionCache = new Map<string, { at: number; valid: boolean; role?: string }>();

async function checkKey(secret: string): Promise<string> {
  const data = new TextEncoder().encode(`${secret}:session-check`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function sessionStillValid(
  request: NextRequest,
  secret: string,
  userId: string,
  role: string
): Promise<boolean> {
  const cached = sessionCache.get(userId);
  if (cached && Date.now() - cached.at < SESSION_CACHE_MS) {
    return cached.valid && (!cached.role || cached.role === role);
  }
  try {
    const res = await fetch(new URL("/api/auth/session-check", request.url), {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-session-check": await checkKey(secret) },
      body: JSON.stringify({ userId }),
      cache: "no-store",
    });
    if (!res.ok) return false; // fail closed
    const data = (await res.json()) as { valid?: boolean; role?: string };
    const entry = { at: Date.now(), valid: Boolean(data.valid), role: data.role };
    sessionCache.set(userId, entry);
    if (sessionCache.size > 500) sessionCache.delete(sessionCache.keys().next().value as string);
    return entry.valid && (!entry.role || entry.role === role);
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Auto-forward TikTok Shop OAuth callback if redirected to root (/)
  if (pathname === "/" && (searchParams.has("code") || searchParams.has("auth_code")) && (searchParams.has("shop_region") || searchParams.has("app_key"))) {
    const callbackUrl = new URL("/api/integrations/tiktokshop/callback", request.url);
    searchParams.forEach((value, key) => {
      callbackUrl.searchParams.set(key, value);
    });
    return NextResponse.redirect(callbackUrl);
  }
  if (pathname === "/") return NextResponse.next();

  const isHttps =
    request.url.startsWith("https://") ||
    request.headers.get("x-forwarded-proto") === "https";

  const secret = getAuthSecret();

  let token = secret
    ? (await getToken({ req: request, secret, secureCookie: isHttps })) ||
      (await getToken({ req: request, secret, secureCookie: !isHttps })) ||
      (await getToken({ req: request, secret }))
    : null;

  // Revoked, deactivated, deleted or demoted users lose access right away
  if (token && secret) {
    const valid = await sessionStillValid(
      request,
      secret,
      String(token.id || ""),
      String(token.role || "CUSTOMER")
    );
    if (!valid) token = null;
  }

  // 0. Admin-only APIs: require a logged-in ADMIN session
  if (
    pathname.startsWith("/api/admin") ||
    pathname === "/api/upload" ||
    pathname === "/api/payment/send-receipt" ||
    pathname === "/api/integrations/products/deduct-stock"
  ) {
    const cronSecret = process.env.CRON_SECRET;
    const isCron =
      pathname === "/api/integrations/products/deduct-stock" &&
      !!cronSecret &&
      request.headers.get("authorization") === `Bearer ${cronSecret}`;

    if (!isCron && (!token || token.role !== "ADMIN")) {
      return NextResponse.json(
        { error: "Akses ditolak. Silakan login sebagai admin." },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // 1. Handle /admin routes
  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") {
      if (token && token.role === "ADMIN") {
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      }
      return NextResponse.next();
    }

    if (!token || token.role !== "ADMIN") {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (pathname === "/admin") {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }

    return NextResponse.next();
  }

  // 2. Handle /account routes
  if (pathname.startsWith("/account")) {
    if (pathname === "/account/forgot-password" || pathname === "/account/reset-password") {
      return NextResponse.next();
    }
    if (pathname === "/account/login" || pathname === "/account/register") {
      if (token) {
        return NextResponse.redirect(new URL("/account/orders", request.url));
      }
      return NextResponse.next();
    }

    // Protected customer routes: /account, /account/orders, /account/orders/:id
    if (!token) {
      const loginUrl = new URL("/account/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/admin/:path*",
    "/account/:path*",
    "/api/admin/:path*",
    "/api/upload",
    "/api/payment/send-receipt",
    "/api/integrations/products/deduct-stock",
  ],
};
