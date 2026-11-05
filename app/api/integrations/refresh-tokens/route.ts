import { NextResponse } from "next/server";
import { refreshExpiringMarketplaceTokens } from "@/lib/marketplace-token-refresh";

export const dynamic = "force-dynamic";

/**
 * GET|POST /api/integrations/refresh-tokens
 *
 * Refreshes Shopee / TikTok Shop tokens that expire within the next 6 hours.
 * Called daily by Vercel Cron (vercel.json) so refresh tokens never lapse;
 * access tokens are also refreshed on demand before every marketplace call.
 *
 * Protected by: Authorization: Bearer <CRON_SECRET>
 * (Vercel Cron sends this header automatically when CRON_SECRET is set.)
 */
async function handle(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "CRON_SECRET belum dikonfigurasi" }, { status: 503 });
    }
  } else if (request.headers.get("Authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await refreshExpiringMarketplaceTokens(6 * 60 * 60 * 1000);
    return NextResponse.json({
      success: true,
      ...summary,
      errors: summary.errors.length > 0 ? summary.errors : undefined,
    });
  } catch (error) {
    console.error("[Token Refresh] Fatal error:", error);
    return NextResponse.json({ error: "Token refresh failed" }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
