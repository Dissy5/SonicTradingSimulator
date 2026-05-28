import { NextRequest, NextResponse } from "next/server";

import { getUserDisplayName, isAuthContext, requireAuthApi } from "@/lib/auth-api";
import { exists } from "@/lib/catalog-server";
import { SHOP_SLOT_COUNT } from "@/lib/shop";
import { deleteShopListing, upsertShopListing } from "@/lib/shop-store";

type RouteContext = {
  params: Promise<{ slot: string }>;
};

function parseSlot(raw: string): number | null {
  const slot = Number(raw);
  if (!Number.isInteger(slot) || slot < 0 || slot >= SHOP_SLOT_COUNT) return null;
  return slot;
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = await requireAuthApi();
  if (!isAuthContext(auth)) return auth;

  const slotIndex = parseSlot((await context.params).slot);
  if (slotIndex == null) {
    return NextResponse.json({ error: "Invalid shop slot" }, { status: 400 });
  }

  const body = (await request.json()) as {
    character?: string;
    skin?: string;
    rarity?: string;
    star?: number;
    price?: number;
  };

  const { character, skin, rarity, star, price } = body;

  if (!character || !skin || !rarity || star == null || price == null) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!Number.isInteger(star) || star < 1 || star > 6) {
    return NextResponse.json({ error: "star must be between 1 and 6" }, { status: 400 });
  }

  if (!Number.isInteger(price) || price < 0) {
    return NextResponse.json({ error: "price must be a non-negative integer" }, { status: 400 });
  }

  if (!(await exists(character, skin, rarity))) {
    return NextResponse.json({ error: "Skin not found" }, { status: 404 });
  }

  try {
    const listing = await upsertShopListing(
      slotIndex,
      { character, skin, rarity, star, price },
      {
        userId: auth.user.id,
        recordedBy: getUserDisplayName(auth.user),
        supabase: auth.supabase,
      }
    );
    return NextResponse.json(listing);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save listing";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const auth = await requireAuthApi();
  if (!isAuthContext(auth)) return auth;

  const slotIndex = parseSlot((await context.params).slot);
  if (slotIndex == null) {
    return NextResponse.json({ error: "Invalid shop slot" }, { status: 400 });
  }

  try {
    const removed = await deleteShopListing(slotIndex, {
      userId: auth.user.id,
      recordedBy: getUserDisplayName(auth.user),
      supabase: auth.supabase,
    });
    if (!removed) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete listing";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
