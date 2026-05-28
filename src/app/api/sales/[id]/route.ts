import { NextResponse } from "next/server";

import { deleteSale } from "@/lib/store";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const saleId = Number(id);

  if (!Number.isInteger(saleId)) {
    return NextResponse.json({ error: "Invalid sale id" }, { status: 400 });
  }

  const removed = await deleteSale(saleId);
  if (!removed) {
    return NextResponse.json({ error: "Sale not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
