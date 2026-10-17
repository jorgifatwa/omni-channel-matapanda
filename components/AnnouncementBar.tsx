"use client";

import * as React from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { getStorefrontAnnouncements, type AnnouncementMessage } from "@/lib/announcements";

export default function AnnouncementBar() {
  const [announcements, setAnnouncements] = React.useState<AnnouncementMessage[]>(() =>
    getStorefrontAnnouncements()
  );

  React.useEffect(() => {
    let isMounted = true;

    async function loadAnnouncements() {
      let baseAnnouncements = getStorefrontAnnouncements();

      try {
        const res = await fetch("/api/announcements/active");
        if (res.ok) {
          const data = await res.json();
          if (data?.announcements && Array.isArray(data.announcements) && data.announcements.length > 0) {
            baseAnnouncements = data.announcements;
          }
        }
      } catch {
        // Use static fallback
      }

      try {
        const promoRes = await fetch("/api/discounts/active");
        if (promoRes.ok) {
          const promoData = await promoRes.json();
          if (promoData?.activeCampaigns && Array.isArray(promoData.activeCampaigns)) {
            const promoItems: AnnouncementMessage[] = [];
            for (const d of promoData.activeCampaigns) {
              if (!d.isActive || !d.bannerText?.trim()) continue;

              promoItems.push({
                id: `discount-${d.id}`,
                text: d.bannerText.trim().toUpperCase(),
                link:
                  d.targetType === "CATEGORY" && d.targetCategoryIds?.[0]
                    ? `/categories/${d.targetCategoryIds[0]}`
                    : "/new-arrivals",
                badge: "PROMO",
                isPromo: true,
              });
            }
            if (promoItems.length > 0) {
              baseAnnouncements = [...promoItems, ...baseAnnouncements];
            }
          }
        }
      } catch {
        // Fallback silently
      }

      if (isMounted) {
        setAnnouncements(baseAnnouncements);
      }
    }

    loadAnnouncements();

    return () => {
      isMounted = false;
    };
  }, []);

  const { status: authStatus } = useSession();
  const isAuthenticated = authStatus === "authenticated";

  // Sembunyikan ajakan registrasi/club jika customer sudah login
  const visibleAnnouncements = React.useMemo(() => {
    if (!isAuthenticated) return announcements;
    return announcements.filter(
      (item) => item.link !== "/account/register" && !item.text.toLowerCase().includes("join the")
    );
  }, [announcements, isAuthenticated]);

  if (!visibleAnnouncements || visibleAnnouncements.length === 0) {
    return null;
  }

  // Duplicate for seamless infinite marquee loop
  const tickerItems = [...visibleAnnouncements, ...visibleAnnouncements];

  return (
    <div
      className="w-full max-w-full bg-[#2a493e] text-white overflow-hidden border-b border-[#213b32] select-none"
      role="region"
      aria-label="Announcements"
    >
      <div className="py-2 sm:py-2.5">
        <div className="animate-ticker flex items-center">
          {tickerItems.map((item, index) => (
            <div
              key={`${item.id}-${index}`}
              className="flex items-center shrink-0"
            >
              <Link
                href={item.link || "/new-arrivals"}
                className="inline-flex items-center gap-2 px-6 sm:px-8 text-[11px] sm:text-xs font-bold font-heading tracking-wide uppercase text-white hover:text-green-400 transition-colors"
              >
                {item.badge && (
                  <span
                    className={`inline-block text-[9px] font-black font-heading px-2 py-0.5 rounded-full tracking-wider ${
                      item.isPromo
                        ? "bg-[#ED96D7] text-[#233a32]"
                        : "bg-[#dcf58d] text-[#233a32]"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
                <span>{item.text}</span>
              </Link>
              <span className="text-[#dcf58d]/40 text-xs px-2 select-none" aria-hidden="true">
                &bull;
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
