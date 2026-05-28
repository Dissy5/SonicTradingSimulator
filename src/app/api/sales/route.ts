import { NextRequest, NextResponse } from "next/server";

import { getUserDisplayName, isAuthContext, requireAuthApi } from "@/lib/auth-api";
import { exists } from "@/lib/catalog-server";
import { addSale, listSales } from "@/lib/store";

export async function GET() {
  return NextResponse.json(await listSales());
}

export async function POST(request: NextRequest) {
  const auth = await requireAuthApi();
  if (!isAuthContext(auth)) return auth;

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
    const sale = await addSale(
      { character, skin, rarity, star, price },
      {
        userId: auth.user.id,
        recordedBy: getUserDisplayName(auth.user),
        supabase: auth.supabase,
      }
    );
    return NextResponse.json({ ok: true, sale }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to record sale";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
