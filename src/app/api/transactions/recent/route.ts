import { NextRequest, NextResponse } from "next/server";

import { listRecentTransactionsByCharacterSkin } from "@/lib/store";

export async function GET(request: NextRequest) {
  const character = request.nextUrl.searchParams.get("character");
  const skin = request.nextUrl.searchParams.get("skin");
  const limitParam = request.nextUrl.searchParams.get("limit");

  if (!character || !skin) {
    return NextResponse.json({ error: "character and skin are required" }, { status: 400 });
  }

  const limit = limitParam ? Number(limitParam) : 10;
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    return NextResponse.json({ error: "limit must be between 1 and 50" }, { status: 400 });
  }

  const transactions = await listRecentTransactionsByCharacterSkin(character, skin, limit);
  return NextResponse.json(transactions);
}
