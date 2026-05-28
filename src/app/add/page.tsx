import Link from "next/link";

import { CatalogManager } from "@/components/CatalogManager";
import { getCatalogManageData } from "@/lib/catalog-server";
import { SKIN_RARITIES } from "@/lib/rarities";

export default async function AddHubPage() {
  const catalog = await getCatalogManageData();
  const initialData = {
    characters: catalog.characters,
    skins: catalog.skins,
    rarities: SKIN_RARITIES,
    readOnly: catalog.readOnly ?? false,
  };

  return (
    <section className="space-y-8">
      <div>
        <p className="mb-4 text-sm text-zinc-400">
          Add characters and skins to the shared catalog, or edit and remove existing entries.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/add/character"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            Add character
          </Link>
          <Link
            href="/add/skin"
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-100 hover:bg-zinc-900"
          >
            Add skin
          </Link>
        </div>
      </div>

      <CatalogManager initialData={initialData} />
    </section>
  );
}
