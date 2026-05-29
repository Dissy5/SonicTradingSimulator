import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

let includedUserIdsCache: Set<string> | null = null;
let includedUserIdsCacheAt = 0;
const CACHE_TTL_MS = 30_000;

/** Users explicitly opted in to community value calculations. */
export async function getValuesIncludedUserIds(): Promise<Set<string>> {
  if (!isSupabaseConfigured()) {
    return new Set();
  }

  const now = Date.now();
  if (includedUserIdsCache && now - includedUserIdsCacheAt < CACHE_TTL_MS) {
    return includedUserIdsCache;
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("contributes_to_values", true);

  if (error) throw new Error(error.message);

  includedUserIdsCache = new Set((data ?? []).map((row) => row.id as string));
  includedUserIdsCacheAt = now;
  return includedUserIdsCache;
}

export function clearValuesIncludedUserIdsCache(): void {
  includedUserIdsCache = null;
  includedUserIdsCacheAt = 0;
}

/** @deprecated Use clearValuesIncludedUserIdsCache */
export const clearValuesExcludedUserIdsCache = clearValuesIncludedUserIdsCache;
