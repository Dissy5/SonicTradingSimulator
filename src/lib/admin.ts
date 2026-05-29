import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  createSupabaseAuthServerClient,
  getAuthUser,
} from "@/lib/supabase/auth-server";

export type UserProfile = {
  id: string;
  email: string | null;
  is_admin: boolean;
  display_name: string | null;
  theme: string | null;
  created_at: string;
};

export async function getProfile(userId: string): Promise<UserProfile | null> {
  const supabase = await createSupabaseAuthServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return data as UserProfile;
}

export async function isAdmin(): Promise<boolean> {
  const user = await getAuthUser();
  if (!user) return false;

  const profile = await getProfile(user.id);
  return profile?.is_admin === true;
}

export type AdminContext = {
  user: NonNullable<Awaited<ReturnType<typeof getAuthUser>>>;
  profile: UserProfile;
  supabase: SupabaseClient;
};

export async function requireAdminApi(): Promise<AdminContext | NextResponse> {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const profile = await getProfile(user.id);
  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const supabase = await createSupabaseAuthServerClient();
  return { user, profile, supabase };
}

export function isAdminContext(
  result: AdminContext | NextResponse
): result is AdminContext {
  return !(result instanceof NextResponse);
}
