import fs from "fs/promises";
import path from "path";

import type { Flip } from "./types";

const flipsPath = path.join(process.cwd(), "data", "flips.json");

type FlipContext = {
  userId: string;
  recordedBy: string;
};

async function ensureFlipsFile() {
  try {
    await fs.access(flipsPath);
  } catch {
    await fs.mkdir(path.dirname(flipsPath), { recursive: true });
    await fs.writeFile(flipsPath, "[]\n", "utf-8");
  }
}

async function readFlips(): Promise<Flip[]> {
  await ensureFlipsFile();
  const raw = await fs.readFile(flipsPath, "utf-8");
  const parsed = JSON.parse(raw) as Partial<Flip>[];
  return parsed.map((flip) => ({
    id: flip.id ?? 0,
    character: flip.character ?? "",
    skin: flip.skin ?? "",
    rarity: flip.rarity ?? "",
    star: flip.star ?? 1,
    buyPrice: flip.buyPrice ?? 0,
    plannedSellPrice: flip.plannedSellPrice ?? null,
    sellPrice: flip.sellPrice ?? null,
    boughtAt: flip.boughtAt ?? new Date(0).toISOString(),
    soldAt: flip.soldAt ?? null,
    createdBy: flip.createdBy ?? null,
    recordedBy: flip.recordedBy ?? null,
  }));
}

async function writeFlips(flips: Flip[]) {
  await fs.mkdir(path.dirname(flipsPath), { recursive: true });
  await fs.writeFile(flipsPath, `${JSON.stringify(flips, null, 2)}\n`, "utf-8");
}

export async function listFlips(): Promise<Flip[]> {
  const flips = await readFlips();
  return flips.sort(
    (a, b) => new Date(b.boughtAt).getTime() - new Date(a.boughtAt).getTime()
  );
}

export async function getFlip(id: number): Promise<Flip | null> {
  const flips = await readFlips();
  return flips.find((flip) => flip.id === id) ?? null;
}

export async function createFlip(
  input: {
    character: string;
    skin: string;
    rarity: string;
    star: number;
    buyPrice: number;
    plannedSellPrice?: number | null;
  },
  context: FlipContext
): Promise<Flip> {
  const flips = await readFlips();
  const nextId = flips.reduce((max, flip) => Math.max(max, flip.id), 0) + 1;
  const flip: Flip = {
    id: nextId,
    character: input.character,
    skin: input.skin,
    rarity: input.rarity,
    star: input.star,
    buyPrice: input.buyPrice,
    plannedSellPrice: input.plannedSellPrice ?? null,
    sellPrice: null,
    boughtAt: new Date().toISOString(),
    soldAt: null,
    createdBy: context.userId,
    recordedBy: context.recordedBy,
  };
  flips.push(flip);
  await writeFlips(flips);
  return flip;
}

export async function completeFlip(
  id: number,
  sellPrice: number,
  _context: FlipContext
): Promise<Flip> {
  const flips = await readFlips();
  const index = flips.findIndex((flip) => flip.id === id);
  if (index === -1) throw new Error("Flip not found");
  if (flips[index].sellPrice != null) throw new Error("Flip already sold");

  flips[index] = {
    ...flips[index],
    sellPrice,
    soldAt: new Date().toISOString(),
  };
  await writeFlips(flips);
  return flips[index];
}

export async function reopenFlip(id: number): Promise<void> {
  const flips = await readFlips();
  const index = flips.findIndex((flip) => flip.id === id);
  if (index === -1) throw new Error("Flip not found");

  flips[index] = {
    ...flips[index],
    sellPrice: null,
    soldAt: null,
  };
  await writeFlips(flips);
}

export async function deleteFlip(id: number): Promise<boolean> {
  const flips = await readFlips();
  const index = flips.findIndex((flip) => flip.id === id);
  if (index === -1) return false;
  if (flips[index].sellPrice != null) {
    throw new Error("Cannot delete a closed flip");
  }

  flips.splice(index, 1);
  await writeFlips(flips);
  return true;
}
