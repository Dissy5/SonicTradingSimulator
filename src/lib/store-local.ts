import fs from "fs/promises";
import path from "path";

import { todayLocalDateString } from "./format";
import type { Transaction, TransactionType } from "./types";
import { getValuesIncludedUserIds } from "./values-exclusions";
import { weightedAveragePrice } from "./values-weighting";

const LEGACY_TRANSACTION_DATE = "2026-05-27";

type ManualValueInput = {
  character: string;
  skin: string;
  rarity: string;
  star: number;
  price: number;
};

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
    date: entry.date ?? entry.createdAt?.slice(0, 10) ?? LEGACY_TRANSACTION_DATE,
    createdAt: entry.createdAt ?? new Date(0).toISOString(),
    createdBy: entry.createdBy ?? null,
    recordedBy: entry.recordedBy ?? null,
    manualValueOnly: entry.manualValueOnly === true,
  }));
}

async function writeTransactions(transactions: Transaction[]) {
  await fs.mkdir(path.dirname(salesPath), { recursive: true });
  await fs.writeFile(salesPath, `${JSON.stringify(transactions, null, 2)}\n`, "utf-8");
}

export async function listTransactions(): Promise<Transaction[]> {
  const transactions = await readTransactions();
  return transactions
    .filter((entry) => entry.manualValueOnly !== true)
    .sort((a, b) => b.id - a.id);
}

export async function listTransactionsForValues(options?: {
  userId?: string | null;
}): Promise<Transaction[]> {
  const sales = (await readTransactions()).filter((entry) => entry.type === "sale");

  if (options?.userId) {
    return sales.filter(
      (entry) => entry.createdBy === options.userId && entry.manualValueOnly !== true
    );
  }

  const includedUserIds = await getValuesIncludedUserIds();
  return sales.filter((entry) => {
    if (entry.manualValueOnly) return true;
    return entry.createdBy != null && includedUserIds.has(entry.createdBy);
  });
}

export async function addTransaction(
  input: Omit<Transaction, "id" | "date" | "createdAt" | "createdBy" | "recordedBy" | "manualValueOnly">,
  context: { userId: string; recordedBy: string }
): Promise<Transaction> {
  const transactions = await readTransactions();
  const nextId = transactions.reduce((max, entry) => Math.max(max, entry.id), 0) + 1;
  const transaction: Transaction = {
    ...input,
    id: nextId,
    date: todayLocalDateString(),
    createdAt: new Date().toISOString(),
    createdBy: context.userId,
    recordedBy: context.recordedBy,
    manualValueOnly: false,
  };
  transactions.push(transaction);
  await writeTransactions(transactions);
  return transaction;
}

export async function addManualValueTransaction(
  input: ManualValueInput,
  context: { userId: string; recordedBy: string }
): Promise<Transaction> {
  const transactions = await readTransactions();
  const nextId = transactions.reduce((max, entry) => Math.max(max, entry.id), 0) + 1;
  const transaction: Transaction = {
    type: "sale",
    character: input.character,
    skin: input.skin,
    rarity: input.rarity,
    star: input.star,
    price: input.price,
    id: nextId,
    date: todayLocalDateString(),
    createdAt: new Date().toISOString(),
    createdBy: context.userId,
    recordedBy: context.recordedBy,
    manualValueOnly: true,
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

  let rows = matches;
  if (type === "sale") {
    const includedUserIds = await getValuesIncludedUserIds();
    rows = matches.filter(
      (entry) =>
        entry.manualValueOnly === true ||
        (entry.createdBy != null && includedUserIds.has(entry.createdBy))
    );
  }

  if (rows.length === 0) return null;

  return weightedAveragePrice(
    rows.map((entry) => ({
      price: entry.price,
      date: entry.date,
    }))
  );
}

export async function listRecentTransactionsByCharacterSkin(
  character: string,
  skin: string,
  limit = 10
): Promise<Transaction[]> {
  const transactions = await readTransactions();
  return transactions
    .filter(
      (entry) =>
        entry.manualValueOnly !== true &&
        entry.character === character &&
        entry.skin === skin
    )
    .sort((a, b) => b.id - a.id)
    .slice(0, limit);
}
