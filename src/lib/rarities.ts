export const SKIN_RARITIES = [
  "Common",
  "Uncommon",
  "Rare",
  "Epic",
  "Legendary",
  "Exotic",
  "Limited",
  "Seasonal",
  "Super",
] as const;

export type SkinRarity = (typeof SKIN_RARITIES)[number];
