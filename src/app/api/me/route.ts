import { NextResponse } from "next/server";

import { getProfile } from "@/lib/admin";
import { getAuthUser } from "@/lib/supabase/auth-server";
import { parseSiteTheme } from "@/lib/theme";
import { getUserSettings, resolveDisplayName } from "@/lib/user-settings";

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ user: null, isAdmin: false, theme: "dark" });
  }

  const profile = await getProfile(user.id);
  const settings = await getUserSettings(user);

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email ?? null,
      name: resolveDisplayName(user, profile),
      avatarUrl: (user.user_metadata?.avatar_url as string | undefined) ?? null,
    },
    isAdmin: profile?.is_admin === true,
    theme: parseSiteTheme(settings.theme),
  });
}
