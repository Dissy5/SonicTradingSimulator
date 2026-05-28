import { NextRequest, NextResponse } from "next/server";

import { getCatalogSkinById, skinEntryExists } from "@/lib/catalog-db";
import { editSkin, getCharacters, removeSkin } from "@/lib/catalog-server";
import { SKIN_RARITIES } from "@/lib/rarities";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const id = Number((await context.params).id);
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ error: "Invalid skin id" }, { status: 400 });
  }

  const existing = await getCatalogSkinById(id);
  if (!existing) {
    return NextResponse.json({ error: "Skin not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const character = String(formData.get("character") ?? existing.character).trim();
  const name = String(formData.get("name") ?? existing.name).trim();
  const rarity = String(formData.get("rarity") ?? existing.rarity).trim();
  const image = formData.get("image");

  if (!character || !name || !rarity) {
    return NextResponse.json({ error: "Character, skin name, and rarity are required" }, { status: 400 });
  }

  if (!SKIN_RARITIES.includes(rarity as (typeof SKIN_RARITIES)[number])) {
    return NextResponse.json({ error: "Invalid rarity" }, { status: 400 });
  }

  const characters = await getCharacters();
  if (!characters.includes(character)) {
    return NextResponse.json({ error: "Unknown character" }, { status: 400 });
  }

  if (await skinEntryExists(character, name, rarity, id)) {
    return NextResponse.json(
      { error: "This character already has a skin with that name and rarity" },
      { status: 409 }
    );
  }

  let imageFile: File | undefined;
  if (image instanceof File && image.size > 0) {
    if (!image.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }
    if (image.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Image must be under 5 MB" }, { status: 400 });
    }
    imageFile = image;
  }

  try {
    const skin = await editSkin(id, { character, name, rarity, imageFile });
    return NextResponse.json({ ok: true, skin });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update skin";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const id = Number((await context.params).id);
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ error: "Invalid skin id" }, { status: 400 });
  }

  try {
    const deleted = await removeSkin(id);
    if (!deleted) {
      return NextResponse.json({ error: "Skin not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete skin";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
