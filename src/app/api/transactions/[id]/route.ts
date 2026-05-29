import { NextResponse } from "next/server";

import { isAuthContext, requireAuthApi } from "@/lib/auth-api";
import { deleteTransaction } from "@/lib/store";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAuthApi();
  if (!isAuthContext(auth)) return auth;

  const { id } = await context.params;
  const transactionId = Number(id);

  if (!Number.isInteger(transactionId)) {
    return NextResponse.json({ error: "Invalid transaction id" }, { status: 400 });
  }

  try {
    const removed = await deleteTransaction(transactionId, auth.supabase);
    if (!removed) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete transaction";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}
