import { NextResponse } from "next/server";

import { isAuthContext, requireAuthApi } from "@/lib/auth-api";
import { getShopBoard } from "@/lib/shop-store";

export async function GET() {
  const auth = await requireAuthApi();
  if (!isAuthContext(auth)) return auth;

  try {
    const board = await getShopBoard(auth.supabase, auth.user.id);
    return NextResponse.json({ slots: board });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load shop";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
