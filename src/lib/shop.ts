export const SHOP_SLOT_COUNT = 25;
export const SHOP_GRID_SIZE = 5;

export type ShopListing = {
  id: number;
  slotIndex: number;
  character: string;
  skin: string;
  rarity: string;
  star: number;
  price: number;
  createdAt: string;
  createdBy: string | null;
  recordedBy: string | null;
};

export type ShopSlot = ShopListing | null;

export type ShopBoard = ShopSlot[];

export function emptyShopBoard(): ShopBoard {
  return Array.from({ length: SHOP_SLOT_COUNT }, () => null);
}

export function shopBoardFromListings(listings: ShopListing[]): ShopBoard {
  const board = emptyShopBoard();
  for (const listing of listings) {
    if (listing.slotIndex >= 0 && listing.slotIndex < SHOP_SLOT_COUNT) {
      board[listing.slotIndex] = listing;
    }
  }
  return board;
}

export function nextAvailableSlot(listings: ShopListing[]): number | null {
  if (listings.length >= SHOP_SLOT_COUNT) return null;
  const used = new Set(listings.map((listing) => listing.slotIndex));
  for (let index = 0; index < SHOP_SLOT_COUNT; index++) {
    if (!used.has(index)) return index;
  }
  return null;
}
