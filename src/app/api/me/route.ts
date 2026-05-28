import { NextResponse } from "next/server";

import { getProfile } from "@/lib/admin";
import { getAuthUser } from "@/lib/supabase/auth-server";

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ user: null, isAdmin: false });
  }

  const profile = await getProfile(user.id);

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email ?? null,
      name:
        (user.user_metadata?.full_name as string | undefined) ??
        (user.user_metadata?.name as string | undefined) ??
        user.email?.split("@")[0] ??
        "Signed in",
      avatarUrl: (user.user_metadata?.avatar_url as string | undefined) ?? null,
    },
    isAdmin: profile?.is_admin === true,
  });
}
