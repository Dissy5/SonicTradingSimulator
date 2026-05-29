import type { User } from "@supabase/supabase-js";

import type { UserProfile } from "@/lib/admin";
import {
  createSupabaseAdminClient,
  deleteAuthUser,
  isAuthAdminConfigured,
} from "@/lib/supabase/admin-auth";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { deleteAllUserData, type DeleteUserDataResult } from "@/lib/user-settings";

export type AdminUserRow = {
  id: string;
  email: string | null;
  displayName: string | null;
  isAdmin: boolean;
  contributesToValues: boolean;
  createdAt: string;
};

async function listAllAuthUsers(): Promise<User[]> {
  const admin = createSupabaseAdminClient();
  const users: User[] = [];
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);

    users.push(...data.users);
    if (data.users.length < perPage) break;
    page += 1;
  }

  return users;
}

function profileToAdminRow(authUser: User, profile: UserProfile | undefined): AdminUserRow {
  return {
    id: authUser.id,
    email: authUser.email ?? profile?.email ?? null,
    displayName: profile?.display_name ?? null,
    isAdmin: profile?.is_admin === true,
    contributesToValues: profile?.contributes_to_values === true,
    createdAt: profile?.created_at ?? authUser.created_at,
  };
}

export async function listAppUsers(): Promise<AdminUserRow[]> {
  if (!isSupabaseConfigured() || !isAuthAdminConfigured()) {
    return [];
  }

  const admin = createSupabaseAdminClient();
  const [authUsers, profilesResult] = await Promise.all([
    listAllAuthUsers(),
    admin.from("profiles").select("*"),
  ]);

  if (profilesResult.error) throw new Error(profilesResult.error.message);

  const profilesById = new Map(
    (profilesResult.data as UserProfile[]).map((profile) => [profile.id, profile])
  );

  return authUsers
    .map((authUser) => profileToAdminRow(authUser, profilesById.get(authUser.id)))
    .sort((a, b) => {
      const byEmail = (a.email ?? "").localeCompare(b.email ?? "");
      if (byEmail !== 0) return byEmail;
      return a.id.localeCompare(b.id);
    });
}

export async function setUserContributesToValues(
  userId: string,
  contributesToValues: boolean
): Promise<AdminUserRow> {
  const admin = createSupabaseAdminClient();
  const { data: authData, error: authError } = await admin.auth.admin.getUserById(userId);
  if (authError) throw new Error(authError.message);
  if (!authData.user) throw new Error("Auth user not found");

  const { data, error } = await admin
    .from("profiles")
    .upsert(
      {
        id: userId,
        email: authData.user.email ?? null,
        contributes_to_values: contributesToValues,
      },
      { onConflict: "id" }
    )
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  return profileToAdminRow(authData.user, data as UserProfile);
}

export async function purgeUserCompletely(userId: string): Promise<DeleteUserDataResult> {
  const admin = createSupabaseAdminClient();
  const result = await deleteAllUserData(userId, admin);
  const deleted = await deleteAuthUser(userId);

  if (!deleted) {
    throw new Error("Failed to remove user from Supabase Auth");
  }

  return result;
}
