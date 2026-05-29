export type TransactionType = "sale" | "purchase";

export type Transaction = {
  id: number;
  type: TransactionType;
  character: string;
  skin: string;
  rarity: string;
  star: number;
  price: number;
  date: string;
  createdAt: string;
  createdBy: string | null;
  recordedBy: string | null;
  /** Admin-only placeholder sales for the values sheet; hidden from transaction history. */
  manualValueOnly?: boolean;
};

/** @deprecated Use Transaction */
export type Sale = Transaction;

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
