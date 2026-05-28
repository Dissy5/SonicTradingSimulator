"use client";

import { useCallback, useEffect, useState } from "react";

import { SalesTable } from "@/components/SalesTable";
import type { Sale, SkinCatalog } from "@/lib/types";

type SalesLogProps = {
  catalog: SkinCatalog;
};

export function SalesLog({ catalog }: SalesLogProps) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSales = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sales");
      if (!res.ok) throw new Error("Failed to load sales");
      setSales(await res.json());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sales");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSales();
  }, [loadSales]);

  async function deleteSale(id: number) {
    const res = await fetch(`/api/sales/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Failed to delete sale");
      return;
    }
    await loadSales();
  }

  if (loading) {
    return <p className="text-sm text-zinc-400">Loading sales…</p>;
  }

  if (error) {
    return <p className="text-sm text-red-400">{error}</p>;
  }

  if (sales.length === 0) {
    return <p className="text-sm text-zinc-400">No sales recorded yet.</p>;
  }

  return <SalesTable catalog={catalog} sales={sales} onDelete={deleteSale} />;
}
