export const TPT_CATEGORIES = ["love", "improve", "open-notes"] as const;

export type TptCategory = (typeof TPT_CATEGORIES)[number];
export type TptStatus = "pending" | "approved";

export const TPT_CATEGORY_META: Record<
  TptCategory,
  {
    label: string;
    shortLabel: string;
    description: string;
  }
> = {
  love: {
    label: "What people love",
    shortLabel: "Love",
    description: "Stories about feedback that felt useful, fair, or motivating.",
  },
  improve: {
    label: "Where we can improve",
    shortLabel: "Improve",
    description: "Constructive notes about where DocuPeer can become stronger.",
  },
  "open-notes": {
    label: "Open notes",
    shortLabel: "Open",
    description: "Helpful reflections that do not fit neatly into one box yet.",
  },
};

export type TptPublicItem = {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  publicName: string;
  category: TptCategory;
  featured: boolean;
  approvedAt: string | null;
  createdAt: string;
};

export type TptAdminItem = TptPublicItem & {
  status: TptStatus;
  suggestedCategory: TptCategory | null;
  displayName: string | null;
  isAnonymous: boolean;
  consentToPublish: boolean;
  userId: string | null;
  updatedAt: string;
};

export type TptPublicPayload = {
  items: TptPublicItem[];
  counts: Record<TptCategory, number> & { total: number };
};
