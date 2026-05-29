"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

import { SkinImage } from "@/components/SkinImage";
import {
  getCharactersFromCatalog,
  getDefaultSkinForCharacter,
  getRaritiesForSkin,
  getSkinImagePath,
  getSkinsForCharacter,
} from "@/lib/catalog";
import type { SkinCatalog } from "@/lib/types";
import type { ValuedSkin } from "@/lib/values-server";

type ManualValuesPanelProps = {
  catalog: SkinCatalog;
  onValuesChanged: () => void;
};

async function postManualValue(body: {
  character: string;
  skin: string;
  rarity: string;
  star: number;
  price: number;
}) {
  const res = await fetch("/api/admin/manual-values", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? "Failed to record manual value");
  }
}

export function ManualValuesPanel({ catalog, onValuesChanged }: ManualValuesPanelProps) {
  return (
    <div className="space-y-8">
      <p className="text-sm text-zinc-400">
        Manual values affect the community values sheet only. They are not shown in transaction
        history or user dashboards.
      </p>
      <ManualValueForm catalog={catalog} onValuesChanged={onValuesChanged} />
      <UnassignedSkinWizard onValuesChanged={onValuesChanged} />
    </div>
  );
}

function ManualValueForm({
  catalog,
  onValuesChanged,
}: {
  catalog: SkinCatalog;
  onValuesChanged: () => void;
}) {
  const characters = getCharactersFromCatalog(catalog);
  const [character, setCharacter] = useState(characters[0] ?? "");
  const [skin, setSkin] = useState("");
  const [rarity, setRarity] = useState("");
  const [star, setStar] = useState(1);
  const [priceInput, setPriceInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const skinOptions = getSkinsForCharacter(catalog, character);
  const rarityOptions = getRaritiesForSkin(catalog, character, skin);
  const imagePath =
    character && skin && rarity
      ? getSkinImagePath(catalog, character, skin, rarity)
      : null;

  useEffect(() => {
    setSkin(getDefaultSkinForCharacter(catalog, character));
  }, [catalog, character]);

  useEffect(() => {
    const options = getRaritiesForSkin(catalog, character, skin);
    setRarity(options[0] ?? "");
  }, [catalog, character, skin]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const price = Number(priceInput);
    if (priceInput === "" || !Number.isInteger(price) || price < 0) {
      setError("Enter a valid price.");
      setMessage(null);
      return;
    }

    setSubmitting(true);
    setMessage(null);
    setError(null);
    try {
      await postManualValue({ character, skin, rarity, star, price });
      setPriceInput("");
      setMessage(`Manual value recorded for ${character} · ${skin} (${rarity}).`);
      onValuesChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record manual value");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-amber-900/50 bg-amber-950/10 p-6"
      >
        <h2 className="mb-4 text-lg font-semibold text-amber-100">Record manual value</h2>
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
              Value
              <input
                type="number"
                min={0}
                step={1}
                placeholder="Enter value"
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
                value={priceInput}
                onChange={(event) => setPriceInput(event.currentTarget.value)}
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={submitting || !character || !skin || !rarity || priceInput === ""}
            className="rounded-lg bg-amber-700 px-4 py-2 font-medium text-white hover:bg-amber-600 disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Record manual value"}
          </button>
          {message ? <p className="text-sm text-green-400">{message}</p> : null}
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
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
    </section>
  );
}

function UnassignedSkinWizard({ onValuesChanged }: { onValuesChanged: () => void }) {
  const [skins, setSkins] = useState<ValuedSkin[]>([]);
  const [index, setIndex] = useState(0);
  const [priceInput, setPriceInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadSkins = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/manual-values", { credentials: "same-origin" });
      const data = (await res.json()) as { skins?: ValuedSkin[]; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to load skins");
      }
      setSkins(data.skins ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load skins");
      setSkins([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSkins();
  }, [loadSkins]);

  const current = skins[index] ?? null;

  useEffect(() => {
    setPriceInput("");
    setMessage(null);
  }, [index, current?.character, current?.skin, current?.rarity]);

  function goPrevious() {
    if (skins.length === 0) return;
    setIndex((value) => (value - 1 + skins.length) % skins.length);
  }

  function goNext() {
    if (skins.length === 0) return;
    setIndex((value) => (value + 1) % skins.length);
  }

  async function handleConfirm() {
    if (!current) return;
    const price = Number(priceInput);
    if (priceInput === "" || !Number.isInteger(price) || price < 0) {
      setError("Enter a valid value.");
      setMessage(null);
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      await postManualValue({
        character: current.character,
        skin: current.skin,
        rarity: current.rarity,
        star: 1,
        price,
      });

      const nextSkins = skins.filter(
        (entry) =>
          !(
            entry.character === current.character &&
            entry.skin === current.skin &&
            entry.rarity === current.rarity
          )
      );
      setSkins(nextSkins);
      setIndex((value) => {
        if (nextSkins.length === 0) return 0;
        return Math.min(value, nextSkins.length - 1);
      });
      setPriceInput("");
      setMessage(`Value recorded for ${current.character} · ${current.skin} (${current.rarity}).`);
      onValuesChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record value");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Skins without values</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Assign a manual value to catalog skins that have no sale history yet.
          </p>
        </div>
        {!loading && skins.length > 0 ? (
          <p className="text-sm tabular-nums text-zinc-500">
            {index + 1} of {skins.length}
          </p>
        ) : null}
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-zinc-400">Loading skins…</p>
      ) : error && skins.length === 0 ? (
        <p className="mt-6 text-sm text-red-400">{error}</p>
      ) : skins.length === 0 ? (
        <p className="mt-6 text-sm text-green-400">
          Every catalog skin has sale or manual value data.
        </p>
      ) : current ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/60 p-6">
            <SkinImage
              src={current.imagePath}
              alt={`${current.character} ${current.skin}`}
              variant="preview"
            />
            <p className="mt-4 text-center text-zinc-200">
              {current.character} · {current.skin}
            </p>
            <p className="text-sm text-zinc-500">{current.rarity}</p>
          </div>

          <div className="space-y-4">
            <label className="block text-sm text-zinc-400">
              Value
              <input
                type="number"
                min={0}
                step={1}
                placeholder="Enter value"
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
                value={priceInput}
                onChange={(event) => setPriceInput(event.currentTarget.value)}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={goPrevious}
                disabled={submitting || skins.length < 2}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-900 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={goNext}
                disabled={submitting || skins.length < 2}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-900 disabled:opacity-50"
              >
                Next
              </button>
              <button
                type="button"
                onClick={() => void handleConfirm()}
                disabled={submitting || priceInput === ""}
                className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
              >
                {submitting ? "Saving…" : "Confirm value"}
              </button>
            </div>
            {message ? <p className="text-sm text-green-400">{message}</p> : null}
            {error ? <p className="text-sm text-red-400">{error}</p> : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
