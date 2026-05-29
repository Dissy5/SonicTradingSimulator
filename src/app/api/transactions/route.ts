import { NextRequest, NextResponse } from "next/server";

import { getUserDisplayName, isAuthContext, requireAuthApi } from "@/lib/auth-api";
import { exists } from "@/lib/catalog-server";
import { addTransaction, listTransactions } from "@/lib/store";
import type { TransactionType } from "@/lib/types";

function parseType(value: unknown): TransactionType | null {
  if (value === "sale" || value === "purchase") return value;
  return null;
}

export async function GET() {
  return NextResponse.json(await listTransactions());
}

export async function POST(request: NextRequest) {
  const auth = await requireAuthApi();
  if (!isAuthContext(auth)) return auth;

  const body = (await request.json()) as {
    type?: string;
    character?: string;
    skin?: string;
    rarity?: string;
    star?: number;
    price?: number;
  };

  const { character, skin, rarity, star, price } = body;
  const type = parseType(body.type) ?? "sale";

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
    const transaction = await addTransaction(
      { type, character, skin, rarity, star, price },
      {
        userId: auth.user.id,
        recordedBy: await getUserDisplayName(auth.user, auth.supabase),
        supabase: auth.supabase,
      }
    );
    return NextResponse.json({ ok: true, transaction }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to record transaction";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
