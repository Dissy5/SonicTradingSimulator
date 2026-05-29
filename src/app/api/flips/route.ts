import { NextRequest, NextResponse } from "next/server";

import { getUserDisplayName, isAuthContext, requireAuthApi } from "@/lib/auth-api";
import { exists } from "@/lib/catalog-server";
import { createFlip, listFlips } from "@/lib/flips-store";

export async function GET() {
  const auth = await requireAuthApi();
  if (!isAuthContext(auth)) return auth;

  try {
    return NextResponse.json(await listFlips(auth.supabase));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load flips";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuthApi();
  if (!isAuthContext(auth)) return auth;

  const body = (await request.json()) as {
    character?: string;
    skin?: string;
    rarity?: string;
    star?: number;
    buyPrice?: number;
    plannedSellPrice?: number | null;
  };

  const { character, skin, rarity, star, buyPrice, plannedSellPrice } = body;

  if (!character || !skin || !rarity || star == null || buyPrice == null) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!Number.isInteger(star) || star < 1 || star > 6) {
    return NextResponse.json({ error: "star must be between 1 and 6" }, { status: 400 });
  }

  if (!Number.isInteger(buyPrice) || buyPrice < 0) {
    return NextResponse.json({ error: "buyPrice must be a non-negative integer" }, { status: 400 });
  }

  if (
    plannedSellPrice != null &&
    (!Number.isInteger(plannedSellPrice) || plannedSellPrice < 0)
  ) {
    return NextResponse.json(
      { error: "plannedSellPrice must be a non-negative integer" },
      { status: 400 }
    );
  }

  if (!(await exists(character, skin, rarity))) {
    return NextResponse.json({ error: "Skin not found" }, { status: 404 });
  }

  try {
    const flip = await createFlip(
      {
        character,
        skin,
        rarity,
        star,
        buyPrice,
        plannedSellPrice: plannedSellPrice ?? null,
      },
      {
        userId: auth.user.id,
        recordedBy: await getUserDisplayName(auth.user, auth.supabase),
        supabase: auth.supabase,
      }
    );
    return NextResponse.json(flip, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to record purchase";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
