import { NextRequest, NextResponse } from "next/server";

import {
  getImagePath,
  getRarities,
  getSkins,
  exists,
} from "@/lib/catalog-server";

export async function GET(request: NextRequest) {
  const characterName = request.nextUrl.searchParams.get("character");
  const skinName = request.nextUrl.searchParams.get("skin");
  const rarity = request.nextUrl.searchParams.get("rarity");

  if (!characterName) {
    return NextResponse.json({ error: "character is required" }, { status: 400 });
  }

  if (skinName && rarity) {
    const imagePath = await getImagePath(characterName, skinName, rarity);
    if (!imagePath) {
      return NextResponse.json({ error: "Skin not found" }, { status: 404 });
    }
    return NextResponse.json({ imagePath });
  }

  if (skinName) {
    const rarities = await getRarities(characterName, skinName);
    if (rarities.length === 0) {
      return NextResponse.json({ error: "Skin not found" }, { status: 404 });
    }
    return NextResponse.json(rarities);
  }

  const skins = await getSkins(characterName);
  if (skins.length === 0) {
    return NextResponse.json({ error: "Character not found" }, { status: 404 });
  }

  return NextResponse.json(skins);
}
