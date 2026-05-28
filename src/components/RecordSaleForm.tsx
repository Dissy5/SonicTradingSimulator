"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

import { SkinImage } from "@/components/SkinImage";
import { SalesTable } from "@/components/SalesTable";
import {
  getCharactersFromCatalog,
  getRaritiesForSkin,
  getSkinImagePath,
  getSkinsForCharacter,
} from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import type { Sale, SkinCatalog } from "@/lib/types";

type RecordSaleFormProps = {
  catalog: SkinCatalog;
};

async function postJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin", ...init });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? res.statusText);
  }
  return res.json();
}

export function RecordSaleForm({ catalog }: RecordSaleFormProps) {
  const characters = getCharactersFromCatalog(catalog);
  const [character, setCharacter] = useState(characters[0] ?? "");
  const [skin, setSkin] = useState("");
  const [rarity, setRarity] = useState("");
  const [star, setStar] = useState(1);
  const [price, setPrice] = useState(0);
  const [average, setAverage] = useState<number | null>(null);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const skinOptions = getSkinsForCharacter(catalog, character);
  const rarityOptions = getRaritiesForSkin(catalog, character, skin);
  const imagePath =
    character && skin && rarity
      ? getSkinImagePath(catalog, character, skin, rarity)
      : null;

  const loadRecentSales = useCallback(async () => {
    if (!character || !skin) {
      setRecentSales([]);
      return;
    }

    try {
      const res = await fetch(
        `/api/sales/recent?character=${encodeURIComponent(character)}&skin=${encodeURIComponent(skin)}&limit=10`
      );
      if (!res.ok) return;
      setRecentSales(await res.json());
    } catch {
      setRecentSales([]);
    }
  }, [character, skin]);

  useEffect(() => {
    const options = getSkinsForCharacter(catalog, character);
    setSkin(options[0] ?? "");
  }, [catalog, character]);

  useEffect(() => {
    const options = getRaritiesForSkin(catalog, character, skin);
    setRarity(options[0] ?? "");
  }, [catalog, character, skin]);

  useEffect(() => {
    loadRecentSales();
  }, [loadRecentSales]);

  useEffect(() => {
    if (!character || !skin || !rarity) {
      setAverage(null);
      return;
    }

    let cancelled = false;
    fetch(
      `/api/average-price?character=${encodeURIComponent(character)}&skin=${encodeURIComponent(skin)}&rarity=${encodeURIComponent(rarity)}&star=${star}`
    )
      .then((res) => res.json())
      .then((data: { average: number | null }) => {
        if (!cancelled) setAverage(data.average);
      })
      .catch(() => {
        if (!cancelled) setAverage(null);
      });

    return () => {
      cancelled = true;
    };
  }, [character, skin, rarity, star]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      await postJson("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ character, skin, rarity, star, price }),
      });
      setPrice(0);
      const data = await postJson<{ average: number | null }>(
        `/api/average-price?character=${encodeURIComponent(character)}&skin=${encodeURIComponent(skin)}&rarity=${encodeURIComponent(rarity)}&star=${star}`
      );
      setAverage(data.average);
      await loadRecentSales();
      setMessage("Sale recorded.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to record sale");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={handleSubmit} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
          <h2 className="mb-4 text-lg font-semibold">Log a sale</h2>
          <div className="space-y-4">
            <label className="block text-sm text-zinc-400">
              Character
              <select
                className="select-field mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
                value={character}
                onChange={(event) => setCharacter(event.currentTarget.value)}
              >
                {characters.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-zinc-400">
              Skin
              <select
                className="select-field mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
                value={skin}
                onChange={(event) => setSkin(event.currentTarget.value)}
              >
                {skinOptions.map((name) => (
                  <option key={`${character}-${name}`} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-zinc-400">
              Rarity
              <select
                className="select-field mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
                value={rarity}
                onChange={(event) => setRarity(event.currentTarget.value)}
                disabled={rarityOptions.length <= 1}
              >
                {rarityOptions.map((name) => (
                  <option key={`${character}-${skin}-${name}`} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className="block text-sm text-zinc-400">
                Star level
                <input
                  type="number"
                  min={1}
                  max={6}
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
                  value={star}
                  onChange={(event) => setStar(Number(event.currentTarget.value))}
                />
              </label>
              <label className="block text-sm text-zinc-400">
                Price
                <input
                  type="number"
                  min={0}
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
                  value={price}
                  onChange={(event) => setPrice(Number(event.currentTarget.value))}
                />
              </label>
            </div>
            <p className="text-sm text-zinc-400">
              Average for this combo:{" "}
              <span className="font-medium text-zinc-100">
                {average == null ? "N/A" : formatPrice(average)}
              </span>
            </p>
            <button
              type="submit"
              disabled={submitting || !character || !skin || !rarity}
              className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Submit sale"}
            </button>
            {message && <p className="text-sm text-zinc-300">{message}</p>}
          </div>
        </form>

        <div className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
          <h2 className="mb-4 self-start text-lg font-semibold">Preview</h2>
          {character && skin && rarity ? (
            <SkinImage src={imagePath} alt={`${character} ${skin}`} variant="preview" />
          ) : (
            <p className="text-sm text-zinc-500">Select a skin to preview</p>
          )}
        </div>
      </div>

      {recentSales.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold">
            Recent sales — {character} · {skin}
          </h2>
          <SalesTable
            catalog={catalog}
            sales={recentSales}
            showCharacter={false}
            showSkin={false}
            showRecordedBy
          />
        </section>
      )}
    </div>
  );
}
