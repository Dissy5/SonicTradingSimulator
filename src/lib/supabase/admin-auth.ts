import { createClient } from "@supabase/supabase-js";

export function isAuthAdminConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

/**
 * Removes a rejected auth.users row via the Supabase secret key (SUPABASE_SERVICE_ROLE_KEY).
 * Used after allowlist denial so orphan accounts do not accumulate in the dashboard.
 */
export async function deleteAuthUser(userId: string): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    console.warn(
      "SUPABASE_SERVICE_ROLE_KEY is not set; rejected sign-in user was not deleted from Supabase Auth"
    );
    return false;
  }

  const admin = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { error } = await admin.auth.admin.deleteUser(userId);

  if (error) {
    console.error("Failed to delete rejected auth user:", error.message);
    return false;
  }

  return true;
}
