"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { SkinImage } from "@/components/SkinImage";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { SkinSelectionFields } from "@/components/SkinSelectionFields";
import {
  getCharactersFromCatalog,
  getDefaultSkinForCharacter,
  getRaritiesForSkin,
  getSkinImagePath,
} from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import {
  emptyShopBoard,
  SHOP_GRID_SIZE,
  SHOP_SLOT_COUNT,
  type ShopBoard,
  type ShopListing,
} from "@/lib/shop";
import type { SkinCatalog } from "@/lib/types";

type ShopManagerProps = {
  catalog: SkinCatalog;
};

export function ShopManager({ catalog }: ShopManagerProps) {
  const [board, setBoard] = useState<ShopBoard>(() => emptyShopBoard());
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const listingCount = useMemo(
    () => board.filter((slot) => slot != null).length,
    [board]
  );

  const loadShop = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/shop", { credentials: "same-origin" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof body.error === "string" ? body.error : "Failed to load shop");
      }
      setBoard(body.slots as ShopBoard);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load shop");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadShop();
  }, [loadShop]);

  async function clearShop() {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/shop/clear", {
        method: "DELETE",
        credentials: "same-origin",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof body.error === "string" ? body.error : "Failed to clear shop");
      }
      setSelectedSlot(null);
      await loadShop();
      setMessage("Shop cleared.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear shop");
      throw err;
    } finally {
      setBusy(false);
    }
  }

  async function sellAll() {
    if (listingCount === 0) return;
    if (
      !window.confirm(
        `Mark all ${listingCount} listings as sold and log them in the sales log?`
      )
    ) {
      return;
    }

    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/shop/sold-all", {
        method: "POST",
        credentials: "same-origin",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof body.error === "string" ? body.error : "Failed to sell all");
      }
      setSelectedSlot(null);
      await loadShop();
      setMessage(`Marked ${body.sold ?? listingCount} listings as sold.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sell all");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-zinc-400">Loading shop…</p>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-400">
          {listingCount} of {SHOP_SLOT_COUNT} slots filled
        </p>
        <div className="flex flex-wrap gap-2">
          <ActionButton onClick={sellAll} disabled={busy || listingCount === 0} tone="primary">
            Mark all sold
          </ActionButton>
          <ConfirmDeleteButton
            label="Clear shop"
            pendingLabel="Clearing…"
            disabled={busy || listingCount === 0}
            onConfirm={clearShop}
            className="rounded-lg border border-red-900 bg-red-950/30 px-3 py-1.5 text-sm text-red-300 hover:bg-red-950/50 disabled:opacity-50"
            confirmingClassName="rounded-lg border border-red-600 bg-red-600/20 px-3 py-1.5 text-sm text-red-200 disabled:opacity-50"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {message && <p className="text-sm text-green-400">{message}</p>}

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          selectedSlot != null ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          {selectedSlot != null && (
            <div className="pb-6">
              <ShopSlotPanel
                catalog={catalog}
                slotIndex={selectedSlot}
                listing={board[selectedSlot]}
                busy={busy}
                onBusyChange={setBusy}
                onError={setError}
                onMessage={setMessage}
                onSaved={async () => {
                  await loadShop();
                }}
                onClosed={() => setSelectedSlot(null)}
              />
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto grid max-w-3xl grid-cols-5 gap-3">
        {board.map((slot, index) => {
          const imagePath =
            slot != null
              ? getSkinImagePath(catalog, slot.character, slot.skin, slot.rarity)
              : null;
          const selected = selectedSlot === index;

          return (
            <button
              key={index}
              type="button"
              disabled={busy}
              onClick={() => setSelectedSlot(selected ? null : index)}
              className={`group relative aspect-square overflow-hidden rounded-2xl border bg-zinc-900/60 transition ${
                selected
                  ? "border-blue-500 ring-2 ring-blue-500/40"
                  : "border-zinc-800 hover:border-zinc-600"
              }`}
            >
              {slot ? (
                <>
                  <div className="absolute inset-x-1 top-1 bottom-12">
                    <SkinImage
                      src={imagePath}
                      alt={`${slot.character} ${slot.skin}`}
                      variant="grid"
                    />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-2 pb-2 pt-6">
                    <p className="truncate text-[10px] font-medium text-zinc-200">
                      {slot.character}
                    </p>
                    <p className="truncate text-[10px] text-zinc-400">{slot.skin}</p>
                    <p className="text-xs font-semibold text-blue-300">
                      {formatPrice(slot.price)}
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex h-full items-center justify-center text-3xl font-light text-zinc-600 group-hover:text-zinc-400">
                  +
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

type ShopSlotPanelProps = {
  catalog: SkinCatalog;
  slotIndex: number;
  listing: ShopListing | null;
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
  onError: (message: string | null) => void;
  onMessage: (message: string | null) => void;
  onSaved: () => Promise<void>;
  onClosed: () => void;
};

function ShopSlotPanel({
  catalog,
  slotIndex,
  listing,
  busy,
  onBusyChange,
  onError,
  onMessage,
  onSaved,
  onClosed,
}: ShopSlotPanelProps) {
  const characters = getCharactersFromCatalog(catalog);
  const [character, setCharacter] = useState(listing?.character ?? characters[0] ?? "");
  const [skin, setSkin] = useState(
    listing?.skin ?? getDefaultSkinForCharacter(catalog, characters[0] ?? "")
  );
  const [rarity, setRarity] = useState(
    listing?.rarity ??
      getRaritiesForSkin(catalog, characters[0] ?? "", skin)[0] ??
      ""
  );
  const [star, setStar] = useState(listing?.star ?? 1);
  const [priceInput, setPriceInput] = useState(
    listing != null ? String(listing.price) : ""
  );
  const [salePriceInput, setSalePriceInput] = useState(
    listing != null ? String(listing.price) : ""
  );

  useEffect(() => {
    if (listing) {
      setCharacter(listing.character);
      setSkin(listing.skin);
      setRarity(listing.rarity);
      setStar(listing.star);
      setPriceInput(String(listing.price));
      setSalePriceInput(String(listing.price));
    } else {
      const initialCharacter = characters[0] ?? "";
      const initialSkin = getDefaultSkinForCharacter(catalog, initialCharacter);
      setCharacter(initialCharacter);
      setSkin(initialSkin);
      setRarity(getRaritiesForSkin(catalog, initialCharacter, initialSkin)[0] ?? "");
      setStar(1);
      setPriceInput("");
      setSalePriceInput("");
    }
  }, [listing, catalog, characters]);

  const imagePath =
    character && skin && rarity ? getSkinImagePath(catalog, character, skin, rarity) : null;

  async function saveListing(event: FormEvent) {
    event.preventDefault();
    const price = Number(priceInput);
    if (priceInput === "" || !Number.isInteger(price) || price < 0) {
      onError("Enter a valid listing price.");
      return;
    }

    onBusyChange(true);
    onError(null);
    onMessage(null);

    try {
      const res = await fetch(`/api/shop/${slotIndex}`, {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ character, skin, rarity, star, price }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof body.error === "string" ? body.error : "Failed to save listing");
      }
      await onSaved();
      onMessage(listing ? "Listing updated." : "Listing added to shop.");
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to save listing");
    } finally {
      onBusyChange(false);
    }
  }

  async function deleteListing() {
    onBusyChange(true);
    onError(null);
    onMessage(null);

    try {
      const res = await fetch(`/api/shop/${slotIndex}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof body.error === "string" ? body.error : "Failed to delete listing");
      }
      await onSaved();
      onClosed();
      onMessage("Listing removed.");
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to delete listing");
      throw err;
    } finally {
      onBusyChange(false);
    }
  }

  async function markSold() {
    const salePrice = Number(salePriceInput);
    if (salePriceInput === "" || !Number.isInteger(salePrice) || salePrice < 0) {
      onError("Enter a valid sale price.");
      return;
    }

    onBusyChange(true);
    onError(null);
    onMessage(null);

    try {
      const res = await fetch(`/api/shop/${slotIndex}/sold`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salePrice }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof body.error === "string" ? body.error : "Failed to mark as sold");
      }
      await onSaved();
      onClosed();
      onMessage("Sold and logged to the sales log.");
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to mark as sold");
    } finally {
      onBusyChange(false);
    }
  }

  const row = Math.floor(slotIndex / SHOP_GRID_SIZE) + 1;
  const col = (slotIndex % SHOP_GRID_SIZE) + 1;

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">
            {listing ? "Edit listing" : "Add listing"} · Slot {row}-{col}
          </h2>
          <p className="text-sm text-zinc-400">
            {listing
              ? "Update details, mark as sold, or remove this listing."
              : "Choose a skin and listing price for this shop slot."}
          </p>
        </div>
        <button
          type="button"
          onClick={onClosed}
          className="text-sm text-zinc-400 hover:text-zinc-200"
        >
          Close
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <div className="flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
          <SkinImage
            src={imagePath}
            alt={character && skin ? `${character} ${skin}` : "Skin preview"}
            variant="preview"
          />
        </div>

        <div className="space-y-6">
          <form onSubmit={saveListing} className="space-y-4">
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
              Listing price
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
            <button
              type="submit"
              disabled={busy || priceInput === ""}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {listing ? "Save changes" : "Add to shop"}
            </button>
          </form>

          {listing && (
            <div className="border-t border-zinc-800 pt-6">
              <h3 className="mb-3 text-sm font-semibold text-zinc-200">Mark as sold</h3>
              <p className="mb-3 text-sm text-zinc-400">
                Records a sale in the sales log and clears this slot.
              </p>
              <label className="mb-3 block text-sm text-zinc-400">
                Sale price
                <input
                  type="number"
                  min={0}
                  step={1}
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
                  value={salePriceInput}
                  onChange={(event) => setSalePriceInput(event.currentTarget.value)}
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <ActionButton onClick={markSold} disabled={busy || salePriceInput === ""} tone="primary">
                  Mark sold
                </ActionButton>
                <ConfirmDeleteButton
                  label="Delete listing"
                  disabled={busy}
                  onConfirm={deleteListing}
                  className="rounded-lg border border-red-900 bg-red-950/30 px-3 py-1.5 text-sm text-red-300 hover:bg-red-950/50 disabled:opacity-50"
                  confirmingClassName="rounded-lg border border-red-600 bg-red-600/20 px-3 py-1.5 text-sm text-red-200 disabled:opacity-50"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ActionButton({
  children,
  onClick,
  disabled,
  tone,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone: "primary" | "danger";
}) {
  const classes =
    tone === "primary"
      ? "border-blue-700 bg-blue-600/10 text-blue-300 hover:bg-blue-600/20"
      : "border-red-900 bg-red-950/30 text-red-300 hover:bg-red-950/50";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50 ${classes}`}
    >
      {children}
    </button>
  );
}
