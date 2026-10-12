import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { shopeeExchangeToken, shopeeGetShopInfo } from "@/lib/shopee-oauth";
import { encryptToken } from "@/lib/marketplace-crypto";
import { upsertMarketplaceAccount } from "@/lib/marketplace-store";

/**
 * GET /api/integrations/shopee/callback?code=<code>&shop_id=<shop_id>
 *
 * Shopee redirects here after the seller authorizes our app.
 * We exchange the code for tokens, encrypt them, and save to DB.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const shopId = searchParams.get("shop_id");
  const adminUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/admin/integrations`;

  // Cari data admin user (utamakan session, fallback ke default admin)
  const session = await getServerSession(authOptions);
  let adminEmail = session?.user?.email;
  if (!adminEmail) {
    adminEmail = process.env.ADMIN_DEFAULT_EMAIL || "jorgifatwaambia@gmail.com";
  }

  if (!code || !shopId) {
    console.error("[Shopee Callback] Missing code or shop_id:", { code, shopId });
    return NextResponse.redirect(`${adminUrl}?error=shopee_missing_params`);
  }

  try {
    // 1. Exchange code for access_token + refresh_token
    const tokenData = await shopeeExchangeToken(code, shopId);

    if (tokenData.error && tokenData.error !== "success" && tokenData.error !== "") {
      console.error("[Shopee Callback] Token exchange error:", tokenData);
      return NextResponse.redirect(`${adminUrl}?error=shopee_token_error`);
    }

    const expiresAt = new Date(Date.now() + tokenData.expire_in * 1000);

    // 2. Fetch shop name for display
    const shopInfo = await shopeeGetShopInfo(tokenData.access_token, shopId);
    const shopName = shopInfo?.shop_name || `Shopee Shop ${shopId}`;

    // 3. Encrypt tokens before storing
    const encryptedAccessToken = encryptToken(tokenData.access_token);
    const encryptedRefreshToken = encryptToken(tokenData.refresh_token);

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
      // Database offline, use default id
    }

    // 5. Upsert (create or update) the MarketplaceAccount record
    await upsertMarketplaceAccount({
      platform: "SHOPEE",
      shopId: String(shopId),
      shopName,
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      tokenExpiresAt: expiresAt,
      isActive: true,
      connectedById: adminUserId,
    });

    console.log(`[Shopee Callback] Connected: ${shopName} (shop_id: ${shopId})`);
    return NextResponse.redirect(`${adminUrl}?success=shopee_connected&shop=${encodeURIComponent(shopName)}`);
  } catch (error) {
    console.error("[Shopee Callback] Error:", error);
    return NextResponse.redirect(`${adminUrl}?error=shopee_callback_failed`);
  }
}
