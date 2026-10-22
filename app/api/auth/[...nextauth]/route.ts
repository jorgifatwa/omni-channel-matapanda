import NextAuth from "next-auth";
import { authOptions, PRODUCTION_DOMAIN } from "@/lib/auth";
import { NextRequest } from "next/server";

const nextAuthHandler = NextAuth(authOptions);

interface RouteContext {
  params: {
    nextauth?: string[];
  };
}

async function handler(req: NextRequest, ctx: RouteContext) {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto =
    req.headers.get("x-forwarded-proto") ||
    (host?.includes("localhost") ? "http" : "https");

  if (host && !host.includes("localhost")) {
    process.env.NEXTAUTH_URL = `${proto}://${host}`;
  } else if (
    !process.env.NEXTAUTH_URL ||
    process.env.NEXTAUTH_URL.includes("localhost")
  ) {
    if (process.env.NODE_ENV === "production" || process.env.VERCEL === "1") {
      process.env.NEXTAUTH_URL = PRODUCTION_DOMAIN;
    }
  }

  return nextAuthHandler(req, ctx);
}

export { handler as GET, handler as POST };
