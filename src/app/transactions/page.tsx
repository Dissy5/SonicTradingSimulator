import { TransactionsLog } from "@/components/TransactionsLog";
import { loadCatalog } from "@/lib/catalog-server";

export default async function TransactionsPage() {
  const catalog = await loadCatalog();
  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold">Transactions</h2>
      <TransactionsLog catalog={catalog} />
    </section>
  );
}
