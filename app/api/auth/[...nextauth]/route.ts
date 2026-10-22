import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest } from "next/server";

const nextAuthHandler = NextAuth(authOptions);

interface RouteContext {
  params: {
    nextauth?: string[];
  };
}

async function handler(req: NextRequest, ctx: RouteContext) {
  // Respect NEXTAUTH_URL from environment variable
  // Dynamic host fallback if behind reverse proxy and not set
  if (!process.env.NEXTAUTH_URL) {
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    const proto =
      req.headers.get("x-forwarded-proto") ||
      (host?.includes("localhost") ? "http" : "https");

    if (host) {
      process.env.NEXTAUTH_URL = `${proto}://${host}`;
    }
  }

  return nextAuthHandler(req, ctx);
}

export { handler as GET, handler as POST };
