import { notFound, redirect } from "next/navigation";

import { CompleteFlipForm } from "@/components/CompleteFlipForm";
import { loadCatalog } from "@/lib/catalog-server";
import { getFlip } from "@/lib/flips-store";
import { createSupabaseAuthServerClient, getAuthUser } from "@/lib/supabase/auth-server";

type FlipDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function FlipDetailPage({ params }: FlipDetailPageProps) {
  const user = await getAuthUser();
  const { id: idParam } = await params;
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/flips/${idParam}`)}`);
  }

  const id = Number(idParam);
  if (!Number.isInteger(id) || id < 1) {
    notFound();
  }

  const supabase = await createSupabaseAuthServerClient();
  const flip = await getFlip(id, supabase);
  if (!flip) {
    notFound();
  }

  const catalog = await loadCatalog();

  return (
    <section>
      <CompleteFlipForm flip={flip} catalog={catalog} />
    </section>
  );
}
