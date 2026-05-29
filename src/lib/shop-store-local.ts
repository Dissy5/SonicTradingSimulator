import fs from "fs/promises";
import path from "path";

import type { ShopListing } from "@/lib/shop";
import { nextAvailableSlot } from "@/lib/shop";

const shopPath = path.join(process.cwd(), "data", "shop.json");

type ShopContext = {
  userId: string;
  recordedBy: string;
};

async function ensureShopFile() {
  try {
    await fs.access(shopPath);
  } catch {
    await fs.mkdir(path.dirname(shopPath), { recursive: true });
    await fs.writeFile(shopPath, "[]\n", "utf-8");
  }
}

async function readListings(): Promise<ShopListing[]> {
  await ensureShopFile();
  const raw = await fs.readFile(shopPath, "utf-8");
  return JSON.parse(raw) as ShopListing[];
}

async function writeListings(listings: ShopListing[]) {
  await fs.mkdir(path.dirname(shopPath), { recursive: true });
  await fs.writeFile(shopPath, `${JSON.stringify(listings, null, 2)}\n`, "utf-8");
}

export async function listShopListings(_userId: string): Promise<ShopListing[]> {
  return readListings();
}

export async function compactShopListings(userId: string): Promise<void> {
  const listings = await readListings();
  const userListings = listings
    .filter((listing) => listing.createdBy === userId)
    .sort((a, b) => a.slotIndex - b.slotIndex);
  const others = listings.filter((listing) => listing.createdBy !== userId);

  userListings.forEach((listing, index) => {
    listing.slotIndex = index;
  });

  await writeListings([...others, ...userListings]);
}

export async function addShopListing(
  input: {
    character: string;
    skin: string;
    rarity: string;
    star: number;
    price: number;
  },
  context: ShopContext
): Promise<ShopListing> {
  await compactShopListings(context.userId);
  const listings = await listShopListingsForUser(context.userId);
  const slotIndex = nextAvailableSlot(listings);
  if (slotIndex == null) {
    throw new Error("Shop is full");
  }
  return upsertShopListing(slotIndex, input, context);
}

export async function upsertShopListing(
  slotIndex: number,
  input: {
    character: string;
    skin: string;
    rarity: string;
    star: number;
    price: number;
  },
  context: ShopContext
): Promise<ShopListing> {
  const listings = await readListings();
  const existingIndex = listings.findIndex((listing) => listing.slotIndex === slotIndex);

  const listing: ShopListing = {
    id:
      existingIndex === -1
        ? listings.reduce((max, item) => Math.max(max, item.id), 0) + 1
        : listings[existingIndex].id,
    slotIndex,
    character: input.character,
    skin: input.skin,
    rarity: input.rarity,
    star: input.star,
    price: input.price,
    createdAt:
      existingIndex === -1 ? new Date().toISOString() : listings[existingIndex].createdAt,
    createdBy: context.userId,
    recordedBy: context.recordedBy,
  };

  if (existingIndex === -1) {
    listings.push(listing);
  } else {
    listings[existingIndex] = listing;
  }

  await writeListings(listings);
  return listing;
}

export async function deleteShopListing(slotIndex: number, userId: string): Promise<boolean> {
  const listings = await readListings();
  const next = listings.filter(
    (listing) => !(listing.slotIndex === slotIndex && listing.createdBy === userId)
  );
  if (next.length === listings.length) return false;
  await writeListings(next);
  await compactShopListings(userId);
  return true;
}

export async function clearShopListings(userId: string): Promise<number> {
  const listings = await readListings();
  const next = listings.filter((listing) => listing.createdBy !== userId);
  const removed = listings.length - next.length;
  await writeListings(next);
  return removed;
}

export async function updateRecordedByForUser(userId: string, recordedBy: string): Promise<number> {
  const listings = await readListings();
  let count = 0;
  const next = listings.map((listing) => {
    if (listing.createdBy !== userId) return listing;
    count++;
    return { ...listing, recordedBy };
  });
  if (count > 0) {
    await writeListings(next);
  }
  return count;
}

export async function listShopListingsForUser(userId: string): Promise<ShopListing[]> {
  const listings = await readListings();
  return listings.filter((listing) => listing.createdBy === userId);
}
