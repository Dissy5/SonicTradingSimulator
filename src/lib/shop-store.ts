import type { SupabaseClient } from "@supabase/supabase-js";

import {
  emptyShopBoard,
  nextAvailableSlot,
  shopBoardFromListings,
  type ShopBoard,
  type ShopListing,
} from "@/lib/shop";
import { isSupabaseConfigured, type ShopListingRow } from "@/lib/supabase/server";

import { addTransaction } from "./store";
import * as localShop from "./shop-store-local";

function rowToListing(row: ShopListingRow): ShopListing {
  return {
    id: row.id,
    slotIndex: row.slot_index,
    character: row.character,
    skin: row.skin,
    rarity: row.rarity,
    star: row.star,
    price: row.price,
    createdAt: row.created_at,
    createdBy: row.created_by,
    recordedBy: row.recorded_by_email,
  };
}

export type ShopMutationContext = {
  userId: string;
  recordedBy: string;
  supabase: SupabaseClient;
};

export type ShopListingInput = {
  character: string;
  skin: string;
  rarity: string;
  star: number;
  price: number;
};

export async function getShopBoard(client: SupabaseClient, userId: string): Promise<ShopBoard> {
  await compactShopListings({
    userId,
    recordedBy: "",
    supabase: client,
  });
  const listings = await listShopListings(client, userId);
  return shopBoardFromListings(listings);
}

export async function listShopListings(
  client: SupabaseClient,
  userId: string
): Promise<ShopListing[]> {
  if (!isSupabaseConfigured()) {
    return localShop.listShopListingsForUser(userId);
  }

  const { data, error } = await client
    .from("shop_listings")
    .select("*")
    .eq("created_by", userId)
    .order("slot_index");

  if (error) throw new Error(error.message);
  return (data as ShopListingRow[]).map(rowToListing);
}

export async function compactShopListings(context: ShopMutationContext): Promise<void> {
  if (!isSupabaseConfigured()) {
    await localShop.compactShopListings(context.userId);
    return;
  }

  const listings = await listShopListings(context.supabase, context.userId);
  listings.sort((a, b) => a.slotIndex - b.slotIndex);

  if (!listings.some((listing, index) => listing.slotIndex !== index)) {
    return;
  }

  const { error: deleteError } = await context.supabase
    .from("shop_listings")
    .delete()
    .eq("created_by", context.userId);

  if (deleteError) throw new Error(deleteError.message);
  if (listings.length === 0) return;

  const rows = listings.map((listing, index) => ({
    slot_index: index,
    character: listing.character,
    skin: listing.skin,
    rarity: listing.rarity,
    star: listing.star,
    price: listing.price,
    created_by: context.userId,
    recorded_by_email: listing.recordedBy,
  }));

  const { error: insertError } = await context.supabase.from("shop_listings").insert(rows);
  if (insertError) throw new Error(insertError.message);
}

export async function addShopListing(
  input: ShopListingInput,
  context: ShopMutationContext
): Promise<ShopListing> {
  await compactShopListings(context);
  const listings = await listShopListings(context.supabase, context.userId);
  const slotIndex = nextAvailableSlot(listings);
  if (slotIndex == null) {
    throw new Error("Shop is full");
  }
  return upsertShopListing(slotIndex, input, context);
}

export async function upsertShopListing(
  slotIndex: number,
  input: ShopListingInput,
  context: ShopMutationContext
): Promise<ShopListing> {
  if (!isSupabaseConfigured()) {
    return localShop.upsertShopListing(slotIndex, input, context);
  }

  const { data, error } = await context.supabase
    .from("shop_listings")
    .upsert(
      {
        slot_index: slotIndex,
        character: input.character,
        skin: input.skin,
        rarity: input.rarity,
        star: input.star,
        price: input.price,
        created_by: context.userId,
        recorded_by_email: context.recordedBy,
      },
      { onConflict: "created_by,slot_index" }
    )
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return rowToListing(data as ShopListingRow);
}

export async function deleteShopListing(
  slotIndex: number,
  context: ShopMutationContext
): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    const removed = await localShop.deleteShopListing(slotIndex, context.userId);
    return removed;
  }

  const { data, error } = await context.supabase
    .from("shop_listings")
    .delete()
    .eq("slot_index", slotIndex)
    .eq("created_by", context.userId)
    .select("id");

  if (error) throw new Error(error.message);
  await compactShopListings(context);
  return (data?.length ?? 0) > 0;
}

export async function clearShop(context: ShopMutationContext): Promise<number> {
  if (!isSupabaseConfigured()) {
    return localShop.clearShopListings(context.userId);
  }

  const { data, error } = await context.supabase
    .from("shop_listings")
    .delete()
    .eq("created_by", context.userId)
    .select("id");

  if (error) throw new Error(error.message);
  return data?.length ?? 0;
}

async function logShopSale(listing: ShopListing, context: ShopMutationContext) {
  await addTransaction(
    {
      type: "sale",
      character: listing.character,
      skin: listing.skin,
      rarity: listing.rarity,
      star: listing.star,
      price: listing.price,
    },
    {
      userId: context.userId,
      recordedBy: context.recordedBy,
      supabase: context.supabase,
    }
  );
}

export async function markShopListingSold(
  slotIndex: number,
  context: ShopMutationContext,
  salePrice?: number
): Promise<void> {
  const listings = await listShopListings(context.supabase, context.userId);
  const listing = listings.find((item) => item.slotIndex === slotIndex);
  if (!listing) throw new Error("Shop listing not found");

  const price = salePrice ?? listing.price;
  if (!Number.isInteger(price) || price < 0) {
    throw new Error("Invalid sale price");
  }

  const saleListing = { ...listing, price };

  await logShopSale(saleListing, context);
  await deleteShopListing(slotIndex, context);
}

export async function markAllShopListingsSold(context: ShopMutationContext): Promise<number> {
  const listings = await listShopListings(context.supabase, context.userId);
  if (listings.length === 0) return 0;

  for (const listing of listings) {
    await logShopSale(listing, context);
  }

  return clearShop(context);
}

export { emptyShopBoard };
