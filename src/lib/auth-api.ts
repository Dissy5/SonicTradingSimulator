import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  createSupabaseAuthServerClient,
  getAuthUser,
} from "@/lib/supabase/auth-server";

export { getUserDisplayName } from "@/lib/user-settings";

export type AuthContext = {
  user: NonNullable<Awaited<ReturnType<typeof getAuthUser>>>;
  supabase: SupabaseClient;
};

export async function requireAuthApi(): Promise<AuthContext | NextResponse> {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const supabase = await createSupabaseAuthServerClient();
  return { user, supabase };
}

export function isAuthContext(
  result: AuthContext | NextResponse
): result is AuthContext {
  return !(result instanceof NextResponse);
}
