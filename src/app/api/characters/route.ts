import { NextResponse } from "next/server";

import { getCharacters } from "@/lib/catalog-server";

export async function GET() {
  return NextResponse.json(await getCharacters());
}
