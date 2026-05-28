import { NextRequest, NextResponse } from "next/server";

import { isAdminContext, requireAdminApi } from "@/lib/admin";
import { characterNameExists } from "@/lib/catalog-db";
import { removeCharacter, renameCharacter } from "@/lib/catalog-server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const admin = await requireAdminApi();
  if (!isAdminContext(admin)) return admin;

  const id = Number((await context.params).id);
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ error: "Invalid character id" }, { status: 400 });
  }

  const body = (await request.json()) as { name?: string };
  const name = String(body.name ?? "").trim();

  if (!name) {
    return NextResponse.json({ error: "Character name is required" }, { status: 400 });
  }

  if (await characterNameExists(name, id)) {
    return NextResponse.json({ error: "A character with that name already exists" }, { status: 409 });
  }

  try {
    const character = await renameCharacter(id, name, admin.supabase);
    return NextResponse.json({ ok: true, character });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update character";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const admin = await requireAdminApi();
  if (!isAdminContext(admin)) return admin;

  const id = Number((await context.params).id);
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ error: "Invalid character id" }, { status: 400 });
  }

  try {
    const deleted = await removeCharacter(id, admin.supabase);
    if (!deleted) {
      return NextResponse.json({ error: "Character not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete character";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
