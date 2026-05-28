import fs from "fs/promises";
import path from "path";

import type { Sale } from "./types";

const salesPath = path.join(process.cwd(), "data", "sales.json");

async function ensureSalesFile() {
  try {
    await fs.access(salesPath);
  } catch {
    await fs.mkdir(path.dirname(salesPath), { recursive: true });
    await fs.writeFile(salesPath, "[]\n", "utf-8");
  }
}

async function readSales(): Promise<Sale[]> {
  await ensureSalesFile();
  const raw = await fs.readFile(salesPath, "utf-8");
  const parsed = JSON.parse(raw) as Partial<Sale>[];
  return parsed.map((sale) => ({
    id: sale.id ?? 0,
    character: sale.character ?? "",
    skin: sale.skin ?? "",
    rarity: sale.rarity ?? "",
    star: sale.star ?? 1,
    price: sale.price ?? 0,
    createdAt: sale.createdAt ?? new Date(0).toISOString(),
    createdBy: sale.createdBy ?? null,
    recordedBy: sale.recordedBy ?? null,
  }));
}

async function writeSales(sales: Sale[]) {
  await fs.mkdir(path.dirname(salesPath), { recursive: true });
  await fs.writeFile(salesPath, `${JSON.stringify(sales, null, 2)}\n`, "utf-8");
}

export async function listSales(): Promise<Sale[]> {
  const sales = await readSales();
  return sales.sort((a, b) => b.id - a.id);
}

export async function addSale(
  input: Omit<Sale, "id" | "createdAt" | "createdBy" | "recordedBy">,
  context: { userId: string; recordedBy: string }
): Promise<Sale> {
  const sales = await readSales();
  const nextId = sales.reduce((max, sale) => Math.max(max, sale.id), 0) + 1;
  const sale: Sale = {
    ...input,
    id: nextId,
    createdAt: new Date().toISOString(),
    createdBy: context.userId,
    recordedBy: context.recordedBy,
  };
  sales.push(sale);
  await writeSales(sales);
  return sale;
}

export async function deleteSale(id: number): Promise<boolean> {
  const sales = await readSales();
  const next = sales.filter((sale) => sale.id !== id);
  if (next.length === sales.length) return false;
  await writeSales(next);
  return true;
}

export async function getAveragePrice(
  character: string,
  skin: string,
  rarity: string,
  star: number
): Promise<number | null> {
  const sales = await readSales();
  const matches = sales.filter(
    (sale) =>
      sale.character === character &&
      sale.skin === skin &&
      sale.rarity === rarity &&
      sale.star === star
  );
  if (matches.length === 0) return null;
  const total = matches.reduce((sum, sale) => sum + sale.price, 0);
  return Math.round(total / matches.length);
}

export async function listRecentSalesByCharacterSkin(
  character: string,
  skin: string,
  limit = 10
): Promise<Sale[]> {
  const sales = await readSales();
  return sales
    .filter((sale) => sale.character === character && sale.skin === skin)
    .sort((a, b) => b.id - a.id)
    .slice(0, limit);
}
