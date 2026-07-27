/**
 * Central product configuration for Tally.
 * The working name can be changed here in one place.
 */
export const PRODUCT = {
  name: "Tally",
  tagline: "Shared costs, clearly.",
  defaultCurrency: "AUD" as const,
  /** Session cookie name for production (uses __Host- prefix, requires Secure) */
  prodCookieName: "__Host-tally_session",
  /** Session cookie name for local dev (no HTTPS, no __Host- prefix) */
  devCookieName: "tally_dev_session",
  /** Rolling session lifetime in seconds (~365 days) */
  sessionMaxAgeSeconds: 60 * 60 * 24 * 365,
  /** Practical amount ceiling in minor units per expense (default: $1,000,000) */
  maxExpenseMinor: 100_000_000,
} as const;

/** Curated member colour palette — 10 colours, each with a foreground pairing. */
export const MEMBER_COLOURS = [
  { key: "green", fill: "#34C759", fg: "#FFFFFF" },
  { key: "blue", fill: "#007AFF", fg: "#FFFFFF" },
  { key: "purple", fill: "#AF52DE", fg: "#FFFFFF" },
  { key: "orange", fill: "#FF9500", fg: "#FFFFFF" },
  { key: "red", fill: "#FF3B30", fg: "#FFFFFF" },
  { key: "teal", fill: "#00C7BE", fg: "#FFFFFF" },
  { key: "indigo", fill: "#5856D6", fg: "#FFFFFF" },
  { key: "pink", fill: "#FF2D92", fg: "#FFFFFF" },
  { key: "amber", fill: "#FFB800", fg: "#1D1D1F" },
  { key: "slate", fill: "#6366F1", fg: "#FFFFFF" },
] as const;

export type MemberColourKey = (typeof MEMBER_COLOURS)[number]["key"];

export function getColour(key: string) {
  return MEMBER_COLOURS.find((c) => c.key === key) ?? MEMBER_COLOURS[0];
}

/** Default expense categories (system-scoped, group_id = null). */
export const DEFAULT_CATEGORIES = [
  { name: "General", iconKey: "tag" },
  { name: "Food & drink", iconKey: "utensils" },
  { name: "Groceries", iconKey: "shopping-cart" },
  { name: "Transport", iconKey: "car" },
  { name: "Accommodation", iconKey: "home" },
  { name: "Household bills", iconKey: "receipt" },
  { name: "Entertainment", iconKey: "film" },
  { name: "Shopping", iconKey: "shopping-bag" },
] as const;
