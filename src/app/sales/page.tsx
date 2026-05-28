import { SalesLog } from "@/components/SalesLog";
import { loadCatalog } from "@/lib/catalog-server";

export default async function SalesPage() {
  const catalog = await loadCatalog();
  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold">Sales log</h2>
      <SalesLog catalog={catalog} />
    </section>
  );
}
