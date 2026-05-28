import { NextResponse } from "next/server";

import { isAdminContext, requireAdminApi } from "@/lib/admin";
import { getCatalogManageData } from "@/lib/catalog-server";
import { SKIN_RARITIES } from "@/lib/rarities";

export async function GET() {
  const admin = await requireAdminApi();
  if (!isAdminContext(admin)) return admin;

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
