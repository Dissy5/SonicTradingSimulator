import fs from "fs";

const catalog = JSON.parse(fs.readFileSync("src/data/character-skins.json", "utf8"));
const files = new Set(fs.readdirSync("public/images"));

function toFile(imagePath) {
  return imagePath.replace(/^\/?images\//, "");
}

const referenced = new Set();
const broken = [];

for (const [character, skins] of Object.entries(catalog)) {
  for (const [name, rarity, imagePath] of skins) {
    const file = toFile(imagePath);
    referenced.add(file);
    if (!files.has(file)) {
      broken.push({ character, name, rarity, imagePath, file });
    }
  }
}

const orphans = [...files].filter((f) => f.endsWith(".png") && !referenced.has(f)).sort();

console.log("Broken catalog entries:", broken.length);
broken.forEach((b) => console.log(`  ${b.character} | ${b.name} | ${b.rarity} | ${b.file}`));
console.log("\nOrphan image files (on disk, not in catalog):", orphans.length);
orphans.forEach((f) => console.log(`  ${f}`));
