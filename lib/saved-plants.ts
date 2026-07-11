// Shared (client + server) metadata for the saved-plant categories shown on
// the Garden tab. Pure module — no Prisma import, safe in client components.

export const SAVED_CATEGORIES = {
  GARDEN: { label: "My garden", emoji: "🌳" },
  WISHLIST: { label: "Wishlist", emoji: "💚" },
  SPOTTED: { label: "Spotted", emoji: "👀" },
} as const;

export type SavedCategoryKey = keyof typeof SAVED_CATEGORIES;

export const SAVED_CATEGORY_KEYS = Object.keys(
  SAVED_CATEGORIES
) as SavedCategoryKey[];

export function parseSavedCategory(value: unknown): SavedCategoryKey | null {
  return typeof value === "string" &&
    (SAVED_CATEGORY_KEYS as string[]).includes(value)
    ? (value as SavedCategoryKey)
    : null;
}
