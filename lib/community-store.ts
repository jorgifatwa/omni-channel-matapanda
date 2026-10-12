/**
 * community-store.ts
 *
 * Configurable Instagram UGC / Community Showcase items for it'smatapanda,
 * matching Beyond The Vines modal viewer & horizontal carousel.
 */

export interface CommunityPost {
  id: string;
  image: string;
  accountHandle: string;
  accountAvatarUrl?: string | null;
  caption: string;
  postDate?: string | null;
  instagramUrl?: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export const INITIAL_COMMUNITY_POSTS: CommunityPost[] = [
  {
    id: "cp-1",
    image:
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=85",
    accountHandle: "itsmatapanda",
    caption:
      "Caught in between errands. @chelsea.k spotted in Micro Dumpling Bag in Olive Green #itsmatapandaOnYou #DumplingSeries",
    postDate: "Oct 02",
    instagramUrl: "https://www.instagram.com/p/itsmatapanda-1",
    sortOrder: 0,
    isActive: true,
    createdAt: "2026-10-01",
  },
  {
    id: "cp-2",
    image:
      "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=85",
    accountHandle: "itsmatapanda",
    caption:
      "Monochrome layers with structured carry. @rayhan_studio carrying the Everyday Canvas Tote Bag in Natural Ecru #itsmatapandaOnYou",
    postDate: "Sep 28",
    instagramUrl: "https://www.instagram.com/p/itsmatapanda-2",
    sortOrder: 1,
    isActive: true,
    createdAt: "2026-10-01",
  },
  {
    id: "cp-3",
    image:
      "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1200&q=85",
    accountHandle: "itsmatapanda",
    caption:
      "Sunset stroll in Tokyo with @nadia.v in Puffer Cloud Shoulder Bag in Cloud White #itsmatapandaOnYou #PufferBag",
    postDate: "Sep 22",
    instagramUrl: "https://www.instagram.com/p/itsmatapanda-3",
    sortOrder: 2,
    isActive: true,
    createdAt: "2026-10-01",
  },
  {
    id: "cp-4",
    image:
      "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1200&q=85",
    accountHandle: "itsmatapanda",
    caption:
      "Daily essentials only. @kenji.t keeping it functional with Mini Crescent Sling Bag in Matcha Green #itsmatapandaOnYou",
    postDate: "Sep 18",
    instagramUrl: "https://www.instagram.com/p/itsmatapanda-4",
    sortOrder: 3,
    isActive: true,
    createdAt: "2026-10-01",
  },
  {
    id: "cp-5",
    image:
      "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1200&q=85",
    accountHandle: "itsmatapanda",
    caption:
      "Playful weekend palette. @sarah.lim styling XS Dumpling Bag in Butter Cream #itsmatapandaOnYou",
    postDate: "Sep 14",
    instagramUrl: "https://www.instagram.com/p/itsmatapanda-5",
    sortOrder: 4,
    isActive: true,
    createdAt: "2026-10-01",
  },
  {
    id: "cp-6",
    image:
      "https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?auto=format&fit=crop&w=1200&q=85",
    accountHandle: "itsmatapanda",
    caption:
      "Urban coffee break in Bandung. @darius.m equipped with City Explorer Backpack in Matte Black #itsmatapandaOnYou",
    postDate: "Sep 09",
    instagramUrl: "https://www.instagram.com/p/itsmatapanda-6",
    sortOrder: 5,
    isActive: true,
    createdAt: "2026-10-01",
  },
  {
    id: "cp-7",
    image:
      "https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=1200&q=85",
    accountHandle: "itsmatapanda",
    caption:
      "Studio checklist ready. @aline.j with Reversible Nylon Shopper Tote in Cobalt / Lilac #itsmatapandaOnYou",
    postDate: "Sep 05",
    instagramUrl: "https://www.instagram.com/p/itsmatapanda-7",
    sortOrder: 6,
    isActive: true,
    createdAt: "2026-10-01",
  },
  {
    id: "cp-8",
    image:
      "https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?auto=format&fit=crop&w=1200&q=85",
    accountHandle: "itsmatapanda",
    caption:
      "Heavy rotation for work & weekend. @marcus.wu with M Dumpling Bag in Midnight Navy #itsmatapandaOnYou",
    postDate: "Aug 29",
    instagramUrl: "https://www.instagram.com/p/itsmatapanda-8",
    sortOrder: 7,
    isActive: true,
    createdAt: "2026-10-01",
  },
];
