import type { SupabaseClient } from "@supabase/supabase-js";

import { isSupabaseConfigured, type FlipRow } from "@/lib/supabase/server";
import type { Flip } from "@/lib/types";

import * as localFlips from "./flips-store-local";
import { addTransaction } from "./store";

function rowToFlip(row: FlipRow): Flip {
  return {
    id: row.id,
    character: row.character,
    skin: row.skin,
    rarity: row.rarity,
    star: row.star,
    buyPrice: row.buy_price,
    plannedSellPrice: row.planned_sell_price ?? null,
    sellPrice: row.sell_price,
    boughtAt: row.bought_at,
    soldAt: row.sold_at,
    createdBy: row.created_by,
    recordedBy: row.recorded_by_email,
  };
}

export async function listFlips(client: SupabaseClient): Promise<Flip[]> {
  if (!isSupabaseConfigured()) {
    return localFlips.listFlips();
  }

  const { data, error } = await client
    .from("flips")
    .select("*")
    .order("bought_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as FlipRow[]).map(rowToFlip);
}

export async function getFlip(id: number, client: SupabaseClient): Promise<Flip | null> {
  if (!isSupabaseConfigured()) {
    return localFlips.getFlip(id);
  }

  const { data, error } = await client.from("flips").select("*").eq("id", id).maybeSingle();

  if (error) throw new Error(error.message);
  return data ? rowToFlip(data as FlipRow) : null;
}

export type CreateFlipInput = {
  character: string;
  skin: string;
  rarity: string;
  star: number;
  buyPrice: number;
  plannedSellPrice?: number | null;
};

export type FlipMutationContext = {
  userId: string;
  recordedBy: string;
  supabase: SupabaseClient;
};

export async function createFlip(
  input: CreateFlipInput,
  context: FlipMutationContext
): Promise<Flip> {
  if (!isSupabaseConfigured()) {
    return localFlips.createFlip(input, context);
  }

  const { data, error } = await context.supabase
    .from("flips")
    .insert({
      character: input.character,
      skin: input.skin,
      rarity: input.rarity,
      star: input.star,
      buy_price: input.buyPrice,
      planned_sell_price: input.plannedSellPrice ?? null,
      created_by: context.userId,
      recorded_by_email: context.recordedBy,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return rowToFlip(data as FlipRow);
}

export async function completeFlip(
  id: number,
  sellPrice: number,
  context: FlipMutationContext
): Promise<Flip> {
  if (!isSupabaseConfigured()) {
    return localFlips.completeFlip(id, sellPrice, context);
  }

  const { data, error } = await context.supabase
    .from("flips")
    .update({
      sell_price: sellPrice,
      sold_at: new Date().toISOString(),
    })
    .eq("id", id)
    .is("sell_price", null)
    .select("*")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Flip not found or already sold");
  return rowToFlip(data as FlipRow);
}

async function revertFlipCompletion(id: number, context: FlipMutationContext) {
  const { error } = await context.supabase
    .from("flips")
    .update({ sell_price: null, sold_at: null })
    .eq("id", id)
    .eq("created_by", context.userId);

  if (error) throw new Error(error.message);
}

export async function completeFlipAndLogSale(
  id: number,
  sellPrice: number,
  context: FlipMutationContext
): Promise<Flip> {
  const existing = await getFlip(id, context.supabase);
  if (!existing) throw new Error("Flip not found");
  if (existing.sellPrice != null) throw new Error("Flip already sold");

  const completed = await completeFlip(id, sellPrice, context);

  try {
    await addTransaction(
      {
        type: "sale",
        character: completed.character,
        skin: completed.skin,
        rarity: completed.rarity,
        star: completed.star,
        price: sellPrice,
      },
      {
        userId: context.userId,
        recordedBy: context.recordedBy,
        supabase: context.supabase,
      }
    );
  } catch (error) {
    if (isSupabaseConfigured()) {
      await revertFlipCompletion(id, context);
    } else {
      await localFlips.reopenFlip(id);
    }
    throw error;
  }

  return completed;
}

export async function deleteFlip(
  id: number,
  context: FlipMutationContext
): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return localFlips.deleteFlip(id);
  }

  const existing = await getFlip(id, context.supabase);
  if (!existing) return false;
  if (existing.sellPrice != null) {
    throw new Error("Cannot delete a closed flip");
  }

  const { data, error } = await context.supabase
    .from("flips")
    .delete()
    .eq("id", id)
    .is("sell_price", null)
    .select("id");

  if (error) throw new Error(error.message);
  return (data?.length ?? 0) > 0;
}
