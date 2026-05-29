import { NextRequest, NextResponse } from "next/server";

import { isAuthContext, requireAuthApi } from "@/lib/auth-api";
import { parseSiteTheme } from "@/lib/theme";
import {
  deleteAllUserData,
  getUserSettings,
  updateUserSettings,
} from "@/lib/user-settings";

export async function GET() {
  const auth = await requireAuthApi();
  if (!isAuthContext(auth)) return auth;

  try {
    const settings = await getUserSettings(auth.user);
    return NextResponse.json(settings);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuthApi();
  if (!isAuthContext(auth)) return auth;

  const body = (await request.json()) as {
    displayName?: string | null;
    theme?: string;
  };

  try {
    const settings = await updateUserSettings(auth.user, auth.supabase, {
      displayName: body.displayName,
      theme: body.theme != null ? parseSiteTheme(body.theme) : undefined,
    });

    const response = NextResponse.json(settings);
    if (body.theme != null) {
      response.cookies.set("sts-theme", settings.theme, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
      });
    }
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save settings";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE() {
  const auth = await requireAuthApi();
  if (!isAuthContext(auth)) return auth;

  try {
    const result = await deleteAllUserData(auth.user.id, auth.supabase);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete personal data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
