import type { SkinCatalog } from "@/lib/types";

export function getCharactersFromCatalog(catalog: SkinCatalog): string[] {
  return Object.keys(catalog).sort();
}

export function getSkinsForCharacter(catalog: SkinCatalog, character: string): string[] {
  const entries = catalog[character];
  if (!entries) return [];
  return [...new Set(entries.map(([name]) => name))].sort();
}

export function getRaritiesForSkin(
  catalog: SkinCatalog,
  character: string,
  skin: string
): string[] {
  const entries = catalog[character];
  if (!entries) return [];
  return entries
    .filter(([name]) => name === skin)
    .map(([, rarity]) => rarity)
    .sort();
}

export function getSkinImagePath(
  catalog: SkinCatalog,
  character: string,
  skin: string,
  rarity: string
): string | null {
  const entry = catalog[character]?.find(
    ([name, entryRarity]) => name === skin && entryRarity === rarity
  );
  if (!entry) return null;
  const path = entry[2]?.trim();
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  return path.replace(/^images\//, "/images/");
}

export function skinExists(
  catalog: SkinCatalog,
  character: string,
  skin: string,
  rarity: string
): boolean {
  return (
    catalog[character]?.some(
      ([name, entryRarity]) => name === skin && entryRarity === rarity
    ) ?? false
  );
}
