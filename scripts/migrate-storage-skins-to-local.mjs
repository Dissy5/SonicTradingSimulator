/**
 * Move catalog skin images from Supabase Storage to public/images.
 * Updates catalog_skins.image_path, syncs character-skins.json, deletes storage objects.
 *
 * Usage: node scripts/migrate-storage-skins-to-local.mjs
 */
import fsSync from "fs";
import fs from "fs/promises";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const SKIN_IMAGES_BUCKET = "skin-images";
const IMAGES_DIR = path.join(process.cwd(), "public", "images");
const JSON_PATH = path.join(process.cwd(), "src", "data", "character-skins.json");

function loadEnv() {
  try {
    const raw = fsSync.readFileSync(".env.local", "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const m = trimmed.match(/^([^#=]+)=(.*)$/);
      if (m) process.env[m[1].trim()] ??= m[2].trim().replace(/^"|"$/g, "");
    }
  } catch {
    // ignore
  }
}

function slug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function parseStoragePath(imagePath) {
  try {
    const url = new URL(imagePath);
    const marker = `/storage/v1/object/public/${SKIN_IMAGES_BUCKET}/`;
    const index = url.pathname.indexOf(marker);
    if (index === -1) return null;
    return decodeURIComponent(url.pathname.slice(index + marker.length));
  } catch {
    return null;
  }
}

function localFileName(character, name, rarity) {
  return `${slug(character)}_${slug(name)}_${slug(rarity)}.png`;
}

function catalogKey(character, name, rarity) {
  return `${character}\0${name}\0${rarity}`;
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  await fs.mkdir(IMAGES_DIR, { recursive: true });

  const { data: rows, error } = await supabase
    .from("catalog_skins")
    .select("id, character, name, rarity, image_path")
    .like("image_path", "https://%")
    .order("id");

  if (error) throw new Error(error.message);
  if (!rows?.length) {
    console.log("No Supabase-hosted catalog skins to migrate.");
    return;
  }

  console.log(`Migrating ${rows.length} skin image(s)...`);

  const catalog = JSON.parse(await fs.readFile(JSON_PATH, "utf8"));
  const jsonKeys = new Set();
  for (const [character, entries] of Object.entries(catalog)) {
    for (const [name, rarity] of entries) {
      jsonKeys.add(catalogKey(character, name, rarity));
    }
  }

  const usedNames = new Set(await fs.readdir(IMAGES_DIR));
  const storagePathsToDelete = [];

  for (const row of rows) {
    const fileName = localFileName(row.character, row.name, row.rarity);
    let resolvedName = fileName;
    if (usedNames.has(resolvedName)) {
      resolvedName = fileName.replace(/\.png$/, `_${row.id}.png`);
    }

    const localPath = path.join(IMAGES_DIR, resolvedName);
    const dbPath = `/images/${resolvedName}`;
    const jsonPath = `images/${resolvedName}`;

    if (!usedNames.has(resolvedName)) {
      const response = await fetch(row.image_path);
      if (!response.ok) {
        throw new Error(`Failed to download ${row.image_path}: ${response.status}`);
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      await fs.writeFile(localPath, buffer);
      usedNames.add(resolvedName);
      console.log(`Saved ${resolvedName}`);
    } else {
      console.log(`Reusing existing file ${resolvedName}`);
    }

    const { error: updateError } = await supabase
      .from("catalog_skins")
      .update({ image_path: dbPath })
      .eq("id", row.id);

    if (updateError) throw new Error(updateError.message);

    const key = catalogKey(row.character, row.name, row.rarity);
    if (!catalog[row.character]) {
      catalog[row.character] = [];
    }

    const existingIndex = catalog[row.character].findIndex(
      ([name, rarity]) => name === row.name && rarity === row.rarity
    );

    if (existingIndex === -1) {
      catalog[row.character].push([row.name, row.rarity, jsonPath]);
    } else {
      catalog[row.character][existingIndex][2] = jsonPath;
    }
    jsonKeys.add(key);

    const storagePath = parseStoragePath(row.image_path);
    if (storagePath) storagePathsToDelete.push(storagePath);
  }

  const sortedCatalog = Object.fromEntries(
    Object.entries(catalog)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([character, entries]) => [
        character,
        [...entries].sort((a, b) => {
          const byName = a[0].localeCompare(b[0]);
          if (byName !== 0) return byName;
          return a[1].localeCompare(b[1]);
        }),
      ])
  );

  await fs.writeFile(JSON_PATH, `${JSON.stringify(sortedCatalog)}\n`, "utf8");

  const uniqueStoragePaths = [...new Set(storagePathsToDelete)];
  if (uniqueStoragePaths.length > 0) {
    const { error: removeError } = await supabase.storage
      .from(SKIN_IMAGES_BUCKET)
      .remove(uniqueStoragePaths);

    if (removeError) {
      console.warn("Storage cleanup warning:", removeError.message);
    } else {
      console.log(`Removed ${uniqueStoragePaths.length} object(s) from Supabase Storage.`);
    }
  }

  console.log("Migration complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
