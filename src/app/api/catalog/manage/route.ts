import { NextResponse } from "next/server";

import { getCatalogManageData } from "@/lib/catalog-server";
import { SKIN_RARITIES } from "@/lib/rarities";

export async function GET() {
  try {
    const result = await getCatalogManageData();
    return NextResponse.json({
      characters: result.characters,
      skins: result.skins,
      rarities: SKIN_RARITIES,
      readOnly: result.readOnly ?? false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load catalog";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
