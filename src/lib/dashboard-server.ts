import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";

import { getUserDisplayName } from "@/lib/user-settings";
import { listFlips } from "@/lib/flips-store";
import { SHOP_SLOT_COUNT } from "@/lib/shop";
import { listShopListings } from "@/lib/shop-store";
import { listTransactions } from "@/lib/store";
import { flipProfit, isFlipOpen, type TransactionType } from "@/lib/types";

export type DashboardRecentTransaction = {
  id: number;
  type: TransactionType;
  character: string;
  skin: string;
  rarity: string;
  star: number;
  price: number;
  createdAt: string;
};

export type DashboardOpenFlip = {
  id: number;
  character: string;
  skin: string;
  rarity: string;
  star: number;
  buyPrice: number;
  plannedSellPrice: number | null;
};

export type DashboardShopListing = {
  slotIndex: number;
  character: string;
  skin: string;
  rarity: string;
  star: number;
  price: number;
};

export type DashboardOverview = {
  displayName: string;
  transactions: {
    saleCount: number;
    purchaseCount: number;
    totalSaleVolume: number;
    totalPurchaseVolume: number;
    recent: DashboardRecentTransaction[];
  };
  flips: {
    openCount: number;
    closedCount: number;
    openBuyTotal: number;
    realizedProfit: number;
    recentOpen: DashboardOpenFlip[];
  };
  shop: {
    listingCount: number;
    totalListingValue: number;
    slotsRemaining: number;
    recentListings: DashboardShopListing[];
  };
};

const RECENT_TRANSACTION_LIMIT = 5;
const RECENT_OPEN_FLIP_LIMIT = 3;
const RECENT_SHOP_LIMIT = 5;

export async function loadDashboardOverview(
  user: User,
  supabase: SupabaseClient
): Promise<DashboardOverview> {
  const userId = user.id;

  const [allTransactions, allFlips, shopListings] = await Promise.all([
    listTransactions(),
    listFlips(supabase),
    listShopListings(supabase, userId),
  ]);

  const transactions = allTransactions.filter((entry) => entry.createdBy === userId);
  const sales = transactions.filter((entry) => entry.type === "sale");
  const purchases = transactions.filter((entry) => entry.type === "purchase");

  const flips = allFlips.filter((entry) => entry.createdBy === userId);
  const openFlips = flips.filter(isFlipOpen);
  const closedFlips = flips.filter((flip) => !isFlipOpen(flip));

  const realizedProfit = closedFlips.reduce((sum, flip) => sum + (flipProfit(flip) ?? 0), 0);
  const openBuyTotal = openFlips.reduce((sum, flip) => sum + flip.buyPrice, 0);
  const totalListingValue = shopListings.reduce((sum, listing) => sum + listing.price, 0);

  return {
    displayName: await getUserDisplayName(user, supabase),
    transactions: {
      saleCount: sales.length,
      purchaseCount: purchases.length,
      totalSaleVolume: sales.reduce((sum, entry) => sum + entry.price, 0),
      totalPurchaseVolume: purchases.reduce((sum, entry) => sum + entry.price, 0),
      recent: transactions.slice(0, RECENT_TRANSACTION_LIMIT).map((entry) => ({
        id: entry.id,
        type: entry.type,
        character: entry.character,
        skin: entry.skin,
        rarity: entry.rarity,
        star: entry.star,
        price: entry.price,
        createdAt: entry.createdAt,
      })),
    },
    flips: {
      openCount: openFlips.length,
      closedCount: closedFlips.length,
      openBuyTotal,
      realizedProfit,
      recentOpen: openFlips.slice(0, RECENT_OPEN_FLIP_LIMIT).map((flip) => ({
        id: flip.id,
        character: flip.character,
        skin: flip.skin,
        rarity: flip.rarity,
        star: flip.star,
        buyPrice: flip.buyPrice,
        plannedSellPrice: flip.plannedSellPrice,
      })),
    },
    shop: {
      listingCount: shopListings.length,
      totalListingValue,
      slotsRemaining: SHOP_SLOT_COUNT - shopListings.length,
      recentListings: shopListings.slice(0, RECENT_SHOP_LIMIT).map((listing) => ({
        slotIndex: listing.slotIndex,
        character: listing.character,
        skin: listing.skin,
        rarity: listing.rarity,
        star: listing.star,
        price: listing.price,
      })),
    },
  };
}
