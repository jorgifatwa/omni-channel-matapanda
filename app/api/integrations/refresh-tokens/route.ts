import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { shopeeRefreshToken } from "@/lib/shopee-oauth";
import { tikTokShopRefreshToken } from "@/lib/tiktokshop-oauth";
import { encryptToken, decryptToken } from "@/lib/marketplace-crypto";

/**
 * POST /api/integrations/refresh-tokens
 *
 * Checks all active marketplace accounts and refreshes tokens
 * that will expire within the next 60 minutes.
 *
 * This route is designed to be called by:
 * 1. A cron job / scheduler (e.g., Vercel Cron, external service)
 * 2. Automatically before any marketplace API call (lazy refresh)
 *
 * Protected by a shared secret: Authorization: Bearer <CRON_SECRET>
 * Set CRON_SECRET in .env (any random string).
 */
export async function POST(request: Request) {
  // Authenticate the cron caller
  const authHeader = request.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const expiryThreshold = new Date(now.getTime() + 60 * 60 * 1000); // 60 minutes from now

  let refreshed = 0;
  let failed = 0;
  const errors: string[] = [];

  try {
    // Find all active accounts whose token expires within the next hour
    const expiring = await prisma.marketplaceAccount.findMany({
      where: {
        isActive: true,
        tokenExpiresAt: { lte: expiryThreshold },
      },
    });

    for (const account of expiring) {
      try {
        let decryptedRefreshToken: string;
        try {
          decryptedRefreshToken = decryptToken(account.refreshToken);
        } catch {
          errors.push(`[${account.platform}:${account.shopId}] Failed to decrypt refresh token`);
          failed++;
          continue;
        }

        if (account.platform === "SHOPEE") {
          const result = await shopeeRefreshToken(decryptedRefreshToken, account.shopId);

          if (result.error && result.error !== "success" && result.error !== "") {
            throw new Error(`Shopee refresh error: ${result.message}`);
          }

          const newExpiry = new Date(Date.now() + result.expire_in * 1000);
          await prisma.marketplaceAccount.update({
            where: { id: account.id },
            data: {
              accessToken: encryptToken(result.access_token),
              refreshToken: encryptToken(result.refresh_token),
              tokenExpiresAt: newExpiry,
            },
          });

          console.log(`[Token Refresh] Shopee ${account.shopId} — new expiry: ${newExpiry.toISOString()}`);
          refreshed++;

        } else if (account.platform === "TIKTOK_SHOP") {
          const result = await tikTokShopRefreshToken(decryptedRefreshToken);

          if (result.code !== 0) {
            throw new Error(`TikTok Shop refresh error: ${result.message}`);
          }

          const newExpiry = new Date(result.data.access_token_expire_in * 1000);
          await prisma.marketplaceAccount.update({
            where: { id: account.id },
            data: {
              accessToken: encryptToken(result.data.access_token),
              refreshToken: encryptToken(result.data.refresh_token),
              tokenExpiresAt: newExpiry,
            },
          });

          console.log(`[Token Refresh] TikTok Shop ${account.shopId} — new expiry: ${newExpiry.toISOString()}`);
          refreshed++;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        errors.push(`[${account.platform}:${account.shopId}] ${msg}`);
        console.error(`[Token Refresh] Error ${account.platform} ${account.shopId}:`, err);
        failed++;
      }
    }

    return NextResponse.json({
      success: true,
      checked: expiring.length,
      refreshed,
      failed,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("[Token Refresh] Fatal error:", error);
    return NextResponse.json({ error: "Token refresh failed" }, { status: 500 });
  }
}
