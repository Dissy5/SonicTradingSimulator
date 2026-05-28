import { NextRequest, NextResponse } from "next/server";

import { getAveragePrice } from "@/lib/store";

export async function GET(request: NextRequest) {
  const characterName = request.nextUrl.searchParams.get("character");
  const skinName = request.nextUrl.searchParams.get("skin");
  const rarity = request.nextUrl.searchParams.get("rarity");
  const starParam = request.nextUrl.searchParams.get("star");

  if (!characterName || !skinName || !rarity || !starParam) {
    return NextResponse.json(
      { error: "character, skin, rarity, and star are required" },
      { status: 400 }
    );
  }

  const star = Number(starParam);
  if (!Number.isInteger(star) || star < 1 || star > 6) {
    return NextResponse.json({ error: "star must be between 1 and 6" }, { status: 400 });
  }

  const average = await getAveragePrice(characterName, skinName, rarity, star);
  return NextResponse.json({ average });
}
