import fs from "fs";

const catalog = JSON.parse(fs.readFileSync("src/data/character-skins.json", "utf8"));
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
  for (const cand of [`${c}_${n}_${r}.png`, `${c}_${n}.png`]) {
    if (files.has(cand)) return `images/${cand}`;
    if (fileLower.has(cand.toLowerCase())) return `images/${fileLower.get(cand.toLowerCase())}`;
  }

  return null;
}

const fixes = [];
const unfixable = [];
let changed = 0;

for (const [character, skins] of Object.entries(catalog)) {
  for (let i = 0; i < skins.length; i++) {
    const [name, rarity, imagePath] = skins[i];
    const file = toFile(imagePath);
    if (files.has(file)) continue;

    const fix = suggestFix(character, name, rarity, file);
    if (fix) {
      fixes.push({ character, name, rarity, from: imagePath, to: fix });
      skins[i] = [name, rarity, fix];
      changed++;
    } else {
      unfixable.push({ character, name, rarity, imagePath, file });
    }
  }
}

if (changed > 0) {
  fs.writeFileSync("src/data/character-skins.json", JSON.stringify(catalog));
}

console.log(`Fixed ${changed} entries in character-skins.json`);
console.log(JSON.stringify({ fixes, unfixable }, null, 2));
