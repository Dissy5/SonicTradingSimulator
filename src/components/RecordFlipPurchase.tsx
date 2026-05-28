"use client";

import { FormEvent, useState } from "react";

import { SkinImage } from "@/components/SkinImage";
import { SkinSelectionFields } from "@/components/SkinSelectionFields";
import {
  getCharactersFromCatalog,
  getDefaultSkinForCharacter,
  getRaritiesForSkin,
  getSkinImagePath,
} from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import type { Flip, SkinCatalog } from "@/lib/types";

type RecordFlipPurchaseProps = {
  catalog: SkinCatalog;
  onRecorded?: (flip: Flip) => void;
};

export function RecordFlipPurchase({ catalog, onRecorded }: RecordFlipPurchaseProps) {
  const characters = getCharactersFromCatalog(catalog);
  const [character, setCharacter] = useState(characters[0] ?? "");
  const [skin, setSkin] = useState(() =>
    getDefaultSkinForCharacter(catalog, characters[0] ?? "")
  );
  const [rarity, setRarity] = useState(
    () => getRaritiesForSkin(catalog, characters[0] ?? "", skin)[0] ?? ""
  );
  const [star, setStar] = useState(1);
  const [buyPriceInput, setBuyPriceInput] = useState("");
  const [plannedSellPriceInput, setPlannedSellPriceInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const imagePath =
    character && skin && rarity
      ? getSkinImagePath(catalog, character, skin, rarity)
      : null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const buyPrice = Number(buyPriceInput);
    if (buyPriceInput === "" || !Number.isInteger(buyPrice) || buyPrice < 0) {
      setError("Enter a valid purchase price.");
      return;
    }

    let plannedSellPrice: number | null = null;
    if (plannedSellPriceInput !== "") {
      const parsed = Number(plannedSellPriceInput);
      if (!Number.isInteger(parsed) || parsed < 0) {
        setError("Enter a valid planned sale price, or leave it blank.");
        return;
      }
      plannedSellPrice = parsed;
    }

    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch("/api/flips", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character,
          skin,
          rarity,
          star,
          buyPrice,
          plannedSellPrice,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof body.error === "string" ? body.error : "Failed to record purchase");
      }

      setBuyPriceInput("");
      setPlannedSellPriceInput("");
      setMessage("Purchase recorded. You can record the sale when you flip it.");
      onRecorded?.(body as Flip);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record purchase");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6"
      >
        <h2 className="mb-4 text-lg font-semibold">Record purchase</h2>
        <div className="space-y-4">
          <SkinSelectionFields
            catalog={catalog}
            character={character}
            skin={skin}
            rarity={rarity}
            star={star}
            onCharacterChange={setCharacter}
            onSkinChange={setSkin}
            onRarityChange={setRarity}
            onStarChange={setStar}
          />
          <label className="block text-sm text-zinc-400">
            Purchase price
            <input
              type="number"
              min={0}
              step={1}
              placeholder="Enter price"
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
              value={buyPriceInput}
              onChange={(event) => setBuyPriceInput(event.currentTarget.value)}
            />
          </label>
          <label className="block text-sm text-zinc-400">
            Planned sale price <span className="text-zinc-600">(optional)</span>
            <input
              type="number"
              min={0}
              step={1}
              placeholder="Enter price"
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
              value={plannedSellPriceInput}
              onChange={(event) => setPlannedSellPriceInput(event.currentTarget.value)}
            />
          </label>
          <button
            type="submit"
            disabled={submitting || !character || !skin || !rarity || buyPriceInput === ""}
            className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Record purchase"}
          </button>
          {message && <p className="text-sm text-green-400">{message}</p>}
          {error && <p className="text-sm text-red-400">{error}</p>}
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
  );
}
