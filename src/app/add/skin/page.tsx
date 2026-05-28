import Link from "next/link";

import { AddSkinForm } from "@/components/AddSkinForm";

export default function AddSkinPage() {
  return (
    <section>
      <Link href="/add" className="mb-4 inline-block text-sm text-zinc-400 hover:text-zinc-200">
        ← Back to catalog
      </Link>
      <p className="mb-6 text-sm text-zinc-400">
        New skins are saved to Supabase and appear in the sale logger for everyone.
      </p>
      <AddSkinForm />
    </section>
  );
}
