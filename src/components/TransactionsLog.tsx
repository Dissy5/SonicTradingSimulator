"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { TransactionsTable } from "@/components/TransactionsTable";
import { SETTINGS_UPDATED_EVENT } from "@/lib/settings-events";
import type { SkinCatalog, Transaction } from "@/lib/types";

type TransactionsLogProps = {
  catalog: SkinCatalog;
};

type SessionInfo = {
  userId: string | null;
  isAdmin: boolean;
};

type TransactionsFilter = "mine" | "all";

export function TransactionsLog({ catalog }: TransactionsLogProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [session, setSession] = useState<SessionInfo>({ userId: null, isAdmin: false });
  const [filter, setFilter] = useState<TransactionsFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const [transactionsRes, meRes] = await Promise.all([
        fetch("/api/transactions"),
        fetch("/api/me", { credentials: "same-origin" }),
      ]);

      if (!transactionsRes.ok) throw new Error("Failed to load transactions");
      setTransactions(await transactionsRes.json());

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
      setError(err instanceof Error ? err.message : "Failed to load transactions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  useEffect(() => {
    function onSettingsUpdated() {
      void loadTransactions();
    }

    window.addEventListener(SETTINGS_UPDATED_EVENT, onSettingsUpdated);
    return () => window.removeEventListener(SETTINGS_UPDATED_EVENT, onSettingsUpdated);
  }, [loadTransactions]);

  const myCount = useMemo(() => {
    if (!session.userId) return 0;
    return transactions.filter((entry) => entry.createdBy === session.userId).length;
  }, [transactions, session.userId]);

  const visibleTransactions = useMemo(() => {
    if (filter === "mine" && session.userId) {
      return transactions.filter((entry) => entry.createdBy === session.userId);
    }
    return transactions;
  }, [filter, transactions, session.userId]);

  async function deleteTransaction(id: number) {
    const res = await fetch(`/api/transactions/${id}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const message =
        typeof body.error === "string" ? body.error : "Failed to delete transaction";
      setError(message);
      throw new Error(message);
    }
    await loadTransactions();
  }

  function canDeleteTransaction(transaction: Transaction): boolean {
    if (!session.userId) return false;
    if (session.isAdmin) return true;
    return transaction.createdBy === session.userId;
  }

  if (loading) {
    return <p className="text-sm text-zinc-400">Loading transactions…</p>;
  }

  if (error) {
    return <p className="text-sm text-red-400">{error}</p>;
  }

  if (transactions.length === 0) {
    return <p className="text-sm text-zinc-400">No transactions recorded yet.</p>;
  }

  return (
    <div className="space-y-4">
      {session.userId && (
        <div className="flex flex-wrap items-center gap-2">
          <FilterButton
            active={filter === "mine"}
            onClick={() => setFilter("mine")}
            label={`Mine (${myCount})`}
          />
          <FilterButton
            active={filter === "all"}
            onClick={() => setFilter("all")}
            label={`All (${transactions.length})`}
          />
        </div>
      )}

      {visibleTransactions.length === 0 ? (
        <p className="text-sm text-zinc-400">
          {filter === "mine"
            ? "You haven't recorded any transactions yet."
            : "No transactions recorded yet."}
        </p>
      ) : (
        <TransactionsTable
          catalog={catalog}
          transactions={visibleTransactions}
          onDelete={session.userId ? deleteTransaction : undefined}
          canDelete={canDeleteTransaction}
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
