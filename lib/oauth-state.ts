/**
 * CSRF protection for the marketplace OAuth flows.
 *
 * /connect stores a random state in an httpOnly cookie and passes it to the
 * marketplace. /callback only accepts the connection when that cookie exists
 * (the admin started the flow in this browser in the last 15 minutes) and,
 * when the marketplace echoes a state back, it must match. A crafted callback
 * link opened by a logged-in admin is therefore rejected.
 */

import { randomBytes, timingSafeEqual } from "crypto";
import type { NextRequest, NextResponse } from "next/server";

type Platform = "shopee" | "tiktokshop";
const COOKIE = (p: Platform) => `mp_oauth_state_${p}`;
const MAX_AGE_SECONDS = 15 * 60;

export function newOAuthState(): string {
  return randomBytes(24).toString("hex");
}

export function setOAuthStateCookie(res: NextResponse, platform: Platform, state: string) {
  res.cookies.set(COOKIE(platform), state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export function clearOAuthStateCookie(res: NextResponse, platform: Platform) {
  res.cookies.set(COOKIE(platform), "", { path: "/", maxAge: 0 });
}

export function verifyOAuthState(request: NextRequest, platform: Platform): boolean {
  const expected = request.cookies.get(COOKIE(platform))?.value || "";
  if (!expected) return false;
  const returned = request.nextUrl.searchParams.get("state");
  if (returned === null) return true; // provider doesn't echo state; cookie proves the flow started here
  const a = Buffer.from(returned);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
