import { NextRequest, NextResponse } from "next/server";

import { isAdminContext, requireAdminApi } from "@/lib/admin";
import { createSkin, exists, getCharacters } from "@/lib/catalog-server";
import { SKIN_RARITIES } from "@/lib/rarities";

export async function GET() {
  return NextResponse.json({
    characters: await getCharacters(),
    rarities: SKIN_RARITIES,
  });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdminApi();
  if (!isAdminContext(admin)) return admin;

  const formData = await request.formData();
  const character = String(formData.get("character") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const rarity = String(formData.get("rarity") ?? "").trim();
  const image = formData.get("image");

  if (!character || !name || !rarity) {
    return NextResponse.json({ error: "Character, skin name, and rarity are required" }, { status: 400 });
  }

  const hasImage = image instanceof File && image.size > 0;

  if (!SKIN_RARITIES.includes(rarity as (typeof SKIN_RARITIES)[number])) {
    return NextResponse.json({ error: "Invalid rarity" }, { status: 400 });
  }

  const characters = await getCharacters();
  if (!characters.includes(character)) {
    return NextResponse.json({ error: "Unknown character" }, { status: 400 });
  }

  if (await exists(character, name, rarity)) {
    return NextResponse.json(
      { error: "This character already has a skin with that name and rarity" },
      { status: 409 }
    );
  }

  if (hasImage) {
    if (!image.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }

    if (image.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Image must be under 5 MB" }, { status: 400 });
    }
  }

  try {
    const skin = await createSkin(
      {
        character,
        name,
        rarity,
        imageFile: hasImage ? image : undefined,
      },
      admin.supabase
    );
    return NextResponse.json({ ok: true, skin }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add skin";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
