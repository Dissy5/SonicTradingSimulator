"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { SalesTable } from "@/components/SalesTable";
import type { Sale, SkinCatalog } from "@/lib/types";

type SalesLogProps = {
  catalog: SkinCatalog;
};

type SessionInfo = {
  userId: string | null;
  isAdmin: boolean;
};

type SalesFilter = "mine" | "all";

export function SalesLog({ catalog }: SalesLogProps) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [session, setSession] = useState<SessionInfo>({ userId: null, isAdmin: false });
  const [filter, setFilter] = useState<SalesFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSales = useCallback(async () => {
    setLoading(true);
    try {
      const [salesRes, meRes] = await Promise.all([
        fetch("/api/sales"),
        fetch("/api/me", { credentials: "same-origin" }),
      ]);

      if (!salesRes.ok) throw new Error("Failed to load sales");
      setSales(await salesRes.json());

      if (meRes.ok) {
        const me = (await meRes.json()) as {
          user: { id: string } | null;
          isAdmin: boolean;
        };
        const userId = me.user?.id ?? null;
        setSession({
          userId,
          isAdmin: me.isAdmin,
        });
        setFilter(userId ? "mine" : "all");
      } else {
        setSession({ userId: null, isAdmin: false });
        setFilter("all");
      }

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

  const mySalesCount = useMemo(() => {
    if (!session.userId) return 0;
    return sales.filter((sale) => sale.createdBy === session.userId).length;
  }, [sales, session.userId]);

  const visibleSales = useMemo(() => {
    if (filter === "mine" && session.userId) {
      return sales.filter((sale) => sale.createdBy === session.userId);
    }
    return sales;
  }, [filter, sales, session.userId]);

  async function deleteSale(id: number) {
    const res = await fetch(`/api/sales/${id}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const message = typeof body.error === "string" ? body.error : "Failed to delete sale";
      setError(message);
      throw new Error(message);
    }
    await loadSales();
  }

  function canDeleteSale(sale: Sale): boolean {
    if (!session.userId) return false;
    if (session.isAdmin) return true;
    return sale.createdBy === session.userId;
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

  return (
    <div className="space-y-4">
      {session.userId && (
        <div className="flex flex-wrap items-center gap-2">
          <FilterButton
            active={filter === "mine"}
            onClick={() => setFilter("mine")}
            label={`My sales (${mySalesCount})`}
          />
          <FilterButton
            active={filter === "all"}
            onClick={() => setFilter("all")}
            label={`All sales (${sales.length})`}
          />
        </div>
      )}

      {visibleSales.length === 0 ? (
        <p className="text-sm text-zinc-400">
          {filter === "mine"
            ? "You haven't recorded any sales yet."
            : "No sales recorded yet."}
        </p>
      ) : (
        <SalesTable
          catalog={catalog}
          sales={visibleSales}
          onDelete={session.userId ? deleteSale : undefined}
          canDelete={canDeleteSale}
          showRecordedBy={filter === "all"}
        />
      )}
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-1.5 text-sm ${
        active
          ? "border-blue-600 bg-blue-600/10 text-blue-300"
          : "border-zinc-700 text-zinc-300 hover:bg-zinc-900"
      }`}
    >
      {label}
    </button>
  );
}
