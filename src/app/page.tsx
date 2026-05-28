import { redirect } from "next/navigation";

import { RecordSaleForm } from "@/components/RecordSaleForm";
import { loadCatalog } from "@/lib/catalog-server";
import { mapOAuthErrorToLoginError } from "@/lib/login-errors";
import { getAuthUser } from "@/lib/supabase/auth-server";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; error_description?: string; email?: string }>;
}) {
  const user = await getAuthUser();
  if (!user) {
    const params = await searchParams;
    if (params.error) {
      const mapped = mapOAuthErrorToLoginError(
        params.error,
        params.error_description
      );
      const query = new URLSearchParams({
        next: "/",
        error: mapped,
      });
      if (params.email) query.set("email", params.email);
      redirect(`/login?${query.toString()}`);
    }
    redirect("/login?next=/");
  }

  const catalog = await loadCatalog();
  return (
    <section>
      <RecordSaleForm catalog={catalog} />
    </section>
  );
}
