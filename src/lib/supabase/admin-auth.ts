import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function isAuthAdminConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export function createSupabaseAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Admin API is not configured (missing SUPABASE_SERVICE_ROLE_KEY)");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Removes an auth.users row via the Supabase service role key.
 * Cascades to public.profiles and related FK rows.
 */
export async function deleteAuthUser(userId: string): Promise<boolean> {
  if (!isAuthAdminConfigured()) {
    console.warn(
      "SUPABASE_SERVICE_ROLE_KEY is not set; auth user was not deleted from Supabase Auth"
    );
    return false;
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);

  if (error) {
    console.error("Failed to delete auth user:", error.message);
    return false;
  }

  return true;
}
