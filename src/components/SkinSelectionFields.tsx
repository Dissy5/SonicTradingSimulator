"use client";

import { useEffect } from "react";

import {
  getDefaultSkinForCharacter,
  getRaritiesForSkin,
  getSkinsForCharacter,
} from "@/lib/catalog";
import type { SkinCatalog } from "@/lib/types";

type SkinSelectionFieldsProps = {
  catalog: SkinCatalog;
  character: string;
  skin: string;
  rarity: string;
  star: number;
  onCharacterChange: (value: string) => void;
  onSkinChange: (value: string) => void;
  onRarityChange: (value: string) => void;
  onStarChange: (value: number) => void;
};

export function SkinSelectionFields({
  catalog,
  character,
  skin,
  rarity,
  star,
  onCharacterChange,
  onSkinChange,
  onRarityChange,
  onStarChange,
}: SkinSelectionFieldsProps) {
  const characters = Object.keys(catalog).sort();
  const skinOptions = getSkinsForCharacter(catalog, character);
  const rarityOptions = getRaritiesForSkin(catalog, character, skin);

  useEffect(() => {
    onSkinChange(getDefaultSkinForCharacter(catalog, character));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset skin when character changes
  }, [catalog, character]);

  useEffect(() => {
    onRarityChange(getRaritiesForSkin(catalog, character, skin)[0] ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset rarity when skin changes
  }, [catalog, character, skin]);

  return (
    <>
      <label className="block text-sm text-zinc-400">
        Character
        <select
          className="select-field mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
          value={character}
          onChange={(event) => onCharacterChange(event.currentTarget.value)}
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
          onChange={(event) => onSkinChange(event.currentTarget.value)}
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
          onChange={(event) => onRarityChange(event.currentTarget.value)}
          disabled={rarityOptions.length <= 1}
        >
          {rarityOptions.map((name) => (
            <option key={`${character}-${skin}-${name}`} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm text-zinc-400">
        Star level
        <input
          type="number"
          min={1}
          max={6}
          className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
          value={star}
          onChange={(event) => onStarChange(Number(event.currentTarget.value))}
        />
      </label>
    </>
  );
}
