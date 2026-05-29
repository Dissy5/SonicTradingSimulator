import { NextRequest, NextResponse } from "next/server";

import { isAdminContext, requireAdminApi } from "@/lib/admin";
import { purgeUserCompletely, setUserContributesToValues } from "@/lib/admin-users";
import { isAuthAdminConfigured } from "@/lib/supabase/admin-auth";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { clearValuesIncludedUserIdsCache } from "@/lib/values-exclusions";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function adminUnavailableResponse() {
  return NextResponse.json(
    { error: "User management requires Supabase and a service role key" },
    { status: 503 }
  );
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const admin = await requireAdminApi();
  if (!isAdminContext(admin)) return admin;

  if (!isSupabaseConfigured() || !isAuthAdminConfigured()) {
    return adminUnavailableResponse();
  }

  const { id: userId } = await context.params;
  const body = (await request.json()) as { contributesToValues?: boolean };

  if (typeof body.contributesToValues !== "boolean") {
    return NextResponse.json(
      { error: "contributesToValues must be a boolean" },
      { status: 400 }
    );
  }

  try {
    const user = await setUserContributesToValues(userId, body.contributesToValues);
    clearValuesIncludedUserIdsCache();
    return NextResponse.json({ user });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const admin = await requireAdminApi();
  if (!isAdminContext(admin)) return admin;

  if (!isSupabaseConfigured() || !isAuthAdminConfigured()) {
    return adminUnavailableResponse();
  }

  const { id: userId } = await context.params;

  if (userId === admin.user.id) {
    return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
  }

  try {
    const result = await purgeUserCompletely(userId);
    clearValuesIncludedUserIdsCache();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
