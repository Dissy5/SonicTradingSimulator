import { getSkinImagePath } from "@/lib/catalog";
import type { Transaction, SkinCatalog } from "@/lib/types";
import { tierIndexForAverage, VALUE_TIER_DEFINITIONS } from "@/lib/values-tiers";
import { weightedAveragePrice } from "@/lib/values-weighting";

import { listTransactionsForValues } from "./store";

export type ValuedSkin = {
  character: string;
  skin: string;
  rarity: string;
  imagePath: string | null;
  averagePrice: number | null;
};

export type ValuesTierRow = {
  label: string;
  skins: ValuedSkin[];
};

export type ValuesScope = "mine" | "all";

function skinKey(character: string, skin: string, rarity: string): string {
  return `${character}\0${skin}\0${rarity}`;
}

export function buildAveragePricesBySkinFromSales(transactions: Transaction[]): Map<string, number> {
  const groups = new Map<string, { price: number; date: string }[]>();

  for (const transaction of transactions) {
    if (transaction.type !== "sale") continue;
    const key = skinKey(transaction.character, transaction.skin, transaction.rarity);
    const prices = groups.get(key) ?? [];
    prices.push({ price: transaction.price, date: transaction.date });
    groups.set(key, prices);
  }

  const averages = new Map<string, number>();
  for (const [key, entries] of groups) {
    const average = weightedAveragePrice(entries);
    if (average != null) {
      averages.set(key, average);
    }
  }

  return averages;
}

export function listCatalogSkins(catalog: SkinCatalog): ValuedSkin[] {
  const skins: ValuedSkin[] = [];

  for (const [character, entries] of Object.entries(catalog)) {
    for (const [name, rarity] of entries.map(([skinName, skinRarity]) => [skinName, skinRarity] as const)) {
      skins.push({
        character,
        skin: name,
        rarity,
        imagePath: getSkinImagePath(catalog, character, name, rarity),
        averagePrice: null,
      });
    }
  }

  return skins.sort((a, b) => {
    const byCharacter = a.character.localeCompare(b.character);
    if (byCharacter !== 0) return byCharacter;
    const bySkin = a.skin.localeCompare(b.skin);
    if (bySkin !== 0) return bySkin;
    return a.rarity.localeCompare(b.rarity);
  });
}

export async function buildValuesTierRows(
  catalog: SkinCatalog,
  options?: { userId?: string | null }
): Promise<ValuesTierRow[]> {
  let transactions = await listTransactionsForValues(options);

  const averages = buildAveragePricesBySkinFromSales(transactions);
  const catalogSkins = listCatalogSkins(catalog).map((entry) => ({
    ...entry,
    averagePrice: averages.get(skinKey(entry.character, entry.skin, entry.rarity)) ?? null,
  }));

  const buckets = VALUE_TIER_DEFINITIONS.map((tier) => ({
    label: tier.label,
    skins: [] as ValuedSkin[],
  }));

  for (const entry of catalogSkins) {
    const index = tierIndexForAverage(entry.averagePrice);
    buckets[index].skins.push(entry);
  }

  for (const bucket of buckets) {
    bucket.skins.sort((a, b) => (b.averagePrice ?? 0) - (a.averagePrice ?? 0));
  }

  return buckets.filter((bucket) => bucket.skins.length > 0);
}
