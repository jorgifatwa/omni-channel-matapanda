import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { buildTikTokShopAuthUrl } from "@/lib/tiktokshop-oauth";

/**
 * GET /api/integrations/tiktokshop/connect
 *
 * Redirects the authenticated admin to TikTok Shop Partner Center's
 * OAuth consent page (covers both TikTok Shop & Tokopedia post-merger).
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appKey = process.env.TIKTOK_SHOP_APP_KEY;
  const appSecret = process.env.TIKTOK_SHOP_APP_SECRET;

  if (!appKey || !appSecret) {
    return NextResponse.json(
      {
        error:
          "TikTok Shop credentials tidak dikonfigurasi. " +
          "Tambahkan TIKTOK_SHOP_APP_KEY dan TIKTOK_SHOP_APP_SECRET ke .env",
      },
      { status: 503 }
    );
  }

  const redirectUri =
    process.env.TIKTOK_SHOP_REDIRECT_URI ||
    `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/integrations/tiktokshop/callback`;

  const authUrl = buildTikTokShopAuthUrl(redirectUri);

  return NextResponse.redirect(authUrl);
}
