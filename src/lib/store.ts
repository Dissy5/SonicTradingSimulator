import { createSupabaseServerClient, isSupabaseConfigured, type SaleRow } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Transaction, TransactionType } from "@/lib/types";

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
    createdAt: row.created_at,
    createdBy: row.created_by,
    recordedBy: row.recorded_by_email,
  };
}

export async function listTransactions(): Promise<Transaction[]> {
  if (!isSupabaseConfigured()) {
    return localStore.listTransactions();
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("sales")
    .select("*")
    .order("id", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as SaleRow[]).map(rowToTransaction);
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
    .select("price")
    .eq("type", type)
    .eq("character", character)
    .eq("skin", skin)
    .eq("rarity", rarity)
    .eq("star", star);

  if (error) throw new Error(error.message);
  if (!data?.length) return null;

  const total = data.reduce((sum, row) => sum + row.price, 0);
  return Math.round(total / data.length);
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
    .eq("character", character)
    .eq("skin", skin)
    .order("id", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data as SaleRow[]).map(rowToTransaction);
}

/** @deprecated Use listRecentTransactionsByCharacterSkin */
export const listRecentSalesByCharacterSkin = listRecentTransactionsByCharacterSkin;
