import { NextRequest, NextResponse } from "next/server";

import { isAdminContext, requireAdminApi } from "@/lib/admin";
import { exists } from "@/lib/catalog-server";
import { listSkinsWithoutSaleHistory } from "@/lib/manual-values-server";
import { getUserDisplayName } from "@/lib/user-settings";
import { addManualValueTransaction } from "@/lib/store";

export async function GET() {
  const admin = await requireAdminApi();
  if (!isAdminContext(admin)) return admin;

  try {
    const skins = await listSkinsWithoutSaleHistory();
    return NextResponse.json({ skins });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load unassigned skins";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const admin = await requireAdminApi();
  if (!isAdminContext(admin)) return admin;

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
    const transaction = await addManualValueTransaction(
      { character, skin, rarity, star, price },
      {
        userId: admin.user.id,
        recordedBy: await getUserDisplayName(admin.user, admin.supabase),
        supabase: admin.supabase,
      }
    );
    return NextResponse.json({ ok: true, transaction }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to record manual value";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
