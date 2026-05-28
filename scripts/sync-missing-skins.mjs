import fs from "fs";
import { createClient } from "@supabase/supabase-js";

/**
 * Sync missing catalog_skins rows from character-skins.json.
 * Run with: node scripts/sync-missing-skins.mjs
 */

function loadEnv() {
  try {
    const raw = fs.readFileSync(".env.local", "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) process.env[m[1].trim()] ??= m[2].trim();
    }
  } catch {
    // ignore
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Supabase env vars missing");
  process.exit(1);
}

const supabase = createClient(url, key);
const catalog = JSON.parse(fs.readFileSync("src/data/character-skins.json", "utf8"));

function keyFor(character, name, rarity) {
  return `${character}\0${name}\0${rarity}`;
}

const { data: existing, error } = await supabase.from("catalog_skins").select("character,name,rarity,image_path");
if (error) throw error;

const existingKeys = new Set(existing.map((r) => keyFor(r.character, r.name, r.rarity)));

const missing = [];
for (const [character, skins] of Object.entries(catalog)) {
  for (const [name, rarity, imagePath] of skins) {
    const k = keyFor(character, name, rarity);
    if (!existingKeys.has(k)) {
      missing.push({
        character,
        name,
        rarity,
        image_path: imagePath.replace(/^images\//, "/images/"),
      });
    }
  }
}

console.log(`Existing: ${existing.length}, Missing: ${missing.length}`);

if (missing.length === 0) {
  process.exit(0);
}

const batchSize = 50;
for (let i = 0; i < missing.length; i += batchSize) {
  const batch = missing.slice(i, i + batchSize);
  const { error: insertError } = await supabase.from("catalog_skins").insert(batch);
  if (insertError) {
    console.error("Insert failed:", insertError.message);
    process.exit(1);
  }
  console.log(`Inserted ${Math.min(i + batchSize, missing.length)} / ${missing.length}`);
}

console.log("Done.");
