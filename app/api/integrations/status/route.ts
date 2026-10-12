import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getActiveMarketplaceAccounts,
  deactivateMarketplaceAccount,
} from "@/lib/marketplace-store";

/**
 * GET /api/integrations/status
 * Returns the connection status of all marketplace accounts for the admin UI.
 * Access tokens are NOT returned — only metadata (shopName, expiresAt, isActive).
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const accounts = await getActiveMarketplaceAccounts();

    const now = new Date();
    const enriched = accounts.map((acc) => {
      const expiresAt = new Date(acc.tokenExpiresAt);
      const isTokenExpired = expiresAt < now;
      const isTokenExpiringSoon =
        !isTokenExpired &&
        expiresAt.getTime() - now.getTime() < 30 * 60 * 1000; // < 30 min
      return {
        id: acc.id,
        platform: acc.platform,
        shopId: acc.shopId,
        shopName: acc.shopName,
        tokenExpiresAt: acc.tokenExpiresAt,
        isActive: acc.isActive,
        connectedAt: acc.connectedAt,
        connectedBy: acc.connectedBy,
        isTokenExpired,
        isTokenExpiringSoon,
      };
    });

    return NextResponse.json({ accounts: enriched });
  } catch (error) {
    console.error("[Integrations Status] Error:", error);
    return NextResponse.json({ error: "Gagal memuat status integrasi" }, { status: 500 });
  }
}

/**
 * DELETE /api/integrations/status?id=<account_id>
 * Disconnects (soft-deletes by setting isActive=false) a marketplace account.
 */
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing account id" }, { status: 400 });
  }

  try {
    await deactivateMarketplaceAccount(id);
    return NextResponse.json({ success: true, message: "Koneksi marketplace berhasil diputus." });
  } catch (error) {
    console.error("[Integrations Disconnect] Error:", error);
    return NextResponse.json({ error: "Gagal memutus koneksi" }, { status: 500 });
  }
}

