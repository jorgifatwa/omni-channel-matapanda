import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { tikTokShopExchangeToken, tikTokShopGetAuthorizedShops } from "@/lib/tiktokshop-oauth";
import { encryptToken } from "@/lib/marketplace-crypto";
import { upsertMarketplaceAccount } from "@/lib/marketplace-store";
import { verifyOAuthState } from "@/lib/oauth-state";

/**
 * GET /api/integrations/tiktokshop/callback?code=<code>&shop_cipher=<shop_cipher>
 *
 * TikTok Shop redirects here after the seller authorizes our app.
 * We exchange the code for tokens, encrypt them, and save to DB.
 *
 * Note: shop_cipher is TikTok's encrypted shop identifier; the actual
 * shop/seller ID comes from the token exchange response (open_id).
 */
/** Short, token-free description of an error, safe to show to the admin. */
function describeError(step: string, error: unknown): string {
  const raw = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  const clean = raw
    .replace(/(access_token|refresh_token|app_secret|auth_code)=[^&\s"]+/gi, "$1=***")
    .replace(/\s+/g, " ")
    .trim();
  return `[${step}] ${clean}`.slice(0, 300);
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code") || searchParams.get("auth_code");
  const adminUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/admin/integrations`;

  // Hanya admin yang sedang login yang boleh menghubungkan toko. Tanpa ini,
  // siapa pun bisa menyambungkan tokonya sendiri ke website ini.
  const session = await getServerSession(authOptions);
  const adminEmail =
    (session?.user as { role?: string } | undefined)?.role === "ADMIN" ? session?.user?.email : null;
  if (!adminEmail) {
    return NextResponse.redirect(`${adminUrl}?error=unauthorized`);
  }

  // CSRF: the connection must have been started from this browser via /connect
  if (!verifyOAuthState(request, "tiktokshop")) {
    return NextResponse.redirect(`${adminUrl}?error=oauth_state_invalid`);
  }

  if (!code) {
    console.error("[TikTok Shop Callback] Missing authorization code");
    return NextResponse.redirect(`${adminUrl}?error=tiktokshop_missing_code`);
  }

  const fail = (error: string, detail?: string) =>
    NextResponse.redirect(
      `${adminUrl}?error=${error}${detail ? `&detail=${encodeURIComponent(detail)}` : ""}`
    );

  let step = "token_exchange";
  try {
    // 1. Exchange code for tokens
    const tokenData = await tikTokShopExchangeToken(code);

    if (tokenData.code !== 0 || !tokenData.data?.access_token) {
      console.error("[TikTok Shop Callback] Token exchange error:", tokenData.code, tokenData.message);
      return fail("tiktokshop_token_error", `[token_exchange] code ${tokenData.code}: ${tokenData.message}`);
    }

    const {
      access_token,
      refresh_token,
      access_token_expire_in,
      open_id,
    } = tokenData.data;

    const expiresAt = new Date(access_token_expire_in * 1000);

    step = "get_authorized_shops";
    // 2. Get the authorized shop and its cipher (required by every shop API)
    const { shops, error: shopsError } = await tikTokShopGetAuthorizedShops(access_token);
    const shop = shops.find((s) => s.region === "ID") || shops[0];
    if (!shop?.cipher) {
      console.error("[TikTok Shop Callback] No authorized shop returned:", shopsError);
      return fail("tiktokshop_no_shop", `[get_authorized_shops] ${shopsError || "no shops returned"}`);
    }
    const shopName = shop.name || `TikTok Shop ${shop.id}`;

    step = "encrypt_tokens";
    // 3. Encrypt tokens
    const encryptedAccessToken = encryptToken(access_token);
    const encryptedRefreshToken = encryptToken(refresh_token);

    step = "find_admin_user";
    // 4. Find admin user id (must exist in the database)
    const adminUser = await prisma.user.findFirst({
      where: { email: adminEmail, role: "ADMIN" },
      select: { id: true },
    });
    if (!adminUser) {
      return NextResponse.redirect(`${adminUrl}?error=admin_not_found`);
    }
    const adminUserId = adminUser.id;

    step = "save_to_database";
    // 5. Upsert MarketplaceAccount
    await upsertMarketplaceAccount({
      platform: "TIKTOK_SHOP",
      shopId: shop.cipher,
      shopName,
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      tokenExpiresAt: expiresAt,
      isActive: true,
      connectedById: adminUserId,
    });

    console.log(`[TikTok Shop Callback] Connected: ${shopName} (shop id: ${shop.id}, open_id: ${open_id})`);
    return NextResponse.redirect(
      `${adminUrl}?success=tiktokshop_connected&shop=${encodeURIComponent(shopName)}`
    );
  } catch (error) {
    console.error(`[TikTok Shop Callback] Error at step ${step}:`, error);
    return fail("tiktokshop_callback_failed", describeError(step, error));
  }
}
