import { NextResponse } from "next/server";

import { isAuthContext, requireAuthApi } from "@/lib/auth-api";
import { deleteSale } from "@/lib/store";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAuthApi();
  if (!isAuthContext(auth)) return auth;

  const { id } = await context.params;
  const saleId = Number(id);

  if (!Number.isInteger(saleId)) {
    return NextResponse.json({ error: "Invalid sale id" }, { status: 400 });
  }

  try {
    const removed = await deleteSale(saleId, auth.supabase);
    if (!removed) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete sale";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}
