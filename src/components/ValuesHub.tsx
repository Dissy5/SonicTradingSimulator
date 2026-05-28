"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ValuesTierList } from "@/components/ValuesTierList";
import type { ValuesScope, ValuesTierRow } from "@/lib/values-server";

export function ValuesHub() {
  const [scope, setScope] = useState<ValuesScope>("all");
  const [tiers, setTiers] = useState<ValuesTierRow[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<Partial<Record<ValuesScope, ValuesTierRow[]>>>({});

  const loadScope = useCallback(async (nextScope: ValuesScope, options?: { silent?: boolean }) => {
    const cached = cacheRef.current[nextScope];
    if (cached) {
      setTiers(cached);
      setError(null);
      if (!options?.silent) {
        setLoading(false);
      }
      return;
    }

    if (!options?.silent) {
      setLoading(true);
    }
    try {
      const res = await fetch(`/api/values?scope=${nextScope}`, {
        credentials: "same-origin",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(typeof body.error === "string" ? body.error : "Failed to load values");
      }

      const data = (await res.json()) as { tiers: ValuesTierRow[] };
      cacheRef.current[nextScope] = data.tiers;
      setTiers(data.tiers);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load values");
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setLoading(true);
      try {
        const meRes = await fetch("/api/me", { credentials: "same-origin" });
        const me = meRes.ok
          ? ((await meRes.json()) as { user: { id: string } | null })
          : { user: null };

        if (cancelled) return;

        const nextUserId = me.user?.id ?? null;
        setUserId(nextUserId);

        const initialScope: ValuesScope = nextUserId ? "mine" : "all";
        setScope(initialScope);
        await loadScope(initialScope);

        if (!cancelled && nextUserId) {
          void loadScope("all", { silent: true });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load values");
          setLoading(false);
        }
      }
    }

    void init();

    return () => {
      cancelled = true;
    };
  }, [loadScope]);

  function selectScope(nextScope: ValuesScope) {
    setScope(nextScope);
    void loadScope(nextScope);
  }

  return (
    <div className="space-y-4">
      {userId && (
        <div className="flex flex-wrap items-center gap-2">
          <ScopeButton
            active={scope === "mine"}
            onClick={() => selectScope("mine")}
            label="My sales"
          />
          <ScopeButton
            active={scope === "all"}
            onClick={() => selectScope("all")}
            label="All sales"
          />
        </div>
      )}

      {loading && tiers.length === 0 ? (
        <p className="text-sm text-zinc-400">Loading values…</p>
      ) : error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : (
        <ValuesTierList tiers={tiers} />
      )}
    </div>
  );
}

function ScopeButton({
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
