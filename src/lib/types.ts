export type Sale = {
  id: number;
  character: string;
  skin: string;
  rarity: string;
  star: number;
  price: number;
  createdAt: string;
  createdBy: string | null;
  recordedBy: string | null;
};

export type Flip = {
  id: number;
  character: string;
  skin: string;
  rarity: string;
  star: number;
  buyPrice: number;
  plannedSellPrice: number | null;
  sellPrice: number | null;
  boughtAt: string;
  soldAt: string | null;
  createdBy: string | null;
  recordedBy: string | null;
};

export function flipProfit(flip: Flip): number | null {
  if (flip.sellPrice == null) return null;
  return flip.sellPrice - flip.buyPrice;
}

export function isFlipOpen(flip: Flip): boolean {
  return flip.sellPrice == null;
}

export type SkinCatalog = Record<string, [string, string, string][]>;

export type SkinEntry = {
  name: string;
  rarity: string;
  imagePath: string;
};
