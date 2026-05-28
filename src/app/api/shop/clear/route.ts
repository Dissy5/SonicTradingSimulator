import { NextResponse } from "next/server";

import { getUserDisplayName, isAuthContext, requireAuthApi } from "@/lib/auth-api";
import { clearShop } from "@/lib/shop-store";

export async function DELETE() {
  const auth = await requireAuthApi();
  if (!isAuthContext(auth)) return auth;

  try {
    const removed = await clearShop({
      userId: auth.user.id,
      recordedBy: getUserDisplayName(auth.user),
      supabase: auth.supabase,
    });
    return NextResponse.json({ ok: true, removed });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to clear shop";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
