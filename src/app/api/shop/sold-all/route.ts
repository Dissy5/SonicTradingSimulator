import { NextResponse } from "next/server";

import { getUserDisplayName, isAuthContext, requireAuthApi } from "@/lib/auth-api";
import { markAllShopListingsSold } from "@/lib/shop-store";

export async function POST() {
  const auth = await requireAuthApi();
  if (!isAuthContext(auth)) return auth;

  try {
    const sold = await markAllShopListingsSold({
      userId: auth.user.id,
      recordedBy: await getUserDisplayName(auth.user, auth.supabase),
      supabase: auth.supabase,
    });
    return NextResponse.json({ ok: true, sold });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to mark shop as sold";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
