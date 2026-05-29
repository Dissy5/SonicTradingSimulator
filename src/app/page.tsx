import { redirect } from "next/navigation";

import { DashboardGuest } from "@/components/DashboardGuest";
import { DashboardHub } from "@/components/DashboardHub";
import { isAdmin } from "@/lib/admin";
import { loadCatalog } from "@/lib/catalog-server";
import { loadDashboardOverview } from "@/lib/dashboard-server";
import { mapOAuthErrorToLoginError } from "@/lib/login-errors";
import {
  createSupabaseAuthServerClient,
  getAuthUser,
} from "@/lib/supabase/auth-server";

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

    return <DashboardGuest />;
  }

  const supabase = await createSupabaseAuthServerClient();
  const [overview, catalog, admin] = await Promise.all([
    loadDashboardOverview(user, supabase),
    loadCatalog(),
    isAdmin(),
  ]);

  return <DashboardHub overview={overview} catalog={catalog} isAdmin={admin} />;
}
