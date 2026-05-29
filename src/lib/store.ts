import { todayLocalDateString } from "@/lib/format";
import { createSupabaseServerClient, isSupabaseConfigured, type SaleRow } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Transaction, TransactionType } from "@/lib/types";
import { getValuesIncludedUserIds } from "@/lib/values-exclusions";
import { weightedAveragePrice } from "@/lib/values-weighting";

import * as localStore from "./store-local";

function rowToTransaction(row: SaleRow): Transaction {
  return {
    id: row.id,
    type: row.type === "purchase" ? "purchase" : "sale",
    character: row.character,
    skin: row.skin,
    rarity: row.rarity,
    star: row.star,
    price: row.price,
    date: row.transaction_date,
    createdAt: row.created_at,
    createdBy: row.created_by,
    recordedBy: row.recorded_by_email,
    manualValueOnly: row.manual_value_only === true,
  };
}

function isPublicTransaction(transaction: Transaction): boolean {
  return transaction.manualValueOnly !== true;
}

export async function listTransactions(): Promise<Transaction[]> {
  if (!isSupabaseConfigured()) {
    return localStore.listTransactions();
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("sales")
    .select("*")
    .eq("manual_value_only", false)
    .order("id", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as SaleRow[]).map(rowToTransaction);
}

export async function listTransactionsForValues(options?: {
  userId?: string | null;
}): Promise<Transaction[]> {
  if (!isSupabaseConfigured()) {
    return localStore.listTransactionsForValues(options);
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.from("sales").select("*").order("id", { ascending: false });

  if (error) throw new Error(error.message);
  let transactions = (data as SaleRow[]).map(rowToTransaction);

  if (options?.userId) {
    return transactions.filter(
      (entry) => entry.createdBy === options.userId && entry.manualValueOnly !== true
    );
  }

  const includedUserIds = await getValuesIncludedUserIds();
  return transactions.filter((entry) => {
    if (entry.manualValueOnly) return true;
    return entry.createdBy != null && includedUserIds.has(entry.createdBy);
  });
}

/** @deprecated Use listTransactions */
export const listSales = listTransactions;

export type AddTransactionInput = {
  type: TransactionType;
  character: string;
  skin: string;
  rarity: string;
  star: number;
  price: number;
};

export type AddTransactionContext = {
  userId: string;
  recordedBy: string;
  supabase?: SupabaseClient;
};

export async function addTransaction(
  input: AddTransactionInput,
  context: AddTransactionContext
): Promise<Transaction> {
  if (!isSupabaseConfigured()) {
    return localStore.addTransaction(input, context);
  }

  const supabase = context.supabase;
  if (!supabase) {
    throw new Error("Authenticated Supabase client required");
  }

  const { data, error } = await supabase
    .from("sales")
    .insert({
      type: input.type,
      character: input.character,
      skin: input.skin,
      rarity: input.rarity,
      star: input.star,
      price: input.price,
      created_by: context.userId,
      recorded_by_email: context.recordedBy,
      transaction_date: todayLocalDateString(),
      manual_value_only: false,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return rowToTransaction(data as SaleRow);
}

export async function addManualValueTransaction(
  input: Omit<AddTransactionInput, "type">,
  context: AddTransactionContext
): Promise<Transaction> {
  if (!isSupabaseConfigured()) {
    return localStore.addManualValueTransaction(input, context);
  }

  const supabase = context.supabase;
  if (!supabase) {
    throw new Error("Authenticated Supabase client required");
  }

  const { data, error } = await supabase
    .from("sales")
    .insert({
      type: "sale",
      character: input.character,
      skin: input.skin,
      rarity: input.rarity,
      star: input.star,
      price: input.price,
      created_by: context.userId,
      recorded_by_email: context.recordedBy,
      transaction_date: todayLocalDateString(),
      manual_value_only: true,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return rowToTransaction(data as SaleRow);
}

/** @deprecated Use addTransaction */
export async function addSale(
  input: Omit<AddTransactionInput, "type">,
  context: AddTransactionContext
): Promise<Transaction> {
  return addTransaction({ ...input, type: "sale" }, context);
}

export async function deleteTransaction(
  id: number,
  supabase?: SupabaseClient
): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return localStore.deleteTransaction(id);
  }

  if (!supabase) {
    throw new Error("Authenticated Supabase client required");
  }

  const { data, error } = await supabase.from("sales").delete().eq("id", id).select("id");

  if (error) throw new Error(error.message);
  return (data?.length ?? 0) > 0;
}

/** @deprecated Use deleteTransaction */
export const deleteSale = deleteTransaction;

export async function getAveragePrice(
  character: string,
  skin: string,
  rarity: string,
  star: number,
  type: TransactionType = "sale"
): Promise<number | null> {
  if (!isSupabaseConfigured()) {
    return localStore.getAveragePrice(character, skin, rarity, star, type);
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("sales")
    .select("price, created_by, manual_value_only, transaction_date")
    .eq("type", type)
    .eq("character", character)
    .eq("skin", skin)
    .eq("rarity", rarity)
    .eq("star", star);

  if (error) throw new Error(error.message);
  if (!data?.length) return null;

  let rows = data;
  if (type === "sale") {
    const includedUserIds = await getValuesIncludedUserIds();
    rows = rows.filter(
      (row) =>
        row.manual_value_only === true ||
        (row.created_by != null && includedUserIds.has(row.created_by))
    );
  }

  if (!rows.length) return null;

  return weightedAveragePrice(
    rows.map((row) => ({
      price: row.price,
      date: row.transaction_date,
    }))
  );
}

export async function listRecentTransactionsByCharacterSkin(
  character: string,
  skin: string,
  limit = 10
): Promise<Transaction[]> {
  if (!isSupabaseConfigured()) {
    return localStore.listRecentTransactionsByCharacterSkin(character, skin, limit);
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("sales")
    .select("*")
    .eq("manual_value_only", false)
    .eq("character", character)
    .eq("skin", skin)
    .order("id", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data as SaleRow[]).map(rowToTransaction);
}

/** @deprecated Use listRecentTransactionsByCharacterSkin */
export const listRecentSalesByCharacterSkin = listRecentTransactionsByCharacterSkin;

export { isPublicTransaction };
