import { prisma } from "@/lib/prisma";
import { shopeeRefreshToken } from "@/lib/shopee-oauth";
import { tikTokShopRefreshToken } from "@/lib/tiktokshop-oauth";
import { encryptToken, decryptToken } from "@/lib/marketplace-crypto";

/**
 * Refreshes marketplace access tokens that expire within `withinMs`.
 *
 * Shopee access tokens live ~4 hours and refresh tokens ~30 days, so this runs
 * both lazily (before any marketplace API call, see getActiveMarketplaceAccounts)
 * and from the daily cron (/api/integrations/refresh-tokens) so the refresh
 * token never lapses even when the shop is quiet.
 */
export interface RefreshSummary {
  checked: number;
  refreshed: number;
  failed: number;
  errors: string[];
}

let inFlight: Promise<RefreshSummary> | null = null;

export function refreshExpiringMarketplaceTokens(withinMs: number): Promise<RefreshSummary> {
  // One refresh at a time per server instance: a refresh token can only be used once.
  if (!inFlight) {
    inFlight = runRefresh(withinMs).finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

async function runRefresh(withinMs: number): Promise<RefreshSummary> {
  const threshold = new Date(Date.now() + withinMs);
  const expiring = await prisma.marketplaceAccount.findMany({
    where: { isActive: true, tokenExpiresAt: { lte: threshold } },
  });

  const summary: RefreshSummary = { checked: expiring.length, refreshed: 0, failed: 0, errors: [] };

  for (const account of expiring) {
    try {
      let refreshToken: string;
      try {
        refreshToken = decryptToken(account.refreshToken);
      } catch {
        throw new Error("Refresh token tidak bisa didekripsi (cek MARKETPLACE_ENCRYPTION_KEY)");
      }

      if (account.platform === "SHOPEE") {
        const result = await shopeeRefreshToken(refreshToken, account.shopId);
        if (result.error && result.error !== "success") {
          throw new Error(`Shopee refresh error: ${result.message}`);
        }
        await prisma.marketplaceAccount.update({
          where: { id: account.id },
          data: {
            accessToken: encryptToken(result.access_token),
            refreshToken: encryptToken(result.refresh_token),
            tokenExpiresAt: new Date(Date.now() + result.expire_in * 1000),
          },
        });
        summary.refreshed++;
      } else if (account.platform === "TIKTOK_SHOP") {
        const result = await tikTokShopRefreshToken(refreshToken);
        if (result.code !== 0) {
          throw new Error(`TikTok Shop refresh error: ${result.message}`);
        }
        await prisma.marketplaceAccount.update({
          where: { id: account.id },
          data: {
            accessToken: encryptToken(result.data.access_token),
            refreshToken: encryptToken(result.data.refresh_token),
            tokenExpiresAt: new Date(result.data.access_token_expire_in * 1000),
          },
        });
        summary.refreshed++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      summary.errors.push(`[${account.platform}:${account.shopId}] ${msg}`);
      summary.failed++;
      console.error(`[Token Refresh] ${account.platform} ${account.shopId}:`, err);
    }
  }

  return summary;
}
