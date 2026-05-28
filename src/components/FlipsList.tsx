"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { SkinImage } from "@/components/SkinImage";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { getSkinImagePath } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { flipProfit, isFlipOpen, type Flip, type SkinCatalog } from "@/lib/types";

type FlipsListProps = {
  catalog: SkinCatalog;
  refreshKey?: number;
};

type FlipFilter = "open" | "closed" | "all";

export function FlipsList({ catalog, refreshKey = 0 }: FlipsListProps) {
  const [flips, setFlips] = useState<Flip[]>([]);
  const [filter, setFilter] = useState<FlipFilter>("open");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFlips = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/flips", { credentials: "same-origin" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(typeof body.error === "string" ? body.error : "Failed to load flips");
      }
      setFlips(await res.json());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load flips");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFlips();
  }, [loadFlips, refreshKey]);

  const visibleFlips = useMemo(() => {
    if (filter === "open") return flips.filter(isFlipOpen);
    if (filter === "closed") return flips.filter((flip) => !isFlipOpen(flip));
    return flips;
  }, [filter, flips]);

  const openCount = flips.filter(isFlipOpen).length;

  async function deleteFlip(id: number) {
    setError(null);
    const res = await fetch(`/api/flips/${id}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(typeof body.error === "string" ? body.error : "Failed to delete flip");
    }
    await loadFlips();
  }

  if (loading) {
    return <p className="text-sm text-zinc-400">Loading flips…</p>;
  }

  if (error) {
    return <p className="text-sm text-red-400">{error}</p>;
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Your flips</h2>
        <div className="flex flex-wrap gap-2">
          <FilterButton
            active={filter === "open"}
            onClick={() => setFilter("open")}
            label={`Open (${openCount})`}
          />
          <FilterButton
            active={filter === "closed"}
            onClick={() => setFilter("closed")}
            label={`Sold (${flips.length - openCount})`}
          />
          <FilterButton
            active={filter === "all"}
            onClick={() => setFilter("all")}
            label={`All (${flips.length})`}
          />
        </div>
      </div>

      {visibleFlips.length === 0 ? (
        <p className="text-sm text-zinc-400">
          {filter === "open"
            ? "No open flips. Record a purchase above to start tracking."
            : "No flips in this view yet."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-zinc-800">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-900 text-zinc-400">
              <tr>
                <th className="w-14 px-3 py-3 font-medium"></th>
                <th className="px-4 py-3 font-medium">Skin</th>
                <th className="px-4 py-3 font-medium">Star</th>
                <th className="px-4 py-3 font-medium">Buy</th>
                <th className="px-4 py-3 font-medium">Sell</th>
                <th className="px-4 py-3 font-medium">Profit</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {visibleFlips.map((flip) => {
                const profit = flipProfit(flip);
                const imagePath = getSkinImagePath(
                  catalog,
                  flip.character,
                  flip.skin,
                  flip.rarity
                );

                return (
                  <tr key={flip.id} className="border-t border-zinc-800">
                    <td className="px-3 py-2">
                      <SkinImage
                        src={imagePath}
                        alt={`${flip.character} ${flip.skin}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-zinc-100">
                        {flip.character} · {flip.skin}
                      </div>
                      <div className="text-zinc-500">{flip.rarity}</div>
                    </td>
                    <td className="px-4 py-3">{flip.star}</td>
                    <td className="px-4 py-3">{formatPrice(flip.buyPrice)}</td>
                    <td className="px-4 py-3">
                      {flip.sellPrice != null ? (
                        formatPrice(flip.sellPrice)
                      ) : flip.plannedSellPrice != null ? (
                        <span className="text-zinc-400">{formatPrice(flip.plannedSellPrice)}</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {profit == null ? (
                        "—"
                      ) : (
                        <span className={profit >= 0 ? "text-green-400" : "text-red-400"}>
                          {profit >= 0 ? "+" : ""}
                          {formatPrice(profit)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isFlipOpen(flip) ? (
                        <span className="text-amber-400">Holding</span>
                      ) : (
                        <span className="text-zinc-400">Sold</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/flips/${flip.id}`}
                          className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
                        >
                          {isFlipOpen(flip) ? "Record sale" : "View"}
                        </Link>
                        {isFlipOpen(flip) && (
                          <ConfirmDeleteButton
                            onConfirm={async () => {
                              try {
                                await deleteFlip(flip.id);
                              } catch (err) {
                                setError(
                                  err instanceof Error ? err.message : "Failed to delete flip"
                                );
                                throw err;
                              }
                            }}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
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
