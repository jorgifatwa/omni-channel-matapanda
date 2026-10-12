import { NextResponse } from "next/server";
import { getActiveDiscounts } from "@/lib/discount-store";

/**
 * GET /api/discounts/active
 * Returns currently active campaigns and announcement banner text
 */
export async function GET() {
  try {
    const active = getActiveDiscounts();
    const bannerCampaign = active.find((c) => Boolean(c.bannerText && c.bannerText.trim()));

    return NextResponse.json({
      success: true,
      activeCampaigns: active,
      bannerText: bannerCampaign?.bannerText || null,
      bannerCampaignName: bannerCampaign?.name || null,
    });
  } catch (error) {
    console.error("[Active Discounts API] Error:", error);
    return NextResponse.json({ success: false, activeCampaigns: [] }, { status: 500 });
  }
}
