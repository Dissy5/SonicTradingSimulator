import type { SupabaseClient, User } from "@supabase/supabase-js";

import { getProfile, type UserProfile } from "@/lib/admin";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { parseSiteTheme, type SiteTheme } from "@/lib/theme";

import * as localFlips from "./flips-store-local";
import * as localSettings from "./user-settings-local";
import * as localShop from "./shop-store-local";
import * as localStore from "./store-local";

export type UserSettings = {
  displayName: string | null;
  theme: SiteTheme;
  defaultDisplayName: string;
  email: string | null;
};

export function defaultDisplayNameFromUser(user: User): string {
  return (
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    user.email?.split("@")[0] ??
    "Signed in"
  );
}

export function resolveDisplayName(user: User, profile?: UserProfile | null): string {
  const customName = profile?.display_name?.trim();
  if (customName) return customName;
  return defaultDisplayNameFromUser(user);
}

export async function getUserDisplayName(
  user: User,
  supabase?: SupabaseClient
): Promise<string> {
  if (!isSupabaseConfigured()) {
    const settings = await localSettings.getLocalUserSettings(user.id);
    if (settings.displayName?.trim()) return settings.displayName.trim();
    return defaultDisplayNameFromUser(user);
  }

  const profile = await getProfile(user.id);
  return resolveDisplayName(user, profile);
}

export async function getUserSettings(user: User): Promise<UserSettings> {
  const defaultDisplayName = defaultDisplayNameFromUser(user);

  if (!isSupabaseConfigured()) {
    const settings = await localSettings.getLocalUserSettings(user.id);
    return {
      displayName: settings.displayName,
      theme: settings.theme,
      defaultDisplayName,
      email: user.email ?? null,
    };
  }

  const supabase = await createSupabaseAuthServerClient();
  await ensureUserProfile(user, supabase);

  const profile = await getProfile(user.id);
  return {
    displayName: profile?.display_name ?? null,
    theme: parseSiteTheme(profile?.theme),
    defaultDisplayName,
    email: user.email ?? null,
  };
}

function normalizeDisplayName(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > 64) {
    throw new Error("Display name must be 64 characters or fewer");
  }
  return trimmed;
}

async function ensureUserProfile(user: User, supabase: SupabaseClient): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const { data, error: readError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (readError) throw new Error(readError.message);
  if (data) return;

  const { error: insertError } = await supabase.from("profiles").insert({
    id: user.id,
    email: user.email ?? null,
  });

  if (insertError) throw new Error(insertError.message);
}

async function syncRecordedByDisplayName(
  user: User,
  supabase: SupabaseClient,
  displayName: string | null
): Promise<void> {
  const recordedBy =
    displayName?.trim() || defaultDisplayNameFromUser(user);

  if (!isSupabaseConfigured()) {
    await Promise.all([
      localStore.updateRecordedByForUser(user.id, recordedBy),
      localFlips.updateRecordedByForUser(user.id, recordedBy),
      localShop.updateRecordedByForUser(user.id, recordedBy),
    ]);
    return;
  }

  const [salesResult, flipsResult, shopResult] = await Promise.all([
    supabase.from("sales").update({ recorded_by_email: recordedBy }).eq("created_by", user.id),
    supabase.from("flips").update({ recorded_by_email: recordedBy }).eq("created_by", user.id),
    supabase
      .from("shop_listings")
      .update({ recorded_by_email: recordedBy })
      .eq("created_by", user.id),
  ]);

  if (salesResult.error) throw new Error(salesResult.error.message);
  if (flipsResult.error) throw new Error(flipsResult.error.message);
  if (shopResult.error) throw new Error(shopResult.error.message);
}

export type UpdateUserSettingsInput = {
  displayName?: string | null;
  theme?: SiteTheme;
};

export async function updateUserSettings(
  user: User,
  supabase: SupabaseClient,
  input: UpdateUserSettingsInput
): Promise<UserSettings> {
  const patch: UpdateUserSettingsInput = {};

  if ("displayName" in input) {
    patch.displayName = normalizeDisplayName(input.displayName);
  }

  if (input.theme != null) {
    patch.theme = parseSiteTheme(input.theme);
  }

  if (!isSupabaseConfigured()) {
    const localPatch: Partial<import("./user-settings-local").LocalUserSettings> = {};
    if ("displayName" in patch) {
      localPatch.displayName = patch.displayName ?? null;
    }
    if (patch.theme != null) {
      localPatch.theme = patch.theme;
    }
    await localSettings.updateLocalUserSettings(user.id, localPatch);
    if ("displayName" in patch) {
      await syncRecordedByDisplayName(user, supabase, patch.displayName ?? null);
    }
    return getUserSettings(user);
  }

  await ensureUserProfile(user, supabase);

  const row: { display_name?: string | null; theme?: SiteTheme } = {};
  if ("displayName" in patch) {
    row.display_name = patch.displayName ?? null;
  }
  if (patch.theme != null) {
    row.theme = patch.theme;
  }

  const { error } = await supabase.from("profiles").update(row).eq("id", user.id);
  if (error) throw new Error(error.message);

  if ("displayName" in patch) {
    await syncRecordedByDisplayName(user, supabase, patch.displayName ?? null);
  }

  return getUserSettings(user);
}

export type DeleteUserDataResult = {
  transactions: number;
  flips: number;
  shopListings: number;
};

export async function deleteAllUserData(
  userId: string,
  supabase: SupabaseClient
): Promise<DeleteUserDataResult> {
  if (!isSupabaseConfigured()) {
    const [transactionsRemoved, flipsRemoved, shopRemoved] = await Promise.all([
      localStore.deleteAllTransactionsForUser(userId),
      localFlips.deleteAllFlipsForUser(userId),
      localShop.clearShopListings(userId),
    ]);

    return {
      transactions: transactionsRemoved,
      flips: flipsRemoved,
      shopListings: shopRemoved,
    };
  }

  const [salesResult, flipsResult, shopResult] = await Promise.all([
    supabase.from("sales").delete().eq("created_by", userId).select("id"),
    supabase.from("flips").delete().eq("created_by", userId).select("id"),
    supabase.from("shop_listings").delete().eq("created_by", userId).select("id"),
  ]);

  if (salesResult.error) throw new Error(salesResult.error.message);
  if (flipsResult.error) throw new Error(flipsResult.error.message);
  if (shopResult.error) throw new Error(shopResult.error.message);

  return {
    transactions: salesResult.data?.length ?? 0,
    flips: flipsResult.data?.length ?? 0,
    shopListings: shopResult.data?.length ?? 0,
  };
}
