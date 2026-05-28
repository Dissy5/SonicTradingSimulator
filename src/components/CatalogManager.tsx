"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

import { SKIN_RARITIES } from "@/lib/rarities";

type CatalogCharacter = {
  id: number;
  name: string;
};

type CatalogSkin = {
  id: number;
  character: string;
  name: string;
  rarity: string;
  image_path: string;
};

type ManageData = {
  characters: CatalogCharacter[];
  skins: CatalogSkin[];
  rarities: readonly string[];
  readOnly?: boolean;
};

export function CatalogManager() {
  const [data, setData] = useState<ManageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [skinFilter, setSkinFilter] = useState("");

  const [editingCharacterId, setEditingCharacterId] = useState<number | null>(null);
  const [characterDraft, setCharacterDraft] = useState("");

  const [editingSkinId, setEditingSkinId] = useState<number | null>(null);
  const [skinDraft, setSkinDraft] = useState<{
    character: string;
    name: string;
    rarity: string;
  }>({
    character: "",
    name: "",
    rarity: SKIN_RARITIES[0],
  });
  const [skinImage, setSkinImage] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/catalog/manage");
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error ?? "Failed to load catalog");
      }
      setData(body as ManageData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load catalog");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function startEditCharacter(character: CatalogCharacter) {
    setEditingCharacterId(character.id);
    setCharacterDraft(character.name);
  }

  async function saveCharacter(id: number) {
    const name = characterDraft.trim();
    if (!name) return;

    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/catalog/characters/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error ?? "Failed to update character");
      }
      setEditingCharacterId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update character");
    } finally {
      setBusy(false);
    }
  }

  async function deleteCharacter(id: number, name: string) {
    if (!window.confirm(`Delete "${name}" and all of their skins?`)) return;

    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/catalog/characters/${id}`, { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error ?? "Failed to delete character");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete character");
    } finally {
      setBusy(false);
    }
  }

  function startEditSkin(skin: CatalogSkin) {
    setEditingSkinId(skin.id);
    setSkinDraft({
      character: skin.character,
      name: skin.name,
      rarity: skin.rarity,
    });
    setSkinImage(null);
  }

  async function saveSkin(id: number) {
    const character = skinDraft.character.trim();
    const name = skinDraft.name.trim();
    const rarity = skinDraft.rarity.trim();
    if (!character || !name || !rarity) return;

    setBusy(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("character", character);
      formData.append("name", name);
      formData.append("rarity", rarity);
      if (skinImage) {
        formData.append("image", skinImage);
      }

      const res = await fetch(`/api/catalog/skins/${id}`, {
        method: "PATCH",
        body: formData,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error ?? "Failed to update skin");
      }
      setEditingSkinId(null);
      setSkinImage(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update skin");
    } finally {
      setBusy(false);
    }
  }

  async function deleteSkin(id: number, label: string) {
    if (!window.confirm(`Delete skin "${label}"?`)) return;

    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/catalog/skins/${id}`, { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error ?? "Failed to delete skin");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete skin");
    } finally {
      setBusy(false);
    }
  }

  if (!data) {
    return <p className="text-sm text-zinc-400">Loading catalog…</p>;
  }

  const filteredSkins =
    skinFilter === ""
      ? data.skins
      : data.skins.filter((skin) => skin.character === skinFilter);

  return (
    <div className="space-y-8">
      {data.readOnly && (
        <p className="text-sm text-amber-400">
          Supabase is not configured — catalog is read-only from local data.
        </p>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}

      <section>
        <h2 className="mb-3 text-lg font-semibold">Characters</h2>
        <div className="overflow-x-auto rounded-2xl border border-zinc-800">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-900 text-zinc-400">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Skins</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {data.characters.map((character) => {
                const skinCount = data.skins.filter((skin) => skin.character === character.name).length;
                const editing = editingCharacterId === character.id;

                return (
                  <tr key={character.id} className="border-t border-zinc-800">
                    <td className="px-4 py-3">
                      {editing ? (
                        <input
                          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-zinc-100"
                          value={characterDraft}
                          onChange={(event) => setCharacterDraft(event.currentTarget.value)}
                        />
                      ) : (
                        character.name
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{skinCount}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {editing ? (
                          <>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => saveCharacter(character.id)}
                              className="rounded-md bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-500 disabled:opacity-50"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => setEditingCharacterId(null)}
                              className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              disabled={busy || data.readOnly}
                              onClick={() => startEditCharacter(character)}
                              className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              disabled={busy || data.readOnly}
                              onClick={() => deleteCharacter(character.id, character.name)}
                              className="rounded-md border border-red-900 px-2 py-1 text-xs text-red-300 hover:bg-red-950"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold">Skins</h2>
          <label className="text-sm text-zinc-400">
            Filter by character
            <select
              className="ml-2 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-zinc-100"
              value={skinFilter}
              onChange={(event) => setSkinFilter(event.currentTarget.value)}
            >
              <option value="">All</option>
              {data.characters.map((character) => (
                <option key={character.id} value={character.name}>
                  {character.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-zinc-800">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-900 text-zinc-400">
              <tr>
                <th className="w-14 px-3 py-3 font-medium"></th>
                <th className="px-4 py-3 font-medium">Character</th>
                <th className="px-4 py-3 font-medium">Skin</th>
                <th className="px-4 py-3 font-medium">Rarity</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filteredSkins.map((skin) => {
                const editing = editingSkinId === skin.id;

                return (
                  <tr key={skin.id} className="border-t border-zinc-800">
                    <td className="px-3 py-2">
                      <Image
                        src={skin.image_path}
                        alt={`${skin.character} ${skin.name}`}
                        width={40}
                        height={40}
                        className="h-10 w-10 rounded-md bg-black object-contain"
                        unoptimized
                      />
                    </td>
                    <td className="px-4 py-3">
                      {editing ? (
                        <select
                          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-zinc-100"
                          value={skinDraft.character}
                          onChange={(event) =>
                            setSkinDraft((draft) => ({
                              ...draft,
                              character: event.currentTarget.value,
                            }))
                          }
                        >
                          {data.characters.map((character) => (
                            <option key={character.id} value={character.name}>
                              {character.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        skin.character
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editing ? (
                        <input
                          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-zinc-100"
                          value={skinDraft.name}
                          onChange={(event) =>
                            setSkinDraft((draft) => ({ ...draft, name: event.currentTarget.value }))
                          }
                        />
                      ) : (
                        skin.name
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editing ? (
                        <select
                          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-zinc-100"
                          value={skinDraft.rarity}
                          onChange={(event) =>
                            setSkinDraft((draft) => ({ ...draft, rarity: event.currentTarget.value }))
                          }
                        >
                          {data.rarities.map((rarity) => (
                            <option key={rarity} value={rarity}>
                              {rarity}
                            </option>
                          ))}
                        </select>
                      ) : (
                        skin.rarity
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-end gap-2">
                        {editing && (
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/gif"
                            className="max-w-40 text-xs text-zinc-400"
                            onChange={(event) => setSkinImage(event.target.files?.[0] ?? null)}
                          />
                        )}
                        <div className="flex gap-2">
                          {editing ? (
                            <>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => saveSkin(skin.id)}
                                className="rounded-md bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-500 disabled:opacity-50"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => {
                                  setEditingSkinId(null);
                                  setSkinImage(null);
                                }}
                                className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                disabled={busy || data.readOnly}
                                onClick={() => startEditSkin(skin)}
                                className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                disabled={busy || data.readOnly}
                                onClick={() =>
                                  deleteSkin(skin.id, `${skin.character} — ${skin.name} (${skin.rarity})`)
                                }
                                className="rounded-md border border-red-900 px-2 py-1 text-xs text-red-300 hover:bg-red-950"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredSkins.length === 0 && (
          <p className="mt-3 text-sm text-zinc-500">No skins match this filter.</p>
        )}
      </section>
    </div>
  );
}
