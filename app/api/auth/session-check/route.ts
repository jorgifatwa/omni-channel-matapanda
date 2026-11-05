import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { getAuthSecret } from "@/lib/auth-secret";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Fixed ids returned by the non-DB login fallbacks (E2E / local demo accounts). */
const SYNTHETIC_ID_PREFIX = "00000000-0000-4000-8000-";

function expectedKey(): string | null {
  const secret = getAuthSecret();
  return secret ? createHash("sha256").update(`${secret}:session-check`).digest("hex") : null;
}

/**
 * Internal endpoint used by middleware (Edge runtime can't use Prisma) to
 * confirm that a session's user still exists, is active and still has the
 * role stored in the JWT. Protected by a key derived from NEXTAUTH_SECRET.
 */
export async function POST(request: Request) {
  const key = expectedKey();
  const provided = request.headers.get("x-session-check") || "";
  if (
    !key ||
    provided.length !== key.length ||
    !timingSafeEqual(Buffer.from(provided), Buffer.from(key))
  ) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { userId } = (await request.json().catch(() => ({}))) as { userId?: string };
  if (!userId) return NextResponse.json({ valid: false });

  if (!/^[0-9a-f-]{36}$/i.test(userId)) return NextResponse.json({ valid: false });
  if (userId.startsWith(SYNTHETIC_ID_PREFIX)) {
    return NextResponse.json({ valid: process.env.VERCEL_ENV !== "production", synthetic: true });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, isActive: true, deletedAt: true },
    });
    if (!user || !user.isActive || user.deletedAt) return NextResponse.json({ valid: false });
    return NextResponse.json({ valid: true, role: user.role });
  } catch (err) {
    console.error("[SessionCheck] Database error:", err);
    return NextResponse.json({ error: "db" }, { status: 503 });
  }
}
