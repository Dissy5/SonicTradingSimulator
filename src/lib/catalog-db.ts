import characterSkins from "@/data/character-skins.json";

import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SkinCatalog } from "@/lib/types";

const jsonCatalog = characterSkins as unknown as SkinCatalog;

export type CatalogCharacterRow = {
  id: number;
  name: string;
  created_at: string;
};

export type CatalogSkinRow = {
  id: number;
  character: string;
  name: string;
  rarity: string;
  image_path: string;
  created_at: string;
};

export function catalogRowsToSkinCatalog(
  characters: CatalogCharacterRow[],
  skinRows: CatalogSkinRow[]
): SkinCatalog {
  const catalog: SkinCatalog = {};

  for (const character of characters) {
    catalog[character.name] = [];
  }

  for (const row of skinRows) {
    if (!catalog[row.character]) {
      catalog[row.character] = [];
    }
    catalog[row.character].push([row.name, row.rarity, row.image_path]);
  }

  return catalog;
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

async function seedSkinsFromJson() {
  const supabase = createSupabaseServerClient();
  const rows: Array<{
    character: string;
    name: string;
    rarity: string;
    image_path: string;
  }> = [];

  for (const [character, entries] of Object.entries(jsonCatalog)) {
    for (const [name, rarity, imagePath] of entries) {
      rows.push({
        character,
        name,
        rarity,
        image_path: imagePath.replace(/^images\//, "/images/"),
      });
    }
  }

  const batchSize = 100;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase.from("catalog_skins").insert(batch);
    if (error) throw new Error(error.message);
  }
}

async function seedCharactersFromJson() {
  const supabase = createSupabaseServerClient();
  const rows = Object.keys(jsonCatalog).map((name) => ({ name }));

  const batchSize = 100;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase
      .from("catalog_characters")
      .upsert(batch, { onConflict: "name", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
  }
}

async function syncCharactersFromSkins() {
  const supabase = createSupabaseServerClient();

  const { data: skinCharacters, error: skinError } = await supabase
    .from("catalog_skins")
    .select("character");

  if (skinError) throw new Error(skinError.message);

  const uniqueFromSkins = [...new Set((skinCharacters ?? []).map((row) => row.character))];
  if (uniqueFromSkins.length === 0) return;

  const rows = uniqueFromSkins.map((name) => ({ name }));
  const { error } = await supabase
    .from("catalog_characters")
    .upsert(rows, { onConflict: "name", ignoreDuplicates: true });

  if (error) throw new Error(error.message);
}

let seededPromise: Promise<void> | null = null;

async function ensureCatalogSeeded() {
  if (seededPromise) {
    return seededPromise;
  }

  seededPromise = (async () => {
    const supabase = createSupabaseServerClient();

    const { count: skinCount, error: skinCountError } = await supabase
      .from("catalog_skins")
      .select("*", { count: "exact", head: true });

    if (skinCountError) throw new Error(skinCountError.message);

    if ((skinCount ?? 0) === 0) {
      await seedSkinsFromJson();
      await seedCharactersFromJson();
      await syncCharactersFromSkins();
      return;
    }

    const { count: characterCount, error: characterCountError } = await supabase
      .from("catalog_characters")
      .select("*", { count: "exact", head: true });

    if (characterCountError) throw new Error(characterCountError.message);

    if ((characterCount ?? 0) === 0) {
      await seedCharactersFromJson();
      await syncCharactersFromSkins();
    }
  })();

  try {
    await seededPromise;
  } catch (error) {
    seededPromise = null;
    throw error;
  }
}

export async function loadCatalogFromDatabase(): Promise<SkinCatalog> {
  const supabase = createSupabaseServerClient();

  await ensureCatalogSeeded();

  const { data: characters, error: characterError } = await supabase
    .from("catalog_characters")
    .select("*")
    .order("name");

  if (characterError) throw new Error(characterError.message);

  const { data: skins, error: skinError } = await supabase
    .from("catalog_skins")
    .select("*")
    .order("character")
    .order("name")
    .order("rarity");

  if (skinError) throw new Error(skinError.message);

  return catalogRowsToSkinCatalog(
    (characters ?? []) as CatalogCharacterRow[],
    (skins ?? []) as CatalogSkinRow[]
  );
}

export async function listCatalogCharacters(): Promise<CatalogCharacterRow[]> {
  const supabase = createSupabaseServerClient();
  await ensureCatalogSeeded();

  const { data, error } = await supabase
    .from("catalog_characters")
    .select("*")
    .order("name");

  if (error) throw new Error(error.message);
  return (data ?? []) as CatalogCharacterRow[];
}

export async function listCatalogSkinRows(): Promise<CatalogSkinRow[]> {
  const supabase = createSupabaseServerClient();
  await ensureCatalogSeeded();

  const { data, error } = await supabase
    .from("catalog_skins")
    .select("*")
    .order("character")
    .order("name")
    .order("rarity");

  if (error) throw new Error(error.message);
  return (data ?? []) as CatalogSkinRow[];
}

export async function getCatalogSkinById(id: number): Promise<CatalogSkinRow | null> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase.from("catalog_skins").select("*").eq("id", id).maybeSingle();

  if (error) throw new Error(error.message);
  return (data as CatalogSkinRow | null) ?? null;
}

export async function uploadSkinImage(
  input: {
    character: string;
    name: string;
    rarity: string;
    imageFile: File;
  },
  client?: SupabaseClient
): Promise<string> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is required to upload skin images");
  }

  const supabase = client ?? createSupabaseServerClient();
  const extension = input.imageFile.name.split(".").pop()?.toLowerCase() || "png";
  const safeExt = ["png", "jpg", "jpeg", "webp", "gif"].includes(extension) ? extension : "png";
  const fileName = `${slug(input.character)}_${slug(input.name)}_${slug(input.rarity)}_${Date.now()}.${safeExt}`;
  const filePath = `${slug(input.character)}/${fileName}`;

  const buffer = Buffer.from(await input.imageFile.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("skin-images")
    .upload(filePath, buffer, {
      contentType: input.imageFile.type || "image/png",
      upsert: false,
    });

  if (uploadError) throw new Error(uploadError.message);

  const { data } = supabase.storage.from("skin-images").getPublicUrl(filePath);
  return data.publicUrl;
}

export async function addCatalogSkin(
  input: {
    character: string;
    name: string;
    rarity: string;
    imagePath: string;
  },
  client?: SupabaseClient
): Promise<CatalogSkinRow> {
  const supabase = client ?? createSupabaseServerClient();

  const { data, error } = await supabase
    .from("catalog_skins")
    .insert({
      character: input.character,
      name: input.name,
      rarity: input.rarity,
      image_path: input.imagePath,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as CatalogSkinRow;
}

export async function addCatalogCharacter(
  name: string,
  client?: SupabaseClient
): Promise<CatalogCharacterRow> {
  const supabase = client ?? createSupabaseServerClient();

  const { data, error } = await supabase
    .from("catalog_characters")
    .insert({ name })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as CatalogCharacterRow;
}

export async function updateCatalogCharacter(
  id: number,
  name: string,
  client?: SupabaseClient
): Promise<CatalogCharacterRow> {
  const supabase = client ?? createSupabaseServerClient();

  const { data: existing, error: existingError } = await supabase
    .from("catalog_characters")
    .select("*")
    .eq("id", id)
    .single();

  if (existingError) throw new Error(existingError.message);

  const oldName = (existing as CatalogCharacterRow).name;
  if (oldName === name) {
    return existing as CatalogCharacterRow;
  }

  const { error: skinError } = await supabase
    .from("catalog_skins")
    .update({ character: name })
    .eq("character", oldName);

  if (skinError) throw new Error(skinError.message);

  const { error: salesError } = await supabase
    .from("sales")
    .update({ character: name })
    .eq("character", oldName);

  if (salesError) throw new Error(salesError.message);

  const { data, error } = await supabase
    .from("catalog_characters")
    .update({ name })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as CatalogCharacterRow;
}

export async function deleteCatalogCharacter(
  id: number,
  client?: SupabaseClient
): Promise<boolean> {
  const supabase = client ?? createSupabaseServerClient();

  const { data: existing, error: existingError } = await supabase
    .from("catalog_characters")
    .select("name")
    .eq("id", id)
    .single();

  if (existingError) throw new Error(existingError.message);

  const characterName = (existing as { name: string }).name;

  const { error: skinError } = await supabase
    .from("catalog_skins")
    .delete()
    .eq("character", characterName);

  if (skinError) throw new Error(skinError.message);

  const { data, error } = await supabase
    .from("catalog_characters")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) throw new Error(error.message);
  return (data?.length ?? 0) > 0;
}

export async function updateCatalogSkin(
  id: number,
  input: {
    character: string;
    name: string;
    rarity: string;
    imagePath?: string;
  },
  client?: SupabaseClient
): Promise<CatalogSkinRow> {
  const supabase = client ?? createSupabaseServerClient();

  const payload: {
    character: string;
    name: string;
    rarity: string;
    image_path?: string;
  } = {
    character: input.character,
    name: input.name,
    rarity: input.rarity,
  };

  if (input.imagePath) {
    payload.image_path = input.imagePath;
  }

  const { data, error } = await supabase
    .from("catalog_skins")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as CatalogSkinRow;
}

export async function deleteCatalogSkin(
  id: number,
  client?: SupabaseClient
): Promise<boolean> {
  const supabase = client ?? createSupabaseServerClient();

  const { data, error } = await supabase.from("catalog_skins").delete().eq("id", id).select("id");

  if (error) throw new Error(error.message);
  return (data?.length ?? 0) > 0;
}

export async function characterNameExists(name: string, excludeId?: number): Promise<boolean> {
  const supabase = createSupabaseServerClient();

  let query = supabase.from("catalog_characters").select("id").eq("name", name);
  if (excludeId != null) {
    query = query.neq("id", excludeId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data?.length ?? 0) > 0;
}

export async function skinEntryExists(
  character: string,
  name: string,
  rarity: string,
  excludeId?: number
): Promise<boolean> {
  const supabase = createSupabaseServerClient();

  let query = supabase
    .from("catalog_skins")
    .select("id")
    .eq("character", character)
    .eq("name", name)
    .eq("rarity", rarity);

  if (excludeId != null) {
    query = query.neq("id", excludeId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data?.length ?? 0) > 0;
}
