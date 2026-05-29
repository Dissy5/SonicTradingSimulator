"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ManualValuesPanel } from "@/components/ManualValuesPanel";
import { ValuesTierList } from "@/components/ValuesTierList";
import type { SkinCatalog } from "@/lib/types";
import type { ValuesScope, ValuesTierRow } from "@/lib/values-server";

type ValuesView = ValuesScope | "manual";

export function ValuesHub() {
  const [view, setView] = useState<ValuesView>("all");
  const [tiers, setTiers] = useState<ValuesTierRow[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [catalog, setCatalog] = useState<SkinCatalog | null>(null);
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

  const invalidateValuesCache = useCallback(() => {
    cacheRef.current = {};
    if (view === "mine" || view === "all") {
      void loadScope(view, { silent: view !== "all" });
      if (view === "mine") {
        void loadScope("all", { silent: true });
      }
    }
  }, [loadScope, view]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setLoading(true);
      try {
        const meRes = await fetch("/api/me", { credentials: "same-origin" });
        const me = meRes.ok
          ? ((await meRes.json()) as { user: { id: string } | null; isAdmin?: boolean })
          : { user: null, isAdmin: false };

        if (cancelled) return;

        const nextUserId = me.user?.id ?? null;
        setUserId(nextUserId);
        setIsAdmin(me.isAdmin === true);

        const initialView: ValuesView = nextUserId ? "mine" : "all";
        setView(initialView);
        await loadScope(initialView);

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

  useEffect(() => {
    if (view !== "manual" || catalog) return;

    let cancelled = false;
    fetch("/api/catalog", { credentials: "same-origin" })
      .then((res) => res.json())
      .then((data: SkinCatalog) => {
        if (!cancelled) setCatalog(data);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load catalog for manual values");
      });

    return () => {
      cancelled = true;
    };
  }, [view, catalog]);

  function selectView(nextView: ValuesView) {
    setView(nextView);
    setError(null);
    if (nextView === "mine" || nextView === "all") {
      void loadScope(nextView);
    } else {
      setLoading(false);
    }
  }

  const showScopeButtons = userId != null || isAdmin;

  return (
    <div className="space-y-4">
      {showScopeButtons ? (
        <div className="flex flex-wrap items-center gap-2">
          {userId ? (
            <>
              <ScopeButton
                active={view === "mine"}
                onClick={() => selectView("mine")}
                label="My sales"
              />
              <ScopeButton
                active={view === "all"}
                onClick={() => selectView("all")}
                label="All sales"
              />
            </>
          ) : null}
          {isAdmin ? (
            <ScopeButton
              active={view === "manual"}
              onClick={() => selectView("manual")}
              label="Manual values"
              tone="admin"
            />
          ) : null}
        </div>
      ) : null}

      {view === "all" && !loading && !error ? (
        <p className="text-sm text-zinc-400">
          Prices are estimates based on sale and purchase transactions recorded in the app, averaged by skin and
          tier with more weight on recent sales. They reflect community data, not official in-game
          values.
        </p>
      ) : null}

      {view === "manual" ? (
        catalog ? (
          <ManualValuesPanel catalog={catalog} onValuesChanged={invalidateValuesCache} />
        ) : (
          <p className="text-sm text-zinc-400">Loading manual values…</p>
        )
      ) : loading && tiers.length === 0 ? (
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
  tone = "default",
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  tone?: "default" | "admin";
}) {
  const adminActive = tone === "admin" && active;
  const adminIdle = tone === "admin" && !active;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-1.5 text-sm ${
        adminActive
          ? "border-amber-600 bg-amber-600/10 text-amber-200"
          : adminIdle
            ? "border-amber-800/60 text-amber-200/90 hover:bg-amber-950/40"
            : active
              ? "border-blue-600 bg-blue-600/10 text-blue-300"
              : "border-zinc-700 text-zinc-300 hover:bg-zinc-900"
      }`}
    >
      {label}
    </button>
  );
}
