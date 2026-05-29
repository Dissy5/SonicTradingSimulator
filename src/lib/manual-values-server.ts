import { loadCatalog } from "@/lib/catalog-server";
import type { SkinCatalog } from "@/lib/types";
import { listCatalogSkins, type ValuedSkin } from "@/lib/values-server";
import { listTransactionsForValues } from "@/lib/store";

function skinKey(character: string, skin: string, rarity: string): string {
  return `${character}\0${skin}\0${rarity}`;
}

function skinsWithSaleHistory(
  transactions: Awaited<ReturnType<typeof listTransactionsForValues>>
): Set<string> {
  const keys = new Set<string>();
  for (const transaction of transactions) {
    if (transaction.type !== "sale") continue;
    keys.add(skinKey(transaction.character, transaction.skin, transaction.rarity));
  }
  return keys;
}

export async function listSkinsWithoutSaleHistory(catalog?: SkinCatalog): Promise<ValuedSkin[]> {
  const resolvedCatalog = catalog ?? (await loadCatalog());
  const [catalogSkins, valueTransactions] = await Promise.all([
    Promise.resolve(listCatalogSkins(resolvedCatalog)),
    listTransactionsForValues(),
  ]);

  const valuedKeys = skinsWithSaleHistory(valueTransactions);
  return catalogSkins.filter(
    (entry) => !valuedKeys.has(skinKey(entry.character, entry.skin, entry.rarity))
  );
}
