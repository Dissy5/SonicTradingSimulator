import { RecordSaleForm } from "@/components/RecordSaleForm";
import { loadCatalog } from "@/lib/catalog-server";

export default async function HomePage() {
  const catalog = await loadCatalog();
  return (
    <section>
      <RecordSaleForm catalog={catalog} />
    </section>
  );
}
