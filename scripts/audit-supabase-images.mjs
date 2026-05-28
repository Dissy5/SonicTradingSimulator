import fs from "fs";

const files = new Set(fs.readdirSync("public/images"));
const fileLower = new Map([...files].map((f) => [f.toLowerCase(), f]));

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function toFile(imagePath) {
  return imagePath.replace(/^\/?images\//, "");
}

function suggestFix(character, name, rarity, file) {
  if (fileLower.has(file.toLowerCase())) {
    return `images/${fileLower.get(file.toLowerCase())}`;
  }

  const c = slug(character);
  const n = slug(name);
  const r = rarity.toLowerCase();
  const candidates = [`${c}_${n}_${r}.png`, `${c}_${n}.png`];

  for (const cand of candidates) {
    if (files.has(cand)) return `images/${cand}`;
    if (fileLower.has(cand.toLowerCase())) return `images/${fileLower.get(cand.toLowerCase())}`;
  }

  return null;
}

// Paste from audit - we'll fetch via env in a separate step; for now read exported json if exists
const rowsPath = process.argv[2];
if (!rowsPath) {
  console.error("Usage: node scripts/audit-supabase-images.mjs <rows.json>");
  process.exit(1);
}

const rows = JSON.parse(fs.readFileSync(rowsPath, "utf8"));
const broken = [];
const fixable = [];

for (const row of rows) {
  const file = toFile(row.image_path);
  if (files.has(file)) continue;

  const fix = suggestFix(row.character, row.name, row.rarity, file);
  const item = { ...row, file, fix };
  if (fix) fixable.push(item);
  else broken.push(item);
}

console.log(JSON.stringify({ fixable, broken, total: rows.length }, null, 2));
