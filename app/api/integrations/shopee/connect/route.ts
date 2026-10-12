import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { buildShopeeAuthUrl } from "@/lib/shopee-oauth";

/**
 * GET /api/integrations/shopee/connect
 *
 * Redirects the authenticated admin to Shopee's OAuth consent page.
 * After the seller authorizes, Shopee redirects to /api/integrations/shopee/callback.
 */
export async function GET() {
  // Guard: only authenticated admins can initiate the OAuth flow
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const partnerId = process.env.SHOPEE_PARTNER_ID;
  const partnerKey = process.env.SHOPEE_PARTNER_KEY;

  if (!partnerId || !partnerKey) {
    return NextResponse.json(
      {
        error:
          "Shopee credentials tidak dikonfigurasi. " +
          "Tambahkan SHOPEE_PARTNER_ID dan SHOPEE_PARTNER_KEY ke .env",
      },
      { status: 503 }
    );
  }

  const redirectUri =
    process.env.SHOPEE_REDIRECT_URI ||
    `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/integrations/shopee/callback`;

  const authUrl = buildShopeeAuthUrl(redirectUri);

  return NextResponse.redirect(authUrl);
}
