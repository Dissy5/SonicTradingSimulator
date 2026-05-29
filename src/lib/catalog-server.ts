import characterSkins from "@/data/character-skins.json";

import {
  addCatalogCharacter,
  addCatalogSkin,
  type CatalogCharacterRow,
  type CatalogSkinRow,
  deleteCatalogCharacter,
  deleteCatalogSkin,
  listCatalogCharacters,
  listCatalogSkinRows,
  loadCatalogFromDatabase,
  skinEntryExists,
  updateCatalogCharacter,
  updateCatalogSkin,
  uploadSkinImage,
  DUPLICATE_SKIN_ERROR,
} from "@/lib/catalog-db";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getCharactersFromCatalog,
  getRaritiesForSkin,
  getSkinImagePath,
  getSkinsForCharacter,
  skinExists,
} from "@/lib/catalog";
import type { SkinCatalog } from "@/lib/types";

import { isSupabaseConfigured } from "./supabase/server";

const jsonCatalog = characterSkins as unknown as SkinCatalog;

export async function loadCatalog(): Promise<SkinCatalog> {
  if (!isSupabaseConfigured()) {
    return jsonCatalog;
  }

  try {
    return await loadCatalogFromDatabase();
  } catch {
    return jsonCatalog;
  }
}

export async function getCatalogManageData() {
  if (!isSupabaseConfigured()) {
    const catalog = jsonCatalog;
    const characterNames = getCharactersFromCatalog(catalog);
    const characters: CatalogCharacterRow[] = characterNames.map((name, index) => ({
      id: index + 1,
      name,
      created_at: "",
    }));

    const skins: CatalogSkinRow[] = [];
    let skinId = 1;
    for (const [character, entries] of Object.entries(catalog)) {
      for (const [name, rarity, imagePath] of entries) {
        skins.push({
          id: skinId++,
          character,
          name,
          rarity,
          image_path: imagePath.replace(/^images\//, "/images/"),
          created_at: "",
        });
      }
    }

    return { characters, skins, readOnly: true as const };
  }

  const [characters, skins] = await Promise.all([
    listCatalogCharacters(),
    listCatalogSkinRows(),
  ]);
  return { characters, skins, readOnly: false as const };
}

export async function getCharacters() {
  if (!isSupabaseConfigured()) {
    return getCharactersFromCatalog(jsonCatalog);
  }

  try {
    const characters = await listCatalogCharacters();
    return characters.map((row) => row.name);
  } catch {
    return getCharactersFromCatalog(await loadCatalog());
  }
}

export async function getSkins(character: string) {
  const catalog = await loadCatalog();
  return getSkinsForCharacter(catalog, character);
}

export async function getRarities(character: string, skin: string) {
  const catalog = await loadCatalog();
  return getRaritiesForSkin(catalog, character, skin);
}

export async function getImagePath(character: string, skin: string, rarity: string) {
  const catalog = await loadCatalog();
  return getSkinImagePath(catalog, character, skin, rarity);
}

export async function exists(character: string, skin: string, rarity: string) {
  const catalog = await loadCatalog();
  return skinExists(catalog, character, skin, rarity);
}

export async function createCharacter(
  name: string,
  client?: SupabaseClient
): Promise<CatalogCharacterRow> {
  return addCatalogCharacter(name.trim(), client);
}

export async function renameCharacter(
  id: number,
  name: string,
  client?: SupabaseClient
): Promise<CatalogCharacterRow> {
  return updateCatalogCharacter(id, name.trim(), client);
}

export async function removeCharacter(id: number, client?: SupabaseClient): Promise<boolean> {
  return deleteCatalogCharacter(id, client);
}

export async function createSkin(
  input: {
    character: string;
    name: string;
    rarity: string;
    imageFile?: File;
  },
  client?: SupabaseClient
): Promise<CatalogSkinRow> {
  const character = input.character.trim();
  const name = input.name.trim();
  const rarity = input.rarity.trim();

  if (await skinEntryExists(character, name, rarity, undefined, client)) {
    throw new Error(DUPLICATE_SKIN_ERROR);
  }

  const imagePath = input.imageFile
    ? await uploadSkinImage(
        {
          character,
          name,
          rarity,
          imageFile: input.imageFile,
        },
        client
      )
    : "";

  return addCatalogSkin(
    {
      character,
      name,
      rarity,
      imagePath,
    },
    client
  );
}

export async function editSkin(
  id: number,
  input: {
    character: string;
    name: string;
    rarity: string;
    imageFile?: File;
  },
  client?: SupabaseClient
): Promise<CatalogSkinRow> {
  const character = input.character.trim();
  const name = input.name.trim();
  const rarity = input.rarity.trim();

  if (await skinEntryExists(character, name, rarity, id, client)) {
    throw new Error(DUPLICATE_SKIN_ERROR);
  }

  const imagePath = input.imageFile
    ? await uploadSkinImage(
        {
          character,
          name,
          rarity,
          imageFile: input.imageFile,
        },
        client
      )
    : undefined;

  return updateCatalogSkin(
    id,
    {
      character,
      name,
      rarity,
      imagePath,
    },
    client
  );
}

export async function removeSkin(id: number, client?: SupabaseClient): Promise<boolean> {
  return deleteCatalogSkin(id, client);
}

export { jsonCatalog as catalog };
export type { CatalogCharacterRow, CatalogSkinRow };
