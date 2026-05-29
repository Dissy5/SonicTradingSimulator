import { createClient, SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseKey());
}

function getSupabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL;
}

function getSupabaseKey(): string | undefined {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function createSupabaseServerClient(): SupabaseClient {
  if (client) return client;

  const url = getSupabaseUrl();
  const key = getSupabaseKey();

  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local"
    );
  }

  client = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return client;
}

export type SaleRow = {
  id: number;
  type: string;
  character: string;
  skin: string;
  rarity: string;
  star: number;
  price: number;
  created_at: string;
  created_by: string | null;
  recorded_by_email: string | null;
};

export type FlipRow = {
  id: number;
  character: string;
  skin: string;
  rarity: string;
  star: number;
  buy_price: number;
  planned_sell_price: number | null;
  sell_price: number | null;
  bought_at: string;
  sold_at: string | null;
  created_by: string;
  recorded_by_email: string | null;
};

export type ShopListingRow = {
  id: number;
  slot_index: number;
  character: string;
  skin: string;
  rarity: string;
  star: number;
  price: number;
  created_by: string;
  recorded_by_email: string | null;
  created_at: string;
};
