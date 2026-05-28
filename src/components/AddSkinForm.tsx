"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import { SkinImage } from "@/components/SkinImage";

import { SKIN_RARITIES } from "@/lib/rarities";

type CatalogMeta = {
  characters: string[];
  rarities: readonly string[];
};

export function AddSkinForm() {
  const [meta, setMeta] = useState<CatalogMeta | null>(null);
  const [character, setCharacter] = useState("");
  const [name, setName] = useState("");
  const [rarity, setRarity] = useState<string>(SKIN_RARITIES[0]);
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/catalog/skins")
      .then((res) => res.json())
      .then((data: CatalogMeta) => {
        setMeta(data);
        if (data.characters.length > 0) {
          setCharacter(data.characters[0]);
        }
      })
      .catch(() => setError("Failed to load characters"));
  }, []);

  useEffect(() => {
    if (!image) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(image);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!character || !name.trim() || !rarity) return;

    setSubmitting(true);
    setMessage(null);
    setError(null);

    const formData = new FormData();
    formData.append("character", character);
    formData.append("name", name.trim());
    formData.append("rarity", rarity);
    if (image) {
      formData.append("image", image);
    }

    try {
      const addedName = name.trim();
      const res = await fetch("/api/catalog/skins", {
        method: "POST",
        body: formData,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error ?? "Failed to add skin");
      }

      setName("");
      setImage(null);
      setMessage(`Added ${character} — ${addedName} (${rarity}).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add skin");
    } finally {
      setSubmitting(false);
    }
  }

  if (!meta) {
    return <p className="text-sm text-zinc-400">Loading…</p>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={handleSubmit} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Add a skin</h2>
          <Link href="/add" className="text-sm text-zinc-400 hover:text-zinc-200">
            Back
          </Link>
        </div>
        <div className="space-y-4">
          <label className="block text-sm text-zinc-400">
            Character
            <select
              className="select-field mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
              value={character}
              onChange={(event) => setCharacter(event.currentTarget.value)}
            >
              {meta.characters.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm text-zinc-400">
            Skin name
            <input
              type="text"
              required
              placeholder="e.g. Birthday"
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
              value={name}
              onChange={(event) => setName(event.currentTarget.value)}
            />
          </label>

          <label className="block text-sm text-zinc-400">
            Rarity
            <select
              className="select-field mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
              value={rarity}
              onChange={(event) => setRarity(event.currentTarget.value)}
            >
              {meta.rarities.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm text-zinc-400">
            Skin image <span className="text-zinc-600">(optional)</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="mt-1 block w-full text-sm text-zinc-300 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-800 file:px-3 file:py-2 file:text-zinc-100"
              onChange={(event) => setImage(event.target.files?.[0] ?? null)}
            />
          </label>

          <button
            type="submit"
            disabled={submitting || !character || !name.trim()}
            className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {submitting ? "Adding…" : "Add skin"}
          </button>

          {message && <p className="text-sm text-green-400">{message}</p>}
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
      </form>

      <div className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
        <h2 className="mb-4 self-start text-lg font-semibold">Preview</h2>
        {previewUrl ? (
          <SkinImage src={previewUrl} alt="Skin preview" variant="preview" />
        ) : (
          <SkinImage src={null} alt="No skin image" variant="preview" />
        )}
      </div>
    </div>
  );
}
