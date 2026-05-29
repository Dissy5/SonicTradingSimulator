import { NextResponse } from "next/server";

import { listAppUsers } from "@/lib/admin-users";
import { isAdminContext, requireAdminApi } from "@/lib/admin";
import { isAuthAdminConfigured } from "@/lib/supabase/admin-auth";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export async function GET() {
  const admin = await requireAdminApi();
  if (!isAdminContext(admin)) return admin;

  if (!isSupabaseConfigured() || !isAuthAdminConfigured()) {
    return NextResponse.json(
      { error: "User management requires Supabase and a service role key" },
      { status: 503 }
    );
  }

  try {
    const users = await listAppUsers();
    return NextResponse.json({ users });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load users";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
