import { createSupabaseServerClient, isSupabaseConfigured, type SaleRow } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Sale } from "@/lib/types";

import * as localStore from "./store-local";

function rowToSale(row: SaleRow): Sale {
  return {
    id: row.id,
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

export async function listSales(): Promise<Sale[]> {
  if (!isSupabaseConfigured()) {
    return localStore.listSales();
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("sales")
    .select("*")
    .order("id", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as SaleRow[]).map(rowToSale);
}

export type AddSaleInput = {
  character: string;
  skin: string;
  rarity: string;
  star: number;
  price: number;
};

export type AddSaleContext = {
  userId: string;
  recordedBy: string;
  supabase?: SupabaseClient;
};

export async function addSale(input: AddSaleInput, context: AddSaleContext): Promise<Sale> {
  if (!isSupabaseConfigured()) {
    return localStore.addSale(input, context);
  }

  const supabase = context.supabase;
  if (!supabase) {
    throw new Error("Authenticated Supabase client required");
  }

  const { data, error } = await supabase
    .from("sales")
    .insert({
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
  return rowToSale(data as SaleRow);
}

export async function deleteSale(id: number, supabase?: SupabaseClient): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return localStore.deleteSale(id);
  }

  if (!supabase) {
    throw new Error("Authenticated Supabase client required");
  }

  const { data, error } = await supabase.from("sales").delete().eq("id", id).select("id");

  if (error) throw new Error(error.message);
  return (data?.length ?? 0) > 0;
}

export async function getAveragePrice(
  character: string,
  skin: string,
  rarity: string,
  star: number
): Promise<number | null> {
  if (!isSupabaseConfigured()) {
    return localStore.getAveragePrice(character, skin, rarity, star);
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("sales")
    .select("price")
    .eq("character", character)
    .eq("skin", skin)
    .eq("rarity", rarity)
    .eq("star", star);

  if (error) throw new Error(error.message);
  if (!data?.length) return null;

  const total = data.reduce((sum, row) => sum + row.price, 0);
  return Math.round(total / data.length);
}

export async function listRecentSalesByCharacterSkin(
  character: string,
  skin: string,
  limit = 10
): Promise<Sale[]> {
  if (!isSupabaseConfigured()) {
    return localStore.listRecentSalesByCharacterSkin(character, skin, limit);
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
  return (data as SaleRow[]).map(rowToSale);
}
