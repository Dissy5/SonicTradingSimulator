import { redirect } from "next/navigation";

import { ShopManager } from "@/components/ShopManager";
import { loadCatalog } from "@/lib/catalog-server";
import { getAuthUser } from "@/lib/supabase/auth-server";

export default async function ShopPage() {
  const user = await getAuthUser();
  if (!user) {
    redirect("/login?next=/shop");
  }

  const catalog = await loadCatalog();

  return (
    <section className="space-y-2">
      <p className="text-sm text-zinc-400">
        Stage up to 25 skins for sale. Add listings from the form above the grid; click a listed
        skin to edit it. Slots shift automatically when you remove listings.
      </p>
      <ShopManager catalog={catalog} />
    </section>
  );
}
