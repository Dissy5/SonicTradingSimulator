import fs from "fs/promises";
import path from "path";

import type { Transaction, TransactionType } from "./types";

const salesPath = path.join(process.cwd(), "data", "sales.json");

async function ensureSalesFile() {
  try {
    await fs.access(salesPath);
  } catch {
    await fs.mkdir(path.dirname(salesPath), { recursive: true });
    await fs.writeFile(salesPath, "[]\n", "utf-8");
  }
}

async function readTransactions(): Promise<Transaction[]> {
  await ensureSalesFile();
  const raw = await fs.readFile(salesPath, "utf-8");
  const parsed = JSON.parse(raw) as Partial<Transaction>[];
  return parsed.map((entry) => ({
    id: entry.id ?? 0,
    type: entry.type === "purchase" ? "purchase" : "sale",
    character: entry.character ?? "",
    skin: entry.skin ?? "",
    rarity: entry.rarity ?? "",
    star: entry.star ?? 1,
    price: entry.price ?? 0,
    createdAt: entry.createdAt ?? new Date(0).toISOString(),
    createdBy: entry.createdBy ?? null,
    recordedBy: entry.recordedBy ?? null,
  }));
}

async function writeTransactions(transactions: Transaction[]) {
  await fs.mkdir(path.dirname(salesPath), { recursive: true });
  await fs.writeFile(salesPath, `${JSON.stringify(transactions, null, 2)}\n`, "utf-8");
}

export async function listTransactions(): Promise<Transaction[]> {
  const transactions = await readTransactions();
  return transactions.sort((a, b) => b.id - a.id);
}

export async function addTransaction(
  input: Omit<Transaction, "id" | "createdAt" | "createdBy" | "recordedBy">,
  context: { userId: string; recordedBy: string }
): Promise<Transaction> {
  const transactions = await readTransactions();
  const nextId = transactions.reduce((max, entry) => Math.max(max, entry.id), 0) + 1;
  const transaction: Transaction = {
    ...input,
    id: nextId,
    createdAt: new Date().toISOString(),
    createdBy: context.userId,
    recordedBy: context.recordedBy,
  };
  transactions.push(transaction);
  await writeTransactions(transactions);
  return transaction;
}

export async function deleteAllTransactionsForUser(userId: string): Promise<number> {
  const transactions = await readTransactions();
  const next = transactions.filter((entry) => entry.createdBy !== userId);
  const removed = transactions.length - next.length;
  if (removed > 0) {
    await writeTransactions(next);
  }
  return removed;
}

export async function updateRecordedByForUser(userId: string, recordedBy: string): Promise<number> {
  const transactions = await readTransactions();
  let count = 0;
  const next = transactions.map((entry) => {
    if (entry.createdBy !== userId) return entry;
    count++;
    return { ...entry, recordedBy };
  });
  if (count > 0) {
    await writeTransactions(next);
  }
  return count;
}

export async function deleteTransaction(id: number): Promise<boolean> {
  const transactions = await readTransactions();
  const next = transactions.filter((entry) => entry.id !== id);
  if (next.length === transactions.length) return false;
  await writeTransactions(next);
  return true;
}

export async function getAveragePrice(
  character: string,
  skin: string,
  rarity: string,
  star: number,
  type: TransactionType = "sale"
): Promise<number | null> {
  const transactions = await readTransactions();
  const matches = transactions.filter(
    (entry) =>
      entry.type === type &&
      entry.character === character &&
      entry.skin === skin &&
      entry.rarity === rarity &&
      entry.star === star
  );
  if (matches.length === 0) return null;
  const total = matches.reduce((sum, entry) => sum + entry.price, 0);
  return Math.round(total / matches.length);
}

export async function listRecentTransactionsByCharacterSkin(
  character: string,
  skin: string,
  limit = 10
): Promise<Transaction[]> {
  const transactions = await readTransactions();
  return transactions
    .filter((entry) => entry.character === character && entry.skin === skin)
    .sort((a, b) => b.id - a.id)
    .slice(0, limit);
}
