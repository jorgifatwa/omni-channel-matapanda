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
