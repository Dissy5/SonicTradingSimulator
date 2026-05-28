import { NextResponse } from "next/server";

import { loadCatalog } from "@/lib/catalog-server";
import { getAuthUser } from "@/lib/supabase/auth-server";
import { buildValuesTierRows, type ValuesScope } from "@/lib/values-server";

function parseScope(value: string | null): ValuesScope {
  return value === "mine" ? "mine" : "all";
}

export async function GET(request: Request) {
  const scope = parseScope(new URL(request.url).searchParams.get("scope"));

  let userId: string | undefined;
  if (scope === "mine") {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Sign in to view your values sheet." }, { status: 401 });
    }
    userId = user.id;
  }

  const catalog = await loadCatalog();
  const tiers = await buildValuesTierRows(catalog, { userId });

  return NextResponse.json({ tiers, scope });
}
