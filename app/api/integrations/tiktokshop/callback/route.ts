import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { tikTokShopExchangeToken, tikTokShopGetSellerInfo } from "@/lib/tiktokshop-oauth";
import { encryptToken } from "@/lib/marketplace-crypto";
import { upsertMarketplaceAccount } from "@/lib/marketplace-store";

/**
 * GET /api/integrations/tiktokshop/callback?code=<code>&shop_cipher=<shop_cipher>
 *
 * TikTok Shop redirects here after the seller authorizes our app.
 * We exchange the code for tokens, encrypt them, and save to DB.
 *
 * Note: shop_cipher is TikTok's encrypted shop identifier; the actual
 * shop/seller ID comes from the token exchange response (open_id).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code") || searchParams.get("auth_code");
  const adminUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/admin/integrations`;

  // Cari data admin user (utamakan session, fallback ke default admin)
  const session = await getServerSession(authOptions);
  let adminEmail = session?.user?.email;
  if (!adminEmail) {
    adminEmail = process.env.ADMIN_DEFAULT_EMAIL || "jorgifatwaambia@gmail.com";
  }

  if (!code) {
    console.error("[TikTok Shop Callback] Missing authorization code");
    return NextResponse.redirect(`${adminUrl}?error=tiktokshop_missing_code`);
  }

  try {
    // 1. Exchange code for tokens
    const tokenData = await tikTokShopExchangeToken(code);

    if (tokenData.code !== 0) {
      console.error("[TikTok Shop Callback] Token exchange error:", tokenData.message);
      return NextResponse.redirect(`${adminUrl}?error=tiktokshop_token_error`);
    }

    const {
      access_token,
      refresh_token,
      access_token_expire_in,
      open_id,
    } = tokenData.data;

    const expiresAt = new Date(access_token_expire_in * 1000);

    // 2. Fetch seller info for display name
    const sellerInfo = await tikTokShopGetSellerInfo(access_token);
    const shopName =
      sellerInfo?.seller_name ||
      tokenData.data.seller_name ||
      `TikTok Shop ${open_id.slice(0, 8)}`;

    // 3. Encrypt tokens
    const encryptedAccessToken = encryptToken(access_token);
    const encryptedRefreshToken = encryptToken(refresh_token);

    // 4. Find admin user id (with fallback)
    let adminUserId = "00000000-0000-0000-0000-000000000001";
    try {
      const adminUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: adminEmail },
            { role: "ADMIN" },
          ],
        },
        select: { id: true },
      });
      if (adminUser) adminUserId = adminUser.id;
    } catch {
      // Database offline, use fallback
    }

    // 5. Upsert MarketplaceAccount
    await upsertMarketplaceAccount({
      platform: "TIKTOK_SHOP",
      shopId: open_id,
      shopName,
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      tokenExpiresAt: expiresAt,
      isActive: true,
      connectedById: adminUserId,
    });

    console.log(`[TikTok Shop Callback] Connected: ${shopName} (open_id: ${open_id})`);
    return NextResponse.redirect(
      `${adminUrl}?success=tiktokshop_connected&shop=${encodeURIComponent(shopName)}`
    );
  } catch (error) {
    console.error("[TikTok Shop Callback] Error:", error);
    return NextResponse.redirect(`${adminUrl}?error=tiktokshop_callback_failed`);
  }
}
