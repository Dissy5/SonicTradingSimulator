import { NextResponse } from "next/server";

import { loadCatalog } from "@/lib/catalog-server";

export async function GET() {
  const catalog = await loadCatalog();
  return NextResponse.json(catalog);
}
