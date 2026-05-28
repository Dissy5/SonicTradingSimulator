"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { SkinImage } from "@/components/SkinImage";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { getSkinImagePath } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { flipProfit, isFlipOpen, type Flip, type SkinCatalog } from "@/lib/types";

type CompleteFlipFormProps = {
  flip: Flip;
  catalog: SkinCatalog;
};

export function CompleteFlipForm({ flip, catalog }: CompleteFlipFormProps) {
  const router = useRouter();
  const [sellPriceInput, setSellPriceInput] = useState(() =>
    flip.plannedSellPrice != null ? String(flip.plannedSellPrice) : ""
  );
  const [submitting, setSubmitting] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const imagePath = getSkinImagePath(catalog, flip.character, flip.skin, flip.rarity);
  const open = isFlipOpen(flip);
  const profit = flipProfit(flip);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const sellPrice = Number(sellPriceInput);
    if (sellPriceInput === "" || !Number.isInteger(sellPrice) || sellPrice < 0) {
      setError("Enter a valid sale price.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/flips/${flip.id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sellPrice }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof body.error === "string" ? body.error : "Failed to record sale");
      }

      router.refresh();
      router.push("/flips");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record sale");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    setError(null);

    const res = await fetch(`/api/flips/${flip.id}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(typeof body.error === "string" ? body.error : "Failed to delete flip");
    }

    router.refresh();
    router.push("/flips");
  }

  return (
    <div className="space-y-6">
      <Link href="/flips" className="text-sm text-zinc-400 hover:text-zinc-200">
        ← Back to flips
      </Link>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
          <h1 className="mb-4 text-lg font-semibold">
            {flip.character} · {flip.skin}
          </h1>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-400">Rarity</dt>
              <dd>{flip.rarity}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-400">Star</dt>
              <dd>{flip.star}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-400">Purchase price</dt>
              <dd>{formatPrice(flip.buyPrice)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-400">Purchased</dt>
              <dd>{new Date(flip.boughtAt).toLocaleString()}</dd>
            </div>
            {open && flip.plannedSellPrice != null && (
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-400">Planned sale price</dt>
                <dd>{formatPrice(flip.plannedSellPrice)}</dd>
              </div>
            )}
            {!open && (
              <>
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-400">Sale price</dt>
                  <dd>{formatPrice(flip.sellPrice ?? 0)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-400">Sold</dt>
                  <dd>{flip.soldAt ? new Date(flip.soldAt).toLocaleString() : "—"}</dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-zinc-800 pt-3">
                  <dt className="text-zinc-400">Profit</dt>
                  <dd
                    className={
                      profit != null && profit >= 0 ? "text-green-400" : "text-red-400"
                    }
                  >
                    {profit == null
                      ? "—"
                      : `${profit >= 0 ? "+" : ""}${formatPrice(profit)}`}
                  </dd>
                </div>
              </>
            )}
          </dl>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex min-h-60 flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
            <SkinImage src={imagePath} alt={`${flip.character} ${flip.skin}`} variant="preview" />
          </div>

          {open ? (
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6"
            >
              <h2 className="mb-4 text-lg font-semibold">Record sale</h2>
              <p className="mb-4 text-sm text-zinc-400">
                Enter the price you sold this skin for to close out the flip. This will also
                add an entry to the sales log.
              </p>
              <label className="block text-sm text-zinc-400">
                Sale price
                <input
                  type="number"
                  min={0}
                  step={1}
                  placeholder="Enter price"
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
                  value={sellPriceInput}
                  onChange={(event) => setSellPriceInput(event.currentTarget.value)}
                />
              </label>
              <button
                type="submit"
                disabled={submitting || deletePending || sellPriceInput === ""}
                className="mt-4 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {submitting ? "Saving…" : "Complete flip"}
              </button>
              <ConfirmDeleteButton
                label="Delete flip"
                onConfirm={async () => {
                  try {
                    await handleDelete();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Failed to delete flip");
                    throw err;
                  }
                }}
                onPendingChange={setDeletePending}
                className="mt-3 rounded-lg border border-red-800/80 px-4 py-2 text-sm text-red-300 hover:bg-red-950/40 disabled:opacity-50"
                confirmingClassName="mt-3 rounded-lg border border-red-600 bg-red-600/20 px-4 py-2 text-sm text-red-200 disabled:opacity-50"
              />
              {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
            </form>
          ) : (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 text-sm text-zinc-400">
              This flip is closed.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
