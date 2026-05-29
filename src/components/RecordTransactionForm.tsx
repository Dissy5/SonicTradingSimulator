"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

import { SkinImage } from "@/components/SkinImage";
import { TransactionsTable } from "@/components/TransactionsTable";
import {
  getCharactersFromCatalog,
  getDefaultSkinForCharacter,
  getRaritiesForSkin,
  getSkinImagePath,
  getSkinsForCharacter,
} from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import type { SkinCatalog, Transaction, TransactionType } from "@/lib/types";

type RecordTransactionFormProps = {
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

export function RecordTransactionForm({ catalog }: RecordTransactionFormProps) {
  const characters = getCharactersFromCatalog(catalog);
  const [transactionType, setTransactionType] = useState<TransactionType>("sale");
  const [character, setCharacter] = useState(characters[0] ?? "");
  const [skin, setSkin] = useState("");
  const [rarity, setRarity] = useState("");
  const [star, setStar] = useState(1);
  const [priceInput, setPriceInput] = useState("");
  const [average, setAverage] = useState<number | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const skinOptions = getSkinsForCharacter(catalog, character);
  const rarityOptions = getRaritiesForSkin(catalog, character, skin);
  const imagePath =
    character && skin && rarity
      ? getSkinImagePath(catalog, character, skin, rarity)
      : null;

  const loadRecentTransactions = useCallback(async () => {
    if (!character || !skin) {
      setRecentTransactions([]);
      return;
    }

    try {
      const res = await fetch(
        `/api/transactions/recent?character=${encodeURIComponent(character)}&skin=${encodeURIComponent(skin)}&limit=10`
      );
      if (!res.ok) return;
      setRecentTransactions(await res.json());
    } catch {
      setRecentTransactions([]);
    }
  }, [character, skin]);

  useEffect(() => {
    setSkin(getDefaultSkinForCharacter(catalog, character));
  }, [catalog, character]);

  useEffect(() => {
    const options = getRaritiesForSkin(catalog, character, skin);
    setRarity(options[0] ?? "");
  }, [catalog, character, skin]);

  useEffect(() => {
    loadRecentTransactions();
  }, [loadRecentTransactions]);

  useEffect(() => {
    if (!character || !skin || !rarity) {
      setAverage(null);
      return;
    }

    let cancelled = false;
    fetch(
      `/api/average-price?character=${encodeURIComponent(character)}&skin=${encodeURIComponent(skin)}&rarity=${encodeURIComponent(rarity)}&star=${star}&type=${transactionType}`
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
  }, [character, skin, rarity, star, transactionType]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const price = Number(priceInput);
    if (priceInput === "" || !Number.isInteger(price) || price < 0) {
      setMessage("Enter a valid price.");
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      await postJson("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: transactionType,
          character,
          skin,
          rarity,
          star,
          price,
        }),
      });
      setPriceInput("");
      const data = await postJson<{ average: number | null }>(
        `/api/average-price?character=${encodeURIComponent(character)}&skin=${encodeURIComponent(skin)}&rarity=${encodeURIComponent(rarity)}&star=${star}&type=${transactionType}`
      );
      setAverage(data.average);
      await loadRecentTransactions();
      setMessage(
        transactionType === "sale" ? "Sale recorded." : "Purchase recorded."
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to record transaction");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={handleSubmit} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
          <h2 className="mb-4 text-lg font-semibold">Log a transaction</h2>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <TypeButton
                active={transactionType === "sale"}
                onClick={() => setTransactionType("sale")}
                label="Sale"
              />
              <TypeButton
                active={transactionType === "purchase"}
                onClick={() => setTransactionType("purchase")}
                label="Purchase"
              />
            </div>
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
                  step={1}
                  placeholder="Enter price"
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
                  value={priceInput}
                  onChange={(event) => setPriceInput(event.currentTarget.value)}
                />
              </label>
            </div>
            <p className="text-sm text-zinc-400">
              Average {transactionType} for this combo:{" "}
              <span className="font-medium text-zinc-100">
                {average == null ? "N/A" : formatPrice(average)}
              </span>
            </p>
            <button
              type="submit"
              disabled={submitting || !character || !skin || !rarity || priceInput === ""}
              className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {submitting
                ? "Saving…"
                : transactionType === "sale"
                  ? "Submit sale"
                  : "Submit purchase"}
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

      {recentTransactions.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold">
            Recent transactions — {character} · {skin}
          </h2>
          <TransactionsTable
            catalog={catalog}
            transactions={recentTransactions}
            showCharacter={false}
            showSkin={false}
            showRecordedBy
          />
        </section>
      )}
    </div>
  );
}

function TypeButton({
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
