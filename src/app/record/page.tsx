import { redirect } from "next/navigation";

import { RecordTransactionForm } from "@/components/RecordTransactionForm";
import { loadCatalog } from "@/lib/catalog-server";
import { getAuthUser } from "@/lib/supabase/auth-server";

export default async function RecordPage() {
  const user = await getAuthUser();
  if (!user) {
    redirect("/login?next=/record");
  }

  const catalog = await loadCatalog();

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold">Record transaction</h2>
      <RecordTransactionForm catalog={catalog} />
    </section>
  );
}
