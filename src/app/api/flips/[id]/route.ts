import { NextRequest, NextResponse } from "next/server";

import { getUserDisplayName, isAuthContext, requireAuthApi } from "@/lib/auth-api";
import { completeFlipAndLogSale, deleteFlip, getFlip } from "@/lib/flips-store";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const auth = await requireAuthApi();
  if (!isAuthContext(auth)) return auth;

  const id = Number((await context.params).id);
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ error: "Invalid flip id" }, { status: 400 });
  }

  try {
    const flip = await getFlip(id, auth.supabase);
    if (!flip) {
      return NextResponse.json({ error: "Flip not found" }, { status: 404 });
    }
    return NextResponse.json(flip);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load flip";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireAuthApi();
  if (!isAuthContext(auth)) return auth;

  const id = Number((await context.params).id);
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ error: "Invalid flip id" }, { status: 400 });
  }

  const body = (await request.json()) as { sellPrice?: number };
  const { sellPrice } = body;

  if (sellPrice == null) {
    return NextResponse.json({ error: "sellPrice is required" }, { status: 400 });
  }

  if (!Number.isInteger(sellPrice) || sellPrice < 0) {
    return NextResponse.json({ error: "sellPrice must be a non-negative integer" }, { status: 400 });
  }

  try {
    const flip = await completeFlipAndLogSale(id, sellPrice, {
      userId: auth.user.id,
      recordedBy: await getUserDisplayName(auth.user, auth.supabase),
      supabase: auth.supabase,
    });
    return NextResponse.json(flip);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to record sale";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const auth = await requireAuthApi();
  if (!isAuthContext(auth)) return auth;

  const id = Number((await context.params).id);
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ error: "Invalid flip id" }, { status: 400 });
  }

  try {
    const removed = await deleteFlip(id, {
      userId: auth.user.id,
      recordedBy: await getUserDisplayName(auth.user, auth.supabase),
      supabase: auth.supabase,
    });
    if (!removed) {
      return NextResponse.json({ error: "Flip not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete flip";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
