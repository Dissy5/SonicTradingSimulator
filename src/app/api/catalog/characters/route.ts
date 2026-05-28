import { NextRequest, NextResponse } from "next/server";

import { characterNameExists } from "@/lib/catalog-db";
import { createCharacter, getCharacters } from "@/lib/catalog-server";

export async function GET() {
  return NextResponse.json({ characters: await getCharacters() });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { name?: string };
  const name = String(body.name ?? "").trim();

  if (!name) {
    return NextResponse.json({ error: "Character name is required" }, { status: 400 });
  }

  if (await characterNameExists(name)) {
    return NextResponse.json({ error: "A character with that name already exists" }, { status: 409 });
  }

  try {
    const character = await createCharacter(name);
    return NextResponse.json({ ok: true, character }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add character";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
