import fs from "fs";

const catalog = JSON.parse(fs.readFileSync("src/data/character-skins.json", "utf8"));
const files = fs.readdirSync("public/images");
const fileSet = new Set(files);
const fileLower = new Map(files.map((f) => [f.toLowerCase(), f]));

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function toFile(imagePath) {
  return imagePath.replace(/^\/?images\//, "");
}

function candidates(character, name, rarity) {
  const c = slug(character);
  const n = slug(name);
  const r = rarity.toLowerCase();
  return [
    `${c}_${n}_${r}.png`,
    `${c}_${n}.png`,
    `${c}_${n}_${r}.png`,
  ];
}

const broken = [];
const fixes = [];

for (const [character, skins] of Object.entries(catalog)) {
  for (const [name, rarity, imagePath] of skins) {
    const file = toFile(imagePath);
    if (fileSet.has(file)) continue;

    const lowerMatch = fileLower.get(file.toLowerCase());
    let fix = null;

    if (lowerMatch) {
      fix = `images/${lowerMatch}`;
    } else {
      for (const cand of candidates(character, name, rarity)) {
        if (fileSet.has(cand)) {
          fix = `images/${cand}`;
          break;
        }
        const lc = fileLower.get(cand.toLowerCase());
        if (lc) {
          fix = `images/${lc}`;
          break;
        }
      }
    }

    const item = { character, name, rarity, imagePath, file, fix };
    if (fix) fixes.push(item);
    else broken.push(item);
  }
}

console.log(JSON.stringify({ fixable: fixes, unfixable: broken }, null, 2));
