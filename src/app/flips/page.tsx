import { redirect } from "next/navigation";

import { FlipsHub } from "@/components/FlipsHub";
import { loadCatalog } from "@/lib/catalog-server";
import { getAuthUser } from "@/lib/supabase/auth-server";

export default async function FlipsPage() {
  const user = await getAuthUser();
  if (!user) {
    redirect("/login?next=/flips");
  }

  const catalog = await loadCatalog();

  return (
    <section className="space-y-2">
      <p className="text-sm text-zinc-400">
        Record skin purchases, then come back to log the sale price when you flip them.
      </p>
      <FlipsHub catalog={catalog} />
    </section>
  );
}
