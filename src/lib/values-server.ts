import { getSkinImagePath } from "@/lib/catalog";
import type { Sale, SkinCatalog } from "@/lib/types";
import { tierIndexForAverage, VALUE_TIER_DEFINITIONS } from "@/lib/values-tiers";

import { listSales } from "./store";

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

export function buildAveragePricesBySkinFromSales(sales: Sale[]): Map<string, number> {
  const groups = new Map<string, number[]>();

  for (const sale of sales) {
    const key = skinKey(sale.character, sale.skin, sale.rarity);
    const prices = groups.get(key) ?? [];
    prices.push(sale.price);
    groups.set(key, prices);
  }

  const averages = new Map<string, number>();
  for (const [key, prices] of groups) {
    const total = prices.reduce((sum, price) => sum + price, 0);
    averages.set(key, Math.round(total / prices.length));
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
  let sales = await listSales();
  if (options?.userId) {
    sales = sales.filter((sale) => sale.createdBy === options.userId);
  }

  const averages = buildAveragePricesBySkinFromSales(sales);
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

  return buckets;
}
