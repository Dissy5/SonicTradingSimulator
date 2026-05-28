import { NextRequest, NextResponse } from "next/server";

import { getUserDisplayName, isAuthContext, requireAuthApi } from "@/lib/auth-api";
import { SHOP_SLOT_COUNT } from "@/lib/shop";
import { markShopListingSold } from "@/lib/shop-store";

type RouteContext = {
  params: Promise<{ slot: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireAuthApi();
  if (!isAuthContext(auth)) return auth;

  const slot = Number((await context.params).slot);
  if (!Number.isInteger(slot) || slot < 0 || slot >= SHOP_SLOT_COUNT) {
    return NextResponse.json({ error: "Invalid shop slot" }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as { salePrice?: number };
  const salePrice = body.salePrice;

  if (salePrice != null && (!Number.isInteger(salePrice) || salePrice < 0)) {
    return NextResponse.json({ error: "salePrice must be a non-negative integer" }, { status: 400 });
  }

  try {
    await markShopListingSold(
      slot,
      {
        userId: auth.user.id,
        recordedBy: getUserDisplayName(auth.user),
        supabase: auth.supabase,
      },
      salePrice
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to mark listing as sold";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
