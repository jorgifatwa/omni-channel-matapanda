import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { getAuthSecret } from "@/lib/auth-secret";

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

  const isHttps =
    request.url.startsWith("https://") ||
    request.headers.get("x-forwarded-proto") === "https";

  const secret = getAuthSecret();

  const token = secret
    ? (await getToken({ req: request, secret, secureCookie: isHttps })) ||
      (await getToken({ req: request, secret, secureCookie: !isHttps })) ||
      (await getToken({ req: request, secret }))
    : null;

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
    "/admin/:path*",
    "/account/:path*",
    "/api/admin/:path*",
    "/api/upload",
    "/api/payment/send-receipt",
    "/api/integrations/products/deduct-stock",
  ],
};
